export interface RepoConfig {
  owner: string;
  name: string;
}

/** Seed repos — edit this list to add or remove tracked repositories. */
export const REPOS: RepoConfig[] = [
  { owner: "vercel", name: "next.js" },
  { owner: "supabase", name: "supabase" },
  { owner: "fastapi", name: "fastapi" },
  { owner: "facebook", name: "react" },
  { owner: "microsoft", name: "TypeScript" },
  { owner: "denoland", name: "deno" },
  { owner: "tailwindlabs", name: "tailwindcss" },
  { owner: "vitejs", name: "vite" },
  { owner: "prisma", name: "prisma" },
  { owner: "trpc", name: "trpc" },
  { owner: "sveltejs", name: "svelte" },
  { owner: "django", name: "django" },
  { owner: "pallets", name: "flask" },
  { owner: "rust-lang", name: "rust" },
  { owner: "golang", name: "go" },
];

/** Helper to get "owner/name" string */
export function repoFullName(repo: RepoConfig): string {
  return `${repo.owner}/${repo.name}`;
}
