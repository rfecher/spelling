import type { KidProgress, WordEntry } from "../types";
import { key } from "./progress";

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

/**
 * How badly a word needs practice. Higher = show it sooner and more often.
 * Words missed last time dominate; mastered words fade but never disappear.
 */
export function wordWeight(
  progress: KidProgress,
  entry: WordEntry,
  now: number,
): number {
  const stats = progress.words[key(entry.word)];
  if (!stats || stats.seen === 0) return 3;

  const acc = stats.correct / stats.seen;
  let weight = 1;

  if (stats.lastResult === "wrong") weight += 4;
  if (acc < 0.6) weight += 3;
  else if (acc < 0.85) weight += 1;
  if (now - stats.lastSeenAt > THREE_DAYS) weight += 1;
  if (stats.streak >= 3) weight *= 0.5;

  return Math.max(0.25, weight);
}

/**
 * Picks up to `count` words, weighted toward the ones the kid struggles with.
 * When the list fits in a round (the usual case for a school list), every word
 * is included and the weighting just orders the hard ones first.
 */
export function pickWords(
  words: WordEntry[],
  progress: KidProgress,
  count: number,
  now: number = Date.now(),
): WordEntry[] {
  if (words.length === 0) return [];

  const scored = words.map((entry) => ({
    entry,
    weight: wordWeight(progress, entry, now),
  }));

  if (words.length <= count) {
    return [...scored]
      .sort((a, b) => b.weight - a.weight)
      .map((s) => s.entry);
  }

  const pool = [...scored];
  const picked: WordEntry[] = [];

  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * total;
    let index = pool.length - 1;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index].entry);
    pool.splice(index, 1);
  }

  return picked;
}
