import type { KidProgress, WordCategory, WordEntry } from "../types";
import { isMastered } from "./progress";

export const CATEGORIES: WordCategory[] = ["regular", "review", "challenge"];

export const CATEGORY_META: Record<
  WordCategory,
  { label: string; icon: string; blurb: string }
> = {
  regular: { label: "Spelling word", icon: "⚽", blurb: "This week's list" },
  review: { label: "Review word", icon: "↺", blurb: "From an earlier week" },
  challenge: {
    label: "Challenge word",
    icon: "⭐",
    blurb: "Extra credit — double streak step if you get it, no streak loss if you don't",
  },
};

export function categoryOf(entry: WordEntry): WordCategory {
  return entry.category ?? "regular";
}

export function groupByCategory(words: WordEntry[]): Record<WordCategory, WordEntry[]> {
  const groups: Record<WordCategory, WordEntry[]> = { regular: [], review: [], challenge: [] };
  for (const w of words) groups[categoryOf(w)].push(w);
  return groups;
}

/**
 * The streak rules for the shootout. Regular and review words behave as they
 * always have. Challenge words are extra credit, so they mirror how the test
 * treats them: a correct one is worth a double step, and a missed one still
 * earns the hard kick but does NOT break the streak.
 */
export function nextStreak(
  streak: number,
  correct: boolean,
  category: WordCategory,
): number {
  if (correct) return streak + (category === "challenge" ? 2 : 1);
  return category === "challenge" ? streak : 0;
}

export function masteredIn(
  progress: KidProgress,
  words: WordEntry[],
  category: WordCategory,
): { mastered: number; total: number } {
  const inCat = words.filter((w) => categoryOf(w) === category);
  return {
    mastered: inCat.filter((w) => isMastered(progress, w.word)).length,
    total: inCat.length,
  };
}

/** Every challenge word this week is mastered (and there is at least one). */
export function challengeMastered(progress: KidProgress, words: WordEntry[]): boolean {
  const { mastered, total } = masteredIn(progress, words, "challenge");
  return total > 0 && mastered === total;
}
