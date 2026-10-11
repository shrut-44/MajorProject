export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

export interface IssueRow {
  github_id: number;
  title: string;
  description: string | null;
  repo_name: string;
  url: string;
  language: string | null;
  labels: string[];
  state: "open" | "closed";
  comments_count: number;
  difficulty: Difficulty;
  content_hash: string;
  embedding: number[];
  github_created_at: string;
  github_updated_at: string;
}

export interface SearchFilters {
  language?: string;
  maxDifficulty?: Difficulty;
  limit?: number; // default 20, max 50
}

export interface SearchResult {
  id: string;
  title: string;
  repoName: string;
  url: string;
  language: string | null;
  labels: string[];
  difficulty: Difficulty;
  similarity: number; // 0 to 1
  snippet: string; // first ~200 chars of description
}
