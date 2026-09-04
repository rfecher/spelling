import type { KidId, KidProgress } from "../types";

const KEY_PREFIX = "spelling.v1.progress.";

export function emptyProgress(kidId: KidId): KidProgress {
  return {
    version: 1,
    kidId,
    totals: {
      goalsScored: 0,
      attempts: 0,
      bestStreak: 0,
      currentStreak: 0,
      roundsPlayed: 0,
      kicksScored: 0,
      hardKicksScored: 0,
    },
    words: {},
    trophies: [],
  };
}

/** Never throws — a corrupt or unavailable store just means a fresh start. */
export function loadProgress(kidId: KidId): KidProgress {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + kidId);
    if (!raw) return emptyProgress(kidId);
    const parsed = JSON.parse(raw) as Partial<KidProgress>;
    if (parsed?.version !== 1 || !parsed.totals || !parsed.words) {
      return emptyProgress(kidId);
    }
    const base = emptyProgress(kidId);
    return {
      ...base,
      ...parsed,
      kidId,
      totals: { ...base.totals, ...parsed.totals },
      words: parsed.words ?? {},
      trophies: parsed.trophies ?? [],
    } as KidProgress;
  } catch {
    return emptyProgress(kidId);
  }
}

/** Progress is a nice-to-have: a full quota or private mode must not break play. */
export function saveProgress(progress: KidProgress): void {
  try {
    window.localStorage.setItem(
      KEY_PREFIX + progress.kidId,
      JSON.stringify(progress),
    );
  } catch {
    /* ignore */
  }
}

export function resetProgress(kidId: KidId): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + kidId);
  } catch {
    /* ignore */
  }
}
