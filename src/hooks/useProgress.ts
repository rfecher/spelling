import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode, KidId, KidProgress } from "../types";
import { loadProgress, resetProgress, saveProgress } from "../lib/storage";
import {
  awardTrophy,
  finishRound,
  recordAttempt as applyAttempt,
  recordKick as applyKick,
} from "../lib/progress";

export function useProgress(kidId: KidId) {
  const [progress, setProgress] = useState<KidProgress>(() => loadProgress(kidId));

  // Mirrors state so callbacks can compute the next value synchronously and
  // return the trophies earned right away, without waiting for a re-render.
  const latest = useRef(progress);

  useEffect(() => {
    const loaded = loadProgress(kidId);
    latest.current = loaded;
    setProgress(loaded);
  }, [kidId]);

  const commit = useCallback((next: KidProgress) => {
    latest.current = next;
    saveProgress(next);
    setProgress(next);
  }, []);

  /** Returns any trophies earned by this attempt so the UI can celebrate them. */
  const recordAttempt = useCallback(
    (word: string, correct: boolean, mode: GameMode): string[] => {
      const result = applyAttempt(latest.current, word, correct, mode, Date.now());
      commit(result.progress);
      return result.newTrophies;
    },
    [commit],
  );

  const recordKick = useCallback(
    (scored: boolean, hard: boolean, upper90: boolean): string[] => {
      const result = applyKick(latest.current, scored, hard, upper90);
      if (result.progress !== latest.current) commit(result.progress);
      return result.newTrophies;
    },
    [commit],
  );

  const award = useCallback(
    (id: string): string[] => {
      const result = awardTrophy(latest.current, id);
      if (result.newTrophies.length > 0) commit(result.progress);
      return result.newTrophies;
    },
    [commit],
  );

  const completeRound = useCallback(() => {
    commit(finishRound(latest.current));
  }, [commit]);

  const reset = useCallback(() => {
    resetProgress(kidId);
    commit(loadProgress(kidId));
  }, [kidId, commit]);

  return { progress, recordAttempt, recordKick, award, completeRound, reset };
}
