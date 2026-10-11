import { Inbox } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import IssueCard from "./IssueCard";

interface IssueGridProps {
  results: SearchResult[];
  hasSearched: boolean;
}

export default function IssueGrid({ results, hasSearched }: IssueGridProps) {
  if (hasSearched && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
          <Inbox size={28} className="text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          No matches found
        </h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Try broader terms, remove language filters, or describe your skills
          differently. For example: &quot;React hooks and state management&quot;
        </p>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
