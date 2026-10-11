/** Raw issue shape from the GitHub REST API. */
export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  labels: Array<{ name: string } | string>;
  state: string;
  comments: number;
  assignee: { login: string } | null;
  pull_request?: { url: string };
  created_at: string;
  updated_at: string;
}

interface GithubRepo {
  language: string | null;
}

const GITHUB_API = "https://api.github.com";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Fetch the primary language for a repo.
 */
export async function fetchRepoLanguage(
  repo: string
): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    console.error(`Failed to fetch repo ${repo}: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as GithubRepo;
  return data.language;
}

/**
 * Fetch open issues for a repo (up to 5 pages of 100).
 * Drops pull requests and assigned issues per PRD.
 * Stops early if rate limit is low.
 */
export async function fetchOpenIssues(
  repo: string
): Promise<GithubIssue[]> {
  const issues: GithubIssue[] = [];
  const maxPages = 5;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${GITHUB_API}/repos/${repo}/issues?state=open&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: getHeaders() });

    // Check rate limit
    const remaining = parseInt(
      res.headers.get("X-RateLimit-Remaining") ?? "999",
      10
    );
    if (remaining < 50) {
      console.warn(
        `GitHub rate limit low (${remaining} remaining), stopping early for ${repo}`
      );
      break;
    }

    if (!res.ok) {
      console.error(
        `GitHub API error for ${repo} page ${page}: ${res.status}`
      );
      break;
    }

    const pageData = (await res.json()) as GithubIssue[];

    if (pageData.length === 0) break;

    // Filter: drop pull requests and assigned issues
    const filtered = pageData.filter((issue) => {
      // Items with a pull_request key are PRs, not issues
      if (issue.pull_request) return false;
      // Skip assigned issues
      if (issue.assignee) return false;
      return true;
    });

    issues.push(...filtered);
  }

  return issues;
}

/**
 * Extract label names from GitHub's label format.
 */
export function extractLabels(
  labels: Array<{ name: string } | string>
): string[] {
  return labels.map((l) => (typeof l === "string" ? l : l.name));
}
