import { describe, expect, it } from "vitest";
import {
  CEILING,
  MAX_BONUS,
  ballDy,
  kickSetup,
  markerAt,
  powerAt,
  resolveKick,
} from "./kick";

/** Deterministic rng so zone placement never makes a test flaky. */
const rng = (v: number) => () => v;

describe("difficulty ladder", () => {
  it("gives the first correct word the base rung, not a bonus", () => {
    // Regression: kickSetup is called with the ALREADY-incremented streak, so
    // an unshifted `streak` made rung 0 unreachable and every easy kick shipped
    // one rung easier than intended.
    expect(kickSetup(true, 1, 1, rng(0.5)).bonusLevel).toBe(0);
    expect(kickSetup(true, 2, 1, rng(0.5)).bonusLevel).toBe(1);
    expect(kickSetup(true, 99, 1, rng(0.5)).bonusLevel).toBe(MAX_BONUS);
  });

  it("makes a misspelling strictly harder on both gates", () => {
    const hard = kickSetup(false, 0, 1, rng(0.5));
    const easy = kickSetup(true, 1, 1, rng(0.5));
    expect(hard.hard).toBe(true);
    expect(hard.zoneWidth).toBeLessThan(easy.zoneWidth);
    expect(hard.roundTripMs).toBeLessThan(easy.roundTripMs);
    expect(hard.riseMs).toBeLessThan(easy.riseMs);
    // A higher keeper leaves a narrower band to shoot into.
    expect(hard.reach).toBeGreaterThan(easy.reach);
  });

  it("widens both gates monotonically as the streak grows", () => {
    const rungs = [1, 2, 3, 4, 5].map((s) => kickSetup(true, s, 1, rng(0.5)));
    for (let i = 1; i < rungs.length; i++) {
      expect(rungs[i].zoneWidth).toBeGreaterThan(rungs[i - 1].zoneWidth);
      expect(rungs[i].reach).toBeLessThan(rungs[i - 1].reach);
    }
  });

  it("keeps the upper-90 window constant in TIME across the ladder", () => {
    // Defined as a fraction of the good band it would get ~2.5x easier as the
    // streak widens that band, making the rarest shot cheapest exactly when it
    // should not be.
    const windows = [0, 1, 2, 3, 4].map((b) => {
      const s = kickSetup(true, b + 1, 1, rng(0.5));
      return ((s.bar - s.sweet) / CEILING) * s.riseMs;
    });
    for (const w of windows) expect(w).toBeCloseTo(windows[0], 5);
  });

  it("scales each gate's time window by exactly kickEase", () => {
    const std = kickSetup(true, 1, 1, rng(0.5));
    const eased = kickSetup(true, 1, 1.25, rng(0.5));
    const aimWin = (s: typeof std) => (s.zoneWidth * s.roundTripMs) / 2;
    const powWin = (s: typeof std) => ((s.bar - s.reach) / CEILING) * s.riseMs;
    expect(aimWin(eased) / aimWin(std)).toBeCloseTo(1.25, 2);
    expect(powWin(eased) / powWin(std)).toBeCloseTo(1.25, 2);
    // The keeper is DRAWN at `reach`, so easing must not move it into his body.
    expect(eased.reach).toBeCloseTo(std.reach, 5);
  });
});

describe("meters", () => {
  it("sweeps 0 -> 1 -> 0 over one round trip", () => {
    expect(markerAt(0, 1000)).toBeCloseTo(0);
    expect(markerAt(500, 1000)).toBeCloseTo(1);
    expect(markerAt(1000, 1000)).toBeCloseTo(0);
  });

  it("climbs one way and stops at the ceiling", () => {
    expect(powerAt(0, 900)).toBe(0);
    expect(powerAt(450, 900)).toBeCloseTo(CEILING / 2);
    expect(powerAt(9000, 900)).toBe(CEILING);
  });
});

describe("resolveKick", () => {
  const setup = kickSetup(true, 1, 1, rng(0.5));
  const inside = setup.zoneStart + setup.zoneWidth / 2;
  const outside = setup.zoneStart + setup.zoneWidth + 0.1;
  const good = (setup.reach + setup.sweet) / 2;

  it("scores only when both gates pass", () => {
    expect(resolveKick(inside, good, setup, false).scored).toBe(true);
    expect(resolveKick(outside, good, setup, false).scored).toBe(false);
    expect(resolveKick(inside, setup.reach - 0.05, setup, false).scored).toBe(false);
    expect(resolveKick(inside, setup.bar + 0.01, setup, false).scored).toBe(false);
  });

  it("names each failure by what the kid actually saw", () => {
    expect(resolveKick(inside, setup.reach - 0.05, setup, false).outcome).toBe("soft");
    expect(resolveKick(inside, setup.bar, setup, false).outcome).toBe("over");
    expect(resolveKick(outside, good, setup, false).outcome).toBe("saved");
    expect(resolveKick(inside, CEILING, setup, true).outcome).toBe("held");
    expect(resolveKick(inside, setup.sweet, setup, false).outcome).toBe("upper90");
  });

  it("reports the passed gate so a near-miss can be named", () => {
    const r = resolveKick(inside, setup.reach - 0.05, setup, false);
    expect(r.aimOk).toBe(true); // "Great aim - you just needed more boot."
  });

  it("never rewards power alone", () => {
    expect(resolveKick(outside, setup.sweet, setup, false).scored).toBe(false);
  });
});

describe("scene geometry", () => {
  it("puts power 1.0 on the crossbar and the keeper's head on his reach", () => {
    // Sanity-checks the numbers the CSS keyframes consume: the ball must arrive
    // where the meter said it would.
    expect(ballDy(1)).toBeCloseTo(-556, 0);
    expect(ballDy(0)).toBeCloseTo(-127.5, 0);
    expect(ballDy(1)).toBeLessThan(ballDy(0.6)); // more power flies higher
  });
});

/**
 * The conversion curve is the whole point of the tuning, so it is asserted
 * rather than left to a spreadsheet. Model: the kid waits for the marker to
 * reach the middle of the target and taps with a normally distributed timing
 * error. A sweeping marker crosses a zone of width w in w*T/2 ms; the one-way
 * power meter crosses a band of height b in (b/CEILING)*riseMs.
 */
function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return s * y;
}
const hit = (windowMs: number, sigma: number) =>
  erf(windowMs / 2 / (sigma * Math.SQRT2));

function conversion(spelledRight: boolean, streak: number): number {
  const s = kickSetup(spelledRight, streak, 1, rng(0.5));
  const aim = hit((s.zoneWidth * s.roundTripMs) / 2, 70);
  const power = hit(((s.bar - s.reach) / CEILING) * s.riseMs, 90);
  return aim * power;
}

describe("conversion curve", () => {
  it("makes a misspelling cost most of the goal chance", () => {
    const missed = conversion(false, 0);
    const streak5 = conversion(true, 5);
    expect(missed).toBeGreaterThan(0.18); // still winnable, or it demoralises
    expect(missed).toBeLessThan(0.32); // but clearly hard
    expect(streak5 / missed).toBeGreaterThan(3); // the incentive gap
  });

  it("rises monotonically with the streak", () => {
    const curve = [1, 2, 3, 4, 5].map((s) => conversion(true, s));
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeGreaterThan(curve[i - 1]);
    }
    expect(curve[0]).toBeGreaterThan(0.35);
    expect(curve[4]).toBeGreaterThan(0.82);
  });
});
