"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { embedTexts } from "@/lib/gemini";
import type { SearchResult, SearchFilters, Difficulty } from "@/lib/types";

/**
 * Fetch the most recently updated open issues (no embedding call).
 * Used for the initial homepage view and empty-query searches.
 */
export async function getRecentIssues(
  limit: number = 20,
  language?: string | null
): Promise<{ results: SearchResult[]; tookMs: number }> {
  const start = Date.now();
  const supabase = createServiceClient();

  let query = supabase
    .from("issues")
    .select(
      "id, title, description, repo_name, url, language, labels, difficulty"
    )
    .eq("state", "open")
    .order("github_updated_at", { ascending: false })
    .limit(Math.min(limit, 50));

  if (language) {
    query = query.eq("language", language);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getRecentIssues error:", error.message);
    return { results: [], tookMs: Date.now() - start };
  }

  const results: SearchResult[] = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    repoName: row.repo_name as string,
    url: row.url as string,
    language: (row.language as string | null) ?? null,
    labels: (row.labels as string[]) ?? [],
    difficulty: (row.difficulty as Difficulty) ?? 3,
    similarity: 0,
    snippet: ((row.description as string) ?? "").slice(0, 200),
  }));

  return { results, tookMs: Date.now() - start };
}

import { headers } from "next/headers";

// Simple in-memory Map for rate limiting (per-instance, resets on cold start)
// Allows 15 semantic searches per minute per IP.
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  // Clean up old entries occasionally to prevent memory leaks in long-running instances
  if (rateLimits.size > 1000) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetAt) rateLimits.delete(key);
    }
  }

  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 }); // 60 seconds
    return true;
  }
  if (limit.count >= 15) {
    return false;
  }
  limit.count++;
  return true;
}

/**
 * Semantic search: embed the query, call match_issues RPC, return results.
 * Per PRD Section 14.4. Includes basic rate limiting.
 */
export async function searchIssues(
  query: string,
  filters: SearchFilters = {}
): Promise<{ results: SearchResult[]; tookMs: number }> {
  // Rate limiting check
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "unknown";
  
  if (!checkRateLimit(ip)) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }


  const start = Date.now();

  // 1. Trim and validate
  const trimmed = query.trim();
  if (trimmed.length > 500) {
    return { results: [], tookMs: Date.now() - start };
  }

  // 2. If query is empty, return recent issues
  if (!trimmed) {
    return getRecentIssues(filters.limit ?? 20, filters.language);
  }

  // 3. Embed the query
  const [vec] = await embedTexts([trimmed], "RETRIEVAL_QUERY");

  // 4. Call the match_issues RPC
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("match_issues", {
    query_embedding: JSON.stringify(vec),
    match_count: Math.min(filters.limit ?? 20, 50),
    filter_language: filters.language ?? null,
    max_difficulty: filters.maxDifficulty ?? null,
    min_similarity: 0.3,
  });

  if (error) {
    console.error("searchIssues RPC error:", error.message);
    return { results: [], tookMs: Date.now() - start };
  }

  // 5. Map rows to SearchResult
  const results: SearchResult[] = (
    data as Array<{
      id: string;
      title: string;
      description: string | null;
      repo_name: string;
      url: string;
      language: string | null;
      labels: string[];
      difficulty: number;
      similarity: number;
    }>
  ).map((row) => ({
    id: row.id,
    title: row.title,
    repoName: row.repo_name,
    url: row.url,
    language: row.language,
    labels: row.labels ?? [],
    difficulty: (row.difficulty as Difficulty) ?? 3,
    similarity: row.similarity,
    snippet: (row.description ?? "").slice(0, 200),
  }));

  return { results, tookMs: Date.now() - start };
}
