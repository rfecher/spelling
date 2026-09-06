import type { KidProgress, WordEntry } from "../types";
import { key } from "./progress";
import { categoryOf, groupByCategory } from "./categories";

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

interface Scored {
  entry: WordEntry;
  weight: number;
}

/** Weighted sampling without replacement. */
function weightedSample(pool: Scored[], count: number, rng: () => number): Scored[] {
  const remaining = [...pool];
  const picked: Scored[] = [];
  while (picked.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, s) => sum + s.weight, 0);
    let roll = rng() * total;
    let index = remaining.length - 1;
    for (let i = 0; i < remaining.length; i += 1) {
      roll -= remaining[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}

const byWeightDesc = (a: Scored, b: Scored) => b.weight - a.weight;

/**
 * Picks up to `count` words for a round.
 *
 * The round is STRATIFIED by category so it looks like the test does: mostly
 * regular words, with review and challenge words guaranteed a seat whenever the
 * list has them (at least one each, otherwise in proportion). Within a
 * category the weighting favours words the kid struggles with.
 *
 * Challenge words are placed LAST, as extra time — the finale of the round —
 * while regular and review words come hard-ones-first while focus is fresh.
 */
export function pickWords(
  words: WordEntry[],
  progress: KidProgress,
  count: number,
  now: number = Date.now(),
  rng: () => number = Math.random,
): WordEntry[] {
  if (words.length === 0 || count <= 0) return [];

  const score = (entry: WordEntry): Scored => ({
    entry,
    weight: wordWeight(progress, entry, now),
  });

  const groups = groupByCategory(words);
  const main = [...groups.regular, ...groups.review].map(score);
  const challenge = groups.challenge.map(score);

  if (words.length <= count) {
    return [
      ...main.sort(byWeightDesc),
      ...challenge.sort(byWeightDesc),
    ].map((s) => s.entry);
  }

  // Quotas: review and challenge get at least one slot each when present,
  // otherwise their share of the round rounded to the nearest word.
  const quota = (n: number) =>
    n === 0 ? 0 : Math.min(n, Math.max(1, Math.round((count * n) / words.length)));
  let reviewQ = quota(groups.review.length);
  let challengeQ = quota(groups.challenge.length);
  let regularQ = Math.min(groups.regular.length, count - reviewQ - challengeQ);
  // If regular can't fill its share, hand the slack back to the others.
  let slack = count - regularQ - reviewQ - challengeQ;
  if (slack > 0) {
    const extraReview = Math.min(slack, groups.review.length - reviewQ);
    reviewQ += extraReview;
    slack -= extraReview;
    challengeQ += Math.min(slack, groups.challenge.length - challengeQ);
  }

  const pickedMain = weightedSample(
    [...groups.regular.map(score)],
    regularQ,
    rng,
  ).concat(weightedSample(groups.review.map(score), reviewQ, rng));
  const pickedChallenge = weightedSample(challenge, challengeQ, rng);

  return [
    ...pickedMain.sort(byWeightDesc),
    ...pickedChallenge.sort(byWeightDesc),
  ].map((s) => s.entry);
}

export { categoryOf };
