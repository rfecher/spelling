export type KidId = string;

export interface WordEntry {
  word: string;
  sentence?: string;
  hint?: string;
}

export interface WeekRef {
  id: string;
  label: string;
  file: string;
}

export interface KidConfig {
  id: KidId;
  name: string;
  grade: number;
  /**
   * Per-kid kick difficulty. 1 is standard; above 1 widens the target, slows
   * the sweep and lowers the keeper. Tune this rather than softening the hard
   * kick for everyone — the hard-vs-streak gap is the whole incentive.
   */
  kickEase?: number;
  weeks: WeekRef[];
}

export interface Manifest {
  kids: KidConfig[];
}

export interface WeekList {
  kid: KidId;
  week: string;
  label: string;
  words: WordEntry[];
}

export type GameMode = "shootout" | "scramble" | "missing" | "practice";

export interface WordStats {
  seen: number;
  correct: number;
  streak: number;
  lastResult: "correct" | "wrong";
  lastSeenAt: number;
}

export interface KidProgress {
  version: 1;
  kidId: KidId;
  totals: {
    goalsScored: number;
    attempts: number;
    bestStreak: number;
    currentStreak: number;
    roundsPlayed: number;
    /** Penalty kicks converted (the game stat — spelling stats live in goalsScored). */
    kicksScored: number;
    /** Kicks converted on the hard setting, i.e. after a misspelling. */
    hardKicksScored: number;
    /** Kicks attempted. Without a denominator no conversion rate is measurable. */
    kicksTaken: number;
    hardKicksTaken: number;
  };
  words: Record<string, WordStats>;
  trophies: string[];
}
