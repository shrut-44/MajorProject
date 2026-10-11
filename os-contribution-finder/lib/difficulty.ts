import type { Difficulty } from "./types";

/** Labels that suggest easier issues. */
const EASY_LABELS = new Set([
  "good first issue",
  "good-first-issue",
  "help wanted",
  "help-wanted",
  "documentation",
  "docs",
  "typo",
  "beginner",
  "easy",
  "starter",
  "first-timers-only",
  "low-hanging-fruit",
]);

/** Labels that suggest harder issues. */
const HARD_LABELS = new Set([
  "performance",
  "architecture",
  "security",
  "breaking-change",
  "breaking",
  "complex",
  "refactor",
  "critical",
  "regression",
]);

/**
 * Compute a difficulty score 1–5 from issue metadata.
 * This is a transparent heuristic, shown as an estimate.
 */
export function computeDifficulty(
  labels: string[],
  bodyLength: number,
  commentsCount: number,
  ageInDays: number
): Difficulty {
  let score = 3; // Start at medium

  // Label adjustments
  const lowerLabels = labels.map((l) => l.toLowerCase());

  const easyCount = lowerLabels.filter((l) => EASY_LABELS.has(l)).length;
  const hardCount = lowerLabels.filter((l) => HARD_LABELS.has(l)).length;

  score -= easyCount; // Each easy label pushes down
  score += hardCount; // Each hard label pushes up

  // Bug with long body tends to be harder
  if (
    lowerLabels.some((l) => l.includes("bug")) &&
    bodyLength > 2000
  ) {
    score += 1;
  }

  // Body length adjustment (very short = likely simpler)
  if (bodyLength < 200) {
    score -= 1;
  } else if (bodyLength > 5000) {
    score += 1;
  }

  // Many comments suggest discussion/complexity
  if (commentsCount > 10) {
    score += 1;
  } else if (commentsCount === 0) {
    score -= 0.5;
  }

  // Old issues might be harder (nobody has tackled them)
  if (ageInDays > 365) {
    score += 0.5;
  }

  // Clamp to 1–5
  const clamped = Math.max(1, Math.min(5, Math.round(score)));
  return clamped as Difficulty;
}
