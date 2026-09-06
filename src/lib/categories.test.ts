import { describe, expect, it } from "vitest";
import { nextStreak, groupByCategory, categoryOf } from "./categories";
import { pickWords } from "./weighting";
import { emptyProgress } from "./storage";
import type { WordEntry } from "../types";

describe("streak rules by category", () => {
  it("treats regular and review words the same: +1, or reset", () => {
    expect(nextStreak(3, true, "regular")).toBe(4);
    expect(nextStreak(3, false, "regular")).toBe(0);
    expect(nextStreak(3, true, "review")).toBe(4);
    expect(nextStreak(3, false, "review")).toBe(0);
  });

  it("makes challenge words extra credit: double step up, no loss down", () => {
    expect(nextStreak(3, true, "challenge")).toBe(5);
    expect(nextStreak(3, false, "challenge")).toBe(3);
    expect(nextStreak(0, false, "challenge")).toBe(0);
  });
});

const list = (): WordEntry[] => [
  ...Array.from({ length: 20 }, (_, i) => ({ word: `reg${i}`, category: "regular" as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ word: `rev${i}`, category: "review" as const })),
  ...Array.from({ length: 4 }, (_, i) => ({ word: `chal${i}`, category: "challenge" as const })),
];

describe("round composition", () => {
  const progress = emptyProgress("test");
  const rng = () => 0.5;

  it("defaults a word with no category to regular", () => {
    expect(categoryOf({ word: "plain" })).toBe("regular");
    expect(groupByCategory([{ word: "plain" }]).regular).toHaveLength(1);
  });

  it("guarantees review and challenge words a seat in a 10-word round", () => {
    const round = pickWords(list(), progress, 10, 0, rng);
    const groups = groupByCategory(round);
    expect(round).toHaveLength(10);
    expect(groups.review.length).toBeGreaterThanOrEqual(1);
    expect(groups.challenge.length).toBeGreaterThanOrEqual(1);
    // Still mostly the week's regular words, like the test.
    expect(groups.regular.length).toBeGreaterThanOrEqual(6);
  });

  it("saves the challenge words for the end of the round", () => {
    const round = pickWords(list(), progress, 10, 0, rng);
    const firstChallenge = round.findIndex((w) => categoryOf(w) === "challenge");
    expect(firstChallenge).toBeGreaterThan(-1);
    for (const w of round.slice(firstChallenge)) {
      expect(categoryOf(w)).toBe("challenge");
    }
  });

  it("includes every word, challenge last, when the list fits the round", () => {
    const small = list().slice(16); // 4 regular, 4 review, 4 challenge
    const round = pickWords(small, progress, 20, 0, rng);
    expect(round).toHaveLength(12);
    expect(round.slice(-4).every((w) => categoryOf(w) === "challenge")).toBe(true);
  });

  it("never returns duplicates", () => {
    const round = pickWords(list(), progress, 10, 0, Math.random);
    expect(new Set(round.map((w) => w.word)).size).toBe(round.length);
  });

  it("still works for a list with no categories at all", () => {
    const plain = Array.from({ length: 12 }, (_, i) => ({ word: `w${i}` }));
    expect(pickWords(plain, progress, 10, 0, rng)).toHaveLength(10);
  });
});
