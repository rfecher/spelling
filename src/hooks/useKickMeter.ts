import { useCallback, useEffect, useRef } from "react";
import { CEILING, markerAt, powerAt, type KickSetup } from "../lib/kick";

export type MeterStage = "idle" | "aim" | "power";

/**
 * Drives both kick gates from a single requestAnimationFrame loop, writing
 * `--marker-x` and `--power` straight onto the scene element so React never
 * re-renders at 60fps.
 *
 * Two things here are load-bearing rather than incidental:
 *
 * 1. `readAim` / `readPower` recompute from the CLOCK at the instant of the tap
 *    rather than returning the last painted frame. Returning a stored value
 *    meant a tap landing before the first frame of a stage graded the PREVIOUS
 *    kick's position, and it also baked in up to a frame of drift between what
 *    the kid saw and what was graded.
 * 2. Hiding the tab stops rAF but not the clock, so on return the meter would
 *    already be past the ceiling and auto-fire a kick nobody took. The hidden
 *    span is added back to the stage's start instead.
 */
export function useKickMeter(
  stage: MeterStage,
  setup: KickSetup | null,
  onBust: () => void,
) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(0);
  const hiddenAtRef = useRef(0);
  // Held in a ref so a new callback identity never restarts the loop mid-stage.
  const bustRef = useRef(onBust);
  bustRef.current = onBust;

  const setVar = (name: string, value: string) =>
    sceneRef.current?.style.setProperty(name, value);

  useEffect(() => {
    if (stage === "idle" || !setup) return;

    startRef.current = performance.now();
    hiddenAtRef.current = 0;
    let frame = 0;
    let busted = false;

    // Paint frame zero synchronously so there is no flash of the previous
    // kick's value before the first rAF callback runs.
    if (stage === "aim") {
      setVar("--marker-x", markerAt(0, setup.roundTripMs, setup.phaseOffset).toFixed(4));
    } else {
      setVar("--power", "0");
    }

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      if (stage === "aim") {
        setVar(
          "--marker-x",
          markerAt(elapsed, setup.roundTripMs, setup.phaseOffset).toFixed(4),
        );
      } else {
        const p = powerAt(elapsed, setup.riseMs);
        setVar("--power", p.toFixed(4));
        if (p >= CEILING && !busted) {
          busted = true;
          bustRef.current();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = performance.now();
      } else if (hiddenAtRef.current) {
        startRef.current += performance.now() - hiddenAtRef.current;
        hiddenAtRef.current = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [stage, setup]);

  /** Elapsed time in the current stage, excluding any time the tab was hidden. */
  const elapsed = useCallback(() => {
    const pausedFor = hiddenAtRef.current
      ? performance.now() - hiddenAtRef.current
      : 0;
    return performance.now() - startRef.current - pausedFor;
  }, []);

  const readAim = useCallback(() => {
    if (!setup) return 0;
    return markerAt(elapsed(), setup.roundTripMs, setup.phaseOffset);
  }, [setup, elapsed]);

  const readPower = useCallback(() => {
    if (!setup) return 0;
    return powerAt(elapsed(), setup.riseMs);
  }, [setup, elapsed]);

  return { sceneRef, readAim, readPower, setVar };
}
