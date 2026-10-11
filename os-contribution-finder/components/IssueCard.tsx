import {
  ExternalLink,
  MessageSquare,
  GitFork,
  Star,
} from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/types";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  2: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  4: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  5: "bg-red-500/15 text-red-400 border-red-500/25",
};

interface IssueCardProps {
  issue: SearchResult;
}

export default function IssueCard({ issue }: IssueCardProps) {
  const matchPercent = Math.round(issue.similarity * 100);
  const difficultyLabel = DIFFICULTY_LABELS[issue.difficulty];
  const difficultyColor = DIFFICULTY_COLORS[issue.difficulty];

  return (
    <article className="group relative flex flex-col h-full bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700/60 hover:bg-zinc-900/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
      {/* Match score indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <div className="relative w-9 h-9">
          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-zinc-800"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${matchPercent * 0.88} 88`}
              strokeLinecap="round"
              className="text-violet-500 transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-violet-300">
            {matchPercent}
          </span>
        </div>
      </div>

      {/* Repo name */}
      <div className="flex items-center gap-2 mb-2">
        <GitFork size={14} className="text-zinc-500 shrink-0" />
        <span className="text-xs font-medium text-zinc-500 truncate">
          {issue.repoName}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-2 pr-12 line-clamp-2 group-hover:text-violet-200 transition-colors">
        {issue.title}
      </h3>

      {/* Snippet */}
      {issue.snippet && (
        <p className="text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-2">
          {issue.snippet}
        </p>
      )}

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
        {issue.language && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Star size={10} />
            {issue.language}
          </span>
        )}
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border ${difficultyColor}`}
        >
          {difficultyLabel}
        </span>
        {issue.labels.slice(0, 3).map((label) => (
          <span
            key={label}
            className="px-2 py-0.5 text-[11px] rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/40"
          >
            {label}
          </span>
        ))}
        {issue.labels.length > 3 && (
          <span className="px-2 py-0.5 text-[11px] rounded-md bg-zinc-800/80 text-zinc-500">
            +{issue.labels.length - 3}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <MessageSquare size={12} />
          <span>{matchPercent > 0 ? `${matchPercent}% match` : "—"}</span>
        </div>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/40 rounded-lg hover:border-violet-500/40 hover:text-violet-300 hover:bg-zinc-800 transition-all duration-200"
          aria-label={`Open issue "${issue.title}" on GitHub`}
        >
          Open on GitHub
          <ExternalLink size={12} />
        </a>
      </div>
    </article>
  );
}
