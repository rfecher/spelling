import type { GameMode, KidProgress, WordEntry } from "../types";

export interface Trophy {
  id: string;
  name: string;
  blurb: string;
  icon: string;
}

export const TROPHIES: Trophy[] = [
  { id: "first-goal", name: "First Goal", blurb: "Spell your first word right", icon: "⚽" },
  { id: "hat-trick", name: "Hat Trick", blurb: "Three in a row in one round", icon: "🎩" },
  { id: "streak-5", name: "On Fire", blurb: "Five correct in a row", icon: "🔥" },
  { id: "streak-10", name: "Unstoppable", blurb: "Ten correct in a row", icon: "⚡" },
  { id: "perfect-round", name: "Clean Sheet", blurb: "Spell every word right in a round", icon: "🧤" },
  { id: "golden-boot", name: "Golden Boot", blurb: "Score on all 10 kicks in one round", icon: "🥇" },
  { id: "top-bins", name: "Top Bins", blurb: "Score from a hard kick", icon: "🎯" },
  { id: "comeback", name: "Comeback Kid", blurb: "Spell every bonus-kick word right", icon: "💪" },
  { id: "week-mastered", name: "League Champion", blurb: "Master every word this week", icon: "🏆" },
  { id: "century", name: "Century Club", blurb: "Spell 100 words right", icon: "💯" },
];

export const MASTERY_STREAK = 3;

export function trophyById(id: string): Trophy | undefined {
  return TROPHIES.find((t) => t.id === id);
}

export function key(word: string): string {
  return word.trim().toLowerCase();
}

export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

export function isCorrect(input: string, word: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(word);
}

/** Modes where a miss breaks the streak. Practice is deliberately pressure-free. */
function countsForStreak(mode: GameMode): boolean {
  return mode !== "practice";
}

export interface AttemptResult {
  progress: KidProgress;
  newTrophies: string[];
}

export function recordAttempt(
  progress: KidProgress,
  word: string,
  correct: boolean,
  mode: GameMode,
  now: number,
): AttemptResult {
  const k = key(word);
  const prev = progress.words[k];
  const stats = {
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    streak: correct ? (prev?.streak ?? 0) + 1 : 0,
    lastResult: (correct ? "correct" : "wrong") as "correct" | "wrong",
    lastSeenAt: now,
  };

  const totals = { ...progress.totals };
  totals.attempts += 1;
  if (correct) totals.goalsScored += 1;

  if (countsForStreak(mode)) {
    totals.currentStreak = correct ? totals.currentStreak + 1 : 0;
    totals.bestStreak = Math.max(totals.bestStreak, totals.currentStreak);
  }

  const next: KidProgress = {
    ...progress,
    totals,
    words: { ...progress.words, [k]: stats },
  };

  const earned: string[] = [];
  const award = (id: string) => {
    if (!next.trophies.includes(id) && !earned.includes(id)) earned.push(id);
  };

  if (correct && totals.goalsScored >= 1) award("first-goal");
  if (totals.goalsScored >= 100) award("century");
  if (countsForStreak(mode)) {
    if (totals.currentStreak >= 3) award("hat-trick");
    if (totals.currentStreak >= 5) award("streak-5");
    if (totals.currentStreak >= 10) award("streak-10");
  }

  if (earned.length > 0) next.trophies = [...next.trophies, ...earned];
  return { progress: next, newTrophies: earned };
}

/**
 * A converted (or saved) penalty. Kicks are the game layer on top of spelling,
 * so they never touch word stats, streaks, or mastery — only their own tallies.
 */
export function recordKick(
  progress: KidProgress,
  scored: boolean,
  hard: boolean,
): AttemptResult {
  if (!scored) return { progress, newTrophies: [] };
  const totals = {
    ...progress.totals,
    kicksScored: progress.totals.kicksScored + 1,
    hardKicksScored: progress.totals.hardKicksScored + (hard ? 1 : 0),
  };
  const next: KidProgress = { ...progress, totals };
  const earned: string[] = [];
  if (hard && !next.trophies.includes("top-bins")) earned.push("top-bins");
  if (earned.length > 0) next.trophies = [...next.trophies, ...earned];
  return { progress: next, newTrophies: earned };
}

export function awardTrophy(
  progress: KidProgress,
  id: string,
): AttemptResult {
  if (progress.trophies.includes(id)) {
    return { progress, newTrophies: [] };
  }
  return {
    progress: { ...progress, trophies: [...progress.trophies, id] },
    newTrophies: [id],
  };
}

export function finishRound(progress: KidProgress): KidProgress {
  return {
    ...progress,
    totals: { ...progress.totals, roundsPlayed: progress.totals.roundsPlayed + 1 },
  };
}

export function isMastered(progress: KidProgress, word: string): boolean {
  return (progress.words[key(word)]?.streak ?? 0) >= MASTERY_STREAK;
}

export function weekMastered(progress: KidProgress, words: WordEntry[]): boolean {
  return words.length > 0 && words.every((w) => isMastered(progress, w.word));
}

export function masteredCount(progress: KidProgress, words: WordEntry[]): number {
  return words.filter((w) => isMastered(progress, w.word)).length;
}

export function accuracy(progress: KidProgress): number {
  const { attempts, goalsScored } = progress.totals;
  return attempts === 0 ? 0 : Math.round((goalsScored / attempts) * 100);
}
