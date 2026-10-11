"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Code, Clock } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import LanguageChips from "@/components/LanguageChips";
import IssueGrid from "@/components/IssueGrid";
import { IssueGridSkeleton } from "@/components/Skeletons";
import { searchIssues, getRecentIssues } from "@/app/actions";
import type { SearchResult } from "@/lib/types";

export default function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") ?? "";
  const initialLanguage = searchParams.get("lang") ?? null;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    initialLanguage
  );
  const [currentQuery, setCurrentQuery] = useState(initialQuery);
  const [tookMs, setTookMs] = useState(0);
  const didInitRef = useRef(false);

  // Update URL params without full page reload
  const updateUrl = useCallback(
    (query: string, language: string | null) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (language) params.set("lang", language);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router]
  );

  // Run search (semantic or recent)
  const runSearch = useCallback(
    async (query: string, language: string | null) => {
      setIsLoading(true);
      setHasSearched(true);

      try {
        const trimmed = query.trim();
        let response: { results: SearchResult[]; tookMs: number };

        if (trimmed) {
          response = await searchIssues(trimmed, {
            language: language ?? undefined,
          });
        } else {
          response = await getRecentIssues(20, language);
        }

        setResults(response.results);
        setTookMs(response.tookMs);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load on mount using a ref guard to avoid the lint rule
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const load = async () => {
      try {
        const trimmed = initialQuery.trim();
        let response: { results: SearchResult[]; tookMs: number };
        if (trimmed) {
          response = await searchIssues(trimmed, {
            language: initialLanguage ?? undefined,
          });
        } else {
          response = await getRecentIssues(20, initialLanguage);
        }
        setResults(response.results);
        setTookMs(response.tookMs);
        setHasSearched(true);
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [initialQuery, initialLanguage]);

  const handleSearch = useCallback(
    (query: string) => {
      setCurrentQuery(query);
      updateUrl(query, selectedLanguage);
      runSearch(query, selectedLanguage);
    },
    [selectedLanguage, updateUrl, runSearch]
  );

  const handleLanguageSelect = useCallback(
    (language: string | null) => {
      setSelectedLanguage(language);
      updateUrl(currentQuery, language);
      runSearch(currentQuery, language);
    },
    [currentQuery, updateUrl, runSearch]
  );

  return (
    <div className="flex-1 flex flex-col bg-grid">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/[0.05] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center">
              <Code size={18} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-zinc-100">
              OSS Finder
            </span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col">
        <section className="pt-16 pb-8 px-4 sm:pt-24 sm:pb-12">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
              Find Your Next{" "}
              <span className="gradient-text">Open Source</span>{" "}
              Contribution
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Describe your skills and interests in plain language. AI-powered
              semantic search matches you with relevant GitHub issues instantly.
            </p>
          </div>

          {/* Search */}
          <SearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            initialQuery={initialQuery}
          />
        </section>

        {/* Filters + Results */}
        <section className="flex-1 px-4 pb-12">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Language chips */}
            <LanguageChips
              selected={selectedLanguage}
              onSelect={handleLanguageSelect}
            />

            {/* Results count + timing */}
            {hasSearched && !isLoading && results.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-800/50" />
                <span className="text-xs text-zinc-500 shrink-0 flex items-center gap-1.5">
                  {results.length} issue{results.length !== 1 ? "s" : ""} found
                  {tookMs > 0 && (
                    <>
                      <Clock size={10} />
                      {tookMs}ms
                    </>
                  )}
                </span>
                <div className="h-px flex-1 bg-zinc-800/50" />
              </div>
            )}

            {/* Grid or skeletons */}
            {isLoading ? (
              <IssueGridSkeleton count={6} />
            ) : (
              <IssueGrid results={results} hasSearched={hasSearched} />
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600">
          <span>
            OSS Contribution Finder — Powered by Gemini embeddings &amp;
            Supabase
          </span>
          <span>Difficulty scores are estimates</span>
        </div>
      </footer>
    </div>
  );
}
