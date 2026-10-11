"use client";

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "Ruby",
  "C++",
  "C#",
  "Swift",
] as const;

interface LanguageChipsProps {
  selected: string | null;
  onSelect: (language: string | null) => void;
}

export default function LanguageChips({
  selected,
  onSelect,
}: LanguageChipsProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      role="group"
      aria-label="Filter by programming language"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200 ${
          selected === null
            ? "bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
            : "bg-zinc-800/50 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
        }`}
      >
        All
      </button>
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onSelect(selected === lang ? null : lang)}
          aria-pressed={selected === lang}
          className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200 ${
            selected === lang
              ? "bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
              : "bg-zinc-800/50 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
