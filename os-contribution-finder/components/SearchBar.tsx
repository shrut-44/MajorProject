"use client";

import { Search } from "lucide-react";
import { useState, useCallback } from "react";

const EXAMPLE_QUERIES = [
  "Python + FastAPI, API bugs",
  "React accessibility components",
  "TypeScript, tRPC, Postgres",
  "Rust performance improvements",
  "Go CLI tooling bugs",
];

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  initialQuery?: string;
}

export default function SearchBar({
  onSearch,
  isLoading,
  initialQuery = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(query);
    },
    [query, onSearch]
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      onSearch(example);
    },
    [onSearch]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-violet-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center">
          <Search
            className="absolute left-4 text-zinc-400 group-focus-within:text-violet-400 transition-colors"
            size={20}
            aria-hidden="true"
          />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your skills or interests…"
            maxLength={500}
            aria-label="Search open source issues"
            className="w-full pl-12 pr-28 py-4 bg-zinc-900/80 border border-zinc-700/50 rounded-2xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-all duration-300 text-base"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-medium rounded-xl hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* Example queries */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-zinc-500">Try:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-violet-500/40 hover:text-violet-300 hover:bg-zinc-800 transition-all duration-200"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
