import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchOpenIssues, fetchRepoLanguage, extractLabels, discoverPopularRepos } from "@/lib/github";
import { buildEmbeddingText } from "@/lib/cleanText";
import { embedTexts } from "@/lib/gemini";
import { computeDifficulty } from "@/lib/difficulty";
import { REPOS, repoFullName } from "@/config/repos";
import crypto from "crypto";

/** Verify ingest authorization. */
function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Manual runs use x-ingest-secret header
  const ingestSecret = req.headers.get("x-ingest-secret");
  if (ingestSecret === process.env.INGEST_SECRET) return true;

  return false;
}

/** SHA-256 hash of the embedding text, used to skip unchanged issues. */
function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

interface IngestStats {
  repos: number;
  added: number;
  updated: number;
  closed: number;
  skipped: number;
  errors: string[];
}

export async function GET(req: NextRequest) {
  return handleIngest(req);
}

export async function POST(req: NextRequest) {
  return handleIngest(req);
}

async function handleIngest(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const stats: IngestStats = {
    repos: 0,
    added: 0,
    updated: 0,
    closed: 0,
    skipped: 0,
    errors: [],
  };

  // Determine which repos to process
  const repoParam = req.nextUrl.searchParams.get("repo");
  const discoverParam = req.nextUrl.searchParams.get("discover");
  const langParam = req.nextUrl.searchParams.get("language");
  let reposToProcess: { owner: string; name: string }[];

  if (repoParam) {
    // 1. Process a specific repo
    const [owner, name] = repoParam.split("/");
    if (!owner || !name) {
      return NextResponse.json(
        { error: "Invalid repo format. Use owner/name" },
        { status: 400 }
      );
    }
    reposToProcess = [{ owner, name }];
  } else if (discoverParam === "true" || discoverParam === "1") {
    // 2. Discover popular repos dynamically from GitHub Search API
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "3", 10), 10);
    const discovered = await discoverPopularRepos(langParam ?? undefined, 1000, limit);
    if (discovered.length === 0) {
      return NextResponse.json({
        ...stats,
        message: "No repositories discovered from GitHub matching criteria",
      });
    }
    reposToProcess = discovered.map((d) => ({ owner: d.owner, name: d.name }));
  } else {
    // 3. Process up to 3 repos from seed config
    const offset = parseInt(
      req.nextUrl.searchParams.get("offset") ?? "0",
      10
    );
    reposToProcess = REPOS.slice(offset, offset + 3);
  }

  for (const repo of reposToProcess) {
    const fullName = repoFullName(repo);

    try {
      console.log(`[ingest] Processing ${fullName}...`);

      // 1. Fetch repo language
      const language = await fetchRepoLanguage(fullName);

      // 2. Fetch open issues
      const ghIssues = await fetchOpenIssues(fullName);
      console.log(
        `[ingest] ${fullName}: fetched ${ghIssues.length} open issues`
      );

      // 3. Load existing content hashes for this repo
      const { data: existingRows } = await supabase
        .from("issues")
        .select("url, content_hash")
        .eq("repo_name", fullName)
        .eq("state", "open");

      const existingHashes = new Map<string, string>();
      for (const row of existingRows ?? []) {
        existingHashes.set(
          row.url as string,
          (row.content_hash as string) ?? ""
        );
      }

      // 4. Compute hashes and find new/changed issues
      interface IssueToEmbed {
        github_id: number;
        title: string;
        description: string | null;
        repo_name: string;
        url: string;
        language: string | null;
        labels: string[];
        state: string;
        comments_count: number;
        difficulty: number;
        content_hash: string;
        embedding_text: string;
        github_created_at: string;
        github_updated_at: string;
      }

      const toEmbed: IssueToEmbed[] = [];
      const allOpenUrls = new Set<string>();

      for (const issue of ghIssues) {
        const labels = extractLabels(issue.labels);
        const embeddingText = buildEmbeddingText(
          fullName,
          language,
          labels,
          issue.title,
          issue.body
        );
        const hash = contentHash(embeddingText);
        allOpenUrls.add(issue.html_url);

        // Skip if content unchanged
        if (existingHashes.get(issue.html_url) === hash) {
          stats.skipped++;
          continue;
        }

        const ageInDays = Math.floor(
          (Date.now() - new Date(issue.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        toEmbed.push({
          github_id: issue.id,
          title: issue.title,
          description: issue.body,
          repo_name: fullName,
          url: issue.html_url,
          language,
          labels,
          state: "open",
          comments_count: issue.comments,
          difficulty: computeDifficulty(
            labels,
            (issue.body ?? "").length,
            issue.comments,
            ageInDays
          ),
          content_hash: hash,
          embedding_text: embeddingText,
          github_created_at: issue.created_at,
          github_updated_at: issue.updated_at,
        });

        // Cap to 50 issues per repo run to stay safely within Gemini free tier quotas
        if (toEmbed.length >= 50) break;
      }

      // 5. Embed in batches
      if (toEmbed.length > 0) {
        const texts = toEmbed.map((i) => i.embedding_text);
        const embeddings = await embedTexts(texts, "RETRIEVAL_DOCUMENT");

        // 6. Upsert into Supabase
        for (let i = 0; i < toEmbed.length; i++) {
          const issue = toEmbed[i];
          const isNew = !existingHashes.has(issue.url);

          const { error } = await supabase.from("issues").upsert(
            {
              github_id: issue.github_id,
              title: issue.title,
              description: issue.description,
              repo_name: issue.repo_name,
              url: issue.url,
              language: issue.language,
              labels: issue.labels,
              state: issue.state,
              comments_count: issue.comments_count,
              difficulty: issue.difficulty,
              content_hash: issue.content_hash,
              embedding: JSON.stringify(embeddings[i]),
              github_created_at: issue.github_created_at,
              github_updated_at: issue.github_updated_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "url" }
          );

          if (error) {
            console.error(`[ingest] Upsert error for ${issue.url}:`, error);
            stats.errors.push(`Upsert ${issue.url}: ${error.message}`);
          } else {
            if (isNew) stats.added++;
            else stats.updated++;
          }
        }
      }

      // 7. Mark issues no longer open as closed
      const existingUrls = Array.from(existingHashes.keys());
      const closedUrls = existingUrls.filter((u) => !allOpenUrls.has(u));

      if (closedUrls.length > 0) {
        const { error } = await supabase
          .from("issues")
          .update({ state: "closed", updated_at: new Date().toISOString() })
          .in("url", closedUrls);

        if (error) {
          console.error(`[ingest] Close error for ${fullName}:`, error);
          stats.errors.push(`Close ${fullName}: ${error.message}`);
        } else {
          stats.closed += closedUrls.length;
        }
      }

      stats.repos++;
      console.log(
        `[ingest] ${fullName} done: ${toEmbed.length} embedded, ${stats.skipped} skipped, ${closedUrls.length} closed`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ingest] Error processing ${fullName}:`, message);
      stats.errors.push(`${fullName}: ${message}`);
      // Continue to next repo — one failure doesn't stop others
    }
  }

  return NextResponse.json(stats);
}
