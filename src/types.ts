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
  };
  words: Record<string, WordStats>;
  trophies: string[];
}
