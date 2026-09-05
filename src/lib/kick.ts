/**
 * The penalty-kick minigame: two timing gates, one shot.
 *
 *   GATE 1 (aim)   a line sweeps across the goal mouth; tap to freeze it inside
 *                  the target zone. Positions are fractions of the mouth
 *                  (0 = left post, 1 = right post).
 *   GATE 2 (power) a meter rises ONE WAY up the goal's own vertical scale; tap
 *                  to freeze it above the keeper's reach but under the bar.
 *                  Power 0 = goal line, 1 = crossbar, so the meter is a ruler
 *                  standing next to the thing it measures, not an abstract bar.
 *
 * Spelling decides how forgiving both gates are. Spell it right and the zone is
 * wide, the sweep is slow and the keeper shrinks; each further correct word in a
 * row helps more, up to MAX_BONUS. Misspell and the streak resets to a hard kick.
 *
 * The rise is one-way and never bounces: a ping-pong meter would let a kid wait
 * out a bad pass for free, which is exactly why the old single-gate kick was too
 * easy. Not tapping at all busts over the bar.
 *
 * Retuning: every number the difficulty depends on is in TUNING below, and
 * `npm test` asserts the resulting conversion curve. See "Tuning the kick" in
 * README.md.
 */

export type KickOutcome =
  | "goal"
  | "upper90"
  | "soft"
  | "over"
  | "held"
  | "saved";

export interface KickSetup {
  /** Left edge of the aim target zone, 0..1 across the goal mouth. */
  zoneStart: number;
  /** Aim zone width, 0..1. */
  zoneWidth: number;
  /** Time for the aim line to travel left→right→left once. */
  roundTripMs: number;
  /** Where the sweep starts in its cycle, 0..1, so the rhythm can't be memorised. */
  phaseOffset: number;
  /** Top of the keeper's reach, 0..1 of the goal mouth. Below this he gathers it. */
  reach: number;
  /** Power at or above this is over the bar. Always the crossbar, i.e. 1. */
  bar: number;
  /** Lower edge of the upper-90 band. Held constant in TIME, not in height. */
  sweet: number;
  /** Time for the power meter to climb from 0 to CEILING. */
  riseMs: number;
  /** True after a misspelling. */
  hard: boolean;
  /** Streak steps of bonus applied, 0..MAX_BONUS (0 when hard). */
  bonusLevel: number;
}

/** The meter overshoots the bar before auto-firing, so "too long" is reachable. */
export const CEILING = 1.12;

/** Bonus rungs above the first correct word. */
export const MAX_BONUS = 4;

const TUNING = {
  /* Aim gate. Widths are fractions of the goal mouth. */
  hardAimWidth: 0.15,
  hardAimTripMs: 1300,
  baseAimWidth: 0.155,
  aimWidthPerStreak: 0.03,
  baseAimTripMs: 1500,
  aimTripPerStreakMs: 100,

  /* Power gate. `reach` doubles as the keeper's drawn height, so the line the
     kid must clear always sits exactly on his silhouette. The streak visibly
     shrinks him rather than moving an invisible threshold through his chest. */
  hardReach: 0.78,
  baseReach: 0.74,
  reachPerStreak: 0.04,
  hardRiseMs: 600,
  riseMs: 900,

  /* The upper-90 flourish is defined in MILLISECONDS, not as a slice of the
     good band. Defined as a height it would get ~2.5x easier as the streak
     widens the band, and the rarest shot would be cheapest exactly when it
     should not be. */
  sweetMs: 70,
} as const;

const EDGE = 0.03;
/* The keeper stands in this band. Narrow zones are placed beside him so a tiny
   hard-kick target is never hidden behind his body. */
const KEEPER_LEFT = 0.42;
const KEEPER_RIGHT = 0.58;

/**
 * `ease` means one thing: the multiplier on the TIME WINDOW of each gate. A kid
 * with ease 1.2 gets 20% longer to hit each target. It is deliberately NOT
 * applied to `reach`, because the keeper is drawn at that height — moving it
 * would put the reach line back inside his body. Width and period each take the
 * square root so their product, the window, scales by exactly `ease`.
 */
export function kickSetup(
  spelledRight: boolean,
  streak: number,
  ease = 1,
  rng: () => number = Math.random,
): KickSetup {
  const spread = Math.sqrt(ease);
  // streak is already incremented for this word, so the first correct word is
  // streak 1 and must map to bonus rung 0.
  const bonusLevel = spelledRight
    ? Math.min(MAX_BONUS, Math.max(0, streak - 1))
    : 0;
  const hard = !spelledRight;

  const zoneWidth = clamp01(
    (hard
      ? TUNING.hardAimWidth
      : TUNING.baseAimWidth + TUNING.aimWidthPerStreak * bonusLevel) * spread,
  );
  const roundTripMs =
    (hard
      ? TUNING.hardAimTripMs
      : TUNING.baseAimTripMs + TUNING.aimTripPerStreakMs * bonusLevel) * spread;

  const reach = clamp01(
    hard
      ? TUNING.hardReach
      : TUNING.baseReach - TUNING.reachPerStreak * bonusLevel,
  );
  const riseMs = (hard ? TUNING.hardRiseMs : TUNING.riseMs) * ease;
  const bar = 1;

  return {
    zoneStart: placeZone(zoneWidth, rng),
    zoneWidth,
    roundTripMs,
    phaseOffset: rng(),
    reach,
    bar,
    // Constant time under the bar, expressed back as a height.
    sweet: Math.max(reach, bar - (TUNING.sweetMs / riseMs) * CEILING),
    riseMs,
    hard,
    bonusLevel,
  };
}

