import { useCallback, useEffect, useRef } from "react";
import { markerAt } from "../lib/kick";

/**
 * Sweeps the aim line while `active`, writing `--marker-x` straight onto the
 * scene element each frame so React isn't re-rendering at 60fps. `read()`
 * returns the line's position at the instant of the tap.
 */
export function useKickSweep(active: boolean, roundTripMs: number) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const position = useRef(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const x = markerAt(now - start, roundTripMs);
      position.current = x;
      sceneRef.current?.style.setProperty("--marker-x", x.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, roundTripMs]);

  const read = useCallback(() => position.current, []);

  return { sceneRef, read };
}
