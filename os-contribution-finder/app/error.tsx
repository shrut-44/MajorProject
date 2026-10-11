"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-grid min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">
        Something went wrong!
      </h2>
      <p className="text-zinc-400 text-center max-w-md mb-8">
        We encountered an unexpected error while trying to load this page or
        perform your search.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-900 font-medium rounded-xl hover:bg-white transition-colors"
      >
        <RefreshCcw size={18} />
        Try again
      </button>
    </div>
  );
}
