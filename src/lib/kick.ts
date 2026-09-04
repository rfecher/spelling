/**
 * The penalty-kick minigame: a line sweeps across the goal mouth and the kid
 * taps to freeze it. Positions are fractions of the goal mouth (0 = left post,
 * 1 = right post). Spelling decides how forgiving the kick is.
 */

export interface KickSetup {
  /** Left edge of the target zone, 0..1. */
  zoneStart: number;
  /** Zone width, 0..1. */
  zoneWidth: number;
  /** Time for the line to go left→right→left once. */
  roundTripMs: number;
  /** True after a misspelling: tiny zone, fast line. */
  hard: boolean;
  /** How many streak steps of bonus were applied (0 when hard). */
  bonusLevel: number;
}

export const MAX_BONUS = 5;

const EASY_WIDTH = 0.34;
const EASY_TRIP = 2800;
const WIDTH_PER_STREAK = 0.05;
const TRIP_PER_STREAK = 250;

const HARD_WIDTH = 0.18;
const HARD_TRIP = 1400;

const EDGE = 0.03;
// The keeper stands in this band. Zones that fit beside him stay out of it so
// a tiny hard-kick target never hides behind his body.
const KEEPER_LEFT = 0.42;
const KEEPER_RIGHT = 0.58;

export function kickSetup(
  spelledRight: boolean,
  streak: number,
  rng: () => number = Math.random,
): KickSetup {
  const bonusLevel = spelledRight ? Math.min(MAX_BONUS, Math.max(0, streak)) : 0;
  const zoneWidth = spelledRight
    ? EASY_WIDTH + WIDTH_PER_STREAK * bonusLevel
    : HARD_WIDTH;
  const roundTripMs = spelledRight
    ? EASY_TRIP + TRIP_PER_STREAK * bonusLevel
    : HARD_TRIP;
  return {
    zoneStart: placeZone(zoneWidth, rng),
    zoneWidth,
    roundTripMs,
    hard: !spelledRight,
    bonusLevel,
  };
}

function placeZone(width: number, rng: () => number): number {
  const sideRoom = KEEPER_LEFT - EDGE;
  if (width <= sideRoom) {
    const left = rng() < 0.5;
    const start = left ? EDGE : KEEPER_RIGHT;
    return start + rng() * (sideRoom - width);
  }
  // Wide (streak-bonus) zones can't avoid the keeper; anywhere in the goal.
  return EDGE + rng() * (1 - 2 * EDGE - width);
}

/** Triangle wave: 0→1→0 over one round trip. */
export function markerAt(elapsedMs: number, roundTripMs: number): number {
  const p = (elapsedMs % roundTripMs) / roundTripMs;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

export function inZone(x: number, setup: KickSetup): boolean {
  return x >= setup.zoneStart && x <= setup.zoneStart + setup.zoneWidth;
}

const GOAL_LINES = ["GOAL!", "TOP BINS!", "WHAT A STRIKE!", "GOAL!", "UNSTOPPABLE!"];
const SAVE_LINES = ["SAVED!", "KEEPER'S GOT IT!", "SAVED!", "SO CLOSE!"];

export function flashLine(scored: boolean, rng: () => number = Math.random): string {
  const pool = scored ? GOAL_LINES : SAVE_LINES;
  return pool[Math.floor(rng() * pool.length)];
}
