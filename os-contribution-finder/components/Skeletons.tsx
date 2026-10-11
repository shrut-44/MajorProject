export function SearchBarSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-pulse">
      <div className="h-14 bg-zinc-800/60 rounded-2xl" />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-28 bg-zinc-800/40 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

export function ChipsSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-8 w-20 bg-zinc-800/40 rounded-full"
        />
      ))}
    </div>
  );
}

export function IssueCardSkeleton() {
  return (
    <div className="flex flex-col h-full bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-5 animate-pulse">
      {/* Repo name */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-zinc-800 rounded" />
        <div className="h-3 w-24 bg-zinc-800 rounded" />
      </div>

      {/* Title */}
      <div className="space-y-2 mb-3">
        <div className="h-4 w-full bg-zinc-800 rounded" />
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
      </div>

      {/* Snippet */}
      <div className="space-y-1.5 mb-4">
        <div className="h-3 w-full bg-zinc-800/60 rounded" />
        <div className="h-3 w-5/6 bg-zinc-800/60 rounded" />
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 mb-4 mt-auto">
        <div className="h-5 w-16 bg-zinc-800/50 rounded-md" />
        <div className="h-5 w-14 bg-zinc-800/50 rounded-md" />
        <div className="h-5 w-20 bg-zinc-800/50 rounded-md" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
        <div className="h-3 w-16 bg-zinc-800/40 rounded" />
        <div className="h-7 w-28 bg-zinc-800/60 rounded-lg" />
      </div>
    </div>
  );
}

export function IssueGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <IssueCardSkeleton key={i} />
      ))}
    </div>
  );
}