function clamp01(n: number): number {
  return Math.max(0.02, Math.min(0.98, n));
}

function placeZone(width: number, rng: () => number): number {
  const sideRoom = KEEPER_LEFT - EDGE;
  // Occasionally aim straight down the middle so the target isn't always a
  // corner — otherwise "he gathers it" looks odd with the keeper standing away
  // from the ball.
  if (width <= sideRoom && rng() < 0.78) {
    const start = rng() < 0.5 ? EDGE : KEEPER_RIGHT;
    return start + rng() * (sideRoom - width);
  }
  return EDGE + rng() * (1 - 2 * EDGE - width);
}

/** Triangle wave: 0→1→0 over one round trip, offset so the rhythm varies. */
export function markerAt(
  elapsedMs: number,
  roundTripMs: number,
  phaseOffset = 0,
): number {
  const p = ((elapsedMs / roundTripMs + phaseOffset) % 1 + 1) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

/** One-way linear climb. Linear on purpose: an eased ramp would slow near the
 *  top and silently widen the sweet band, making the meter lie about the time
 *  left. Clamped at CEILING, where the kick auto-fires. */
export function powerAt(elapsedMs: number, riseMs: number): number {
  return Math.min(CEILING, (elapsedMs / riseMs) * CEILING);
}

export function inZone(x: number, setup: KickSetup): boolean {
  return x >= setup.zoneStart && x <= setup.zoneStart + setup.zoneWidth;
}

/**
 * The single grader. Every ending routes through here so the title, cause line,
 * animation and stats can never disagree about what happened.
 */
export function resolveKick(
  aimX: number,
  power: number,
  setup: KickSetup,
  heldTooLong: boolean,
): { outcome: KickOutcome; scored: boolean; aimOk: boolean; powerOk: boolean } {
  const aimOk = inZone(aimX, setup);
  const tooSoft = power < setup.reach;
  const overBar = power >= setup.bar;
  const powerOk = !tooSoft && !overBar;

  let outcome: KickOutcome;
  if (heldTooLong) outcome = "held";
  // Report the loudest thing the kid actually saw: the ball leaving the stadium
  // beats a weak roller, which beats an aim they can compare against the zone.
  else if (overBar) outcome = "over";
  else if (tooSoft) outcome = "soft";
  else if (!aimOk) outcome = "saved";
  else outcome = power >= setup.sweet ? "upper90" : "goal";

  return {
    outcome,
    scored: outcome === "goal" || outcome === "upper90",
    aimOk,
    powerOk,
  };
}

/* ---------- Scene geometry ----------
 * Measured from modes.css so the ball actually arrives where the meter says.
 * The goal mouth spans 29.4%..85.9% up from the scene floor (SVG y 24..120 of
 * 170). The ball is 7% of scene WIDTH, and the scene is 170/320 as tall as it
 * is wide, so the ball is 13.18% of scene height, sitting at bottom: 6%.
 * translateY is a percentage of the ball's own height, hence the division.  */
const MOUTH_BOTTOM = 29.4;
const MOUTH_HEIGHT = 56.5;
const BALL_H = 13.18;
const BALL_CENTER = 6 + BALL_H / 2;

/** Vertical flight for a given power, as a % of the ball's height (negative = up). */
export function ballDy(power: number): number {
  const target = MOUTH_BOTTOM + power * MOUTH_HEIGHT;
  return -((target - BALL_CENTER) / BALL_H) * 100;
}

/** Harder struck shots fly faster, so a top-corner strike looks earned. */
export function flightMs(power: number): number {
  return Math.round(Math.max(560, Math.min(980, 1000 - 380 * power)));
}

const FLASH: Record<KickOutcome, string[]> = {
  goal: ["GOAL!", "WHAT A STRIKE!", "GOAL!", "CLINICAL!"],
  upper90: ["UPPER 90!", "POSTAGE STAMP!", "UNSTOPPABLE!"],
  soft: ["TOO SOFT!", "HE GATHERS IT!"],
  over: ["OVER THE BAR!", "SKIED IT!"],
  held: ["OVER THE BAR!"],
  saved: ["SAVED!", "KEEPER'S GOT IT!", "SO CLOSE!"],
};

export function flashLine(
  outcome: KickOutcome,
  rng: () => number = Math.random,
): string {
  const pool = FLASH[outcome];
  return pool[Math.floor(rng() * pool.length)];
}

/** Title and cause line. Always names the gate that was passed, because half of
 *  all hard kicks clear exactly one and a bare "Saved!" would read as 78%
 *  undifferentiated failure. */
export function kickCopy(
  outcome: KickOutcome,
  aimOk: boolean,
): { title: string; cause: string } {
  switch (outcome) {
    case "upper90":
      return { title: "Upper 90!", cause: "Right in the corner. Unstoppable." };
    case "goal":
      return { title: "GOAL!", cause: "Good aim, good weight." };
    case "soft":
      return {
        title: "Too soft",
        cause: aimOk
          ? "Great aim — you just needed more boot."
          : "Not enough power, and the keeper had the angle.",
      };
    case "over":
      return {
        title: "Over the bar",
        cause: aimOk
          ? "Great aim — just too much boot."
          : "Too much power, and it was wide too.",
      };
    case "held":
      return {
        title: "Over the bar",
        cause: "You held it too long! Tap sooner next time.",
      };
    case "saved":
    default:
      return {
        title: "Saved!",
        cause: "Good weight on it — but you aimed at the keeper.",
      };
  }
}
