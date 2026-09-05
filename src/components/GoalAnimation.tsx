import { forwardRef, type CSSProperties } from "react";
import { CEILING, ballDy, flightMs, type KickOutcome, type KickSetup } from "../lib/kick";

export type SceneState = "idle" | "aim" | "power" | KickOutcome;

interface Props {
  state: SceneState;
  setup?: KickSetup | null;
  /** Where the aim line was frozen, 0..1 across the goal mouth. */
  kickX?: number | null;
  /** Where the power meter was frozen, 0..CEILING. */
  kickPower?: number | null;
  flash?: string;
  /** Ball glows once a spelling streak is running. */
  glow?: boolean;
  onTap?: () => void;
}

// Goal mouth in the 320x170 scene: x 60..260 -> 18.75%..81.25% of the width.
const GOAL_LEFT = 18.75;
const GOAL_WIDTH = 62.5;
const BALL_W = 7; // % of scene width, see .ball
const KEEPER_W = 9;

const RESULTS: SceneState[] = ["goal", "upper90", "soft", "over", "held", "saved"];

/**
 * Custom properties the keyframes read. Every value carries its unit at the
 * point it is written — a bare number in `animation-duration: var(--flight-ms)`
 * is invalid and silently collapses the flight to 0s.
 */
function sceneVars(
  state: SceneState,
  setup: KickSetup | null | undefined,
  kickX: number | null | undefined,
  power: number | null | undefined,
): CSSProperties {
  const vars: Record<string, string> = {};

  if (setup) {
    // Track spans the whole travel (0..CEILING), so the crossbar sits partway up
    // it and the bust slab above the bar is visible rather than off the top.
    vars["--reach-f"] = `${((setup.reach / CEILING) * 100).toFixed(2)}%`;
    vars["--sweet-f"] = `${((setup.sweet / CEILING) * 100).toFixed(2)}%`;
    vars["--bar-f"] = `${((setup.bar / CEILING) * 100).toFixed(2)}%`;
    // The keeper is DRAWN to his reach, so the line the kid must clear is always
    // the top of his silhouette rather than an invisible threshold in his chest.
    vars["--keeper-h"] = setup.reach.toFixed(3);
  }

  if (RESULTS.includes(state) && kickX != null && power != null) {
    const target = GOAL_LEFT + kickX * GOAL_WIDTH;
    vars["--ball-dx"] = `${(((target - 50) / BALL_W) * 100).toFixed(1)}%`;
    vars["--ball-dy"] = `${ballDy(state === "over" || state === "held" ? CEILING : power).toFixed(0)}%`;
    vars["--flight-ms"] = `${flightMs(power)}ms`;

    const toward = ((target - 50) / KEEPER_W) * 100;
    // Wrong way on a goal, at the ball on a save or a weak roller, and nowhere
    // at all when it has gone over his bar.
    let keeperDx = 0;
    if (state === "goal" || state === "upper90") keeperDx = kickX < 0.5 ? 190 : -190;
    else if (state === "saved" || state === "soft") keeperDx = toward;
    vars["--keeper-dx"] = `${keeperDx.toFixed(1)}%`;
    vars["--keeper-rot"] = `${Math.max(-65, Math.min(65, keeperDx / 3)).toFixed(1)}deg`;
    vars["--marker-x"] = kickX.toFixed(4);
    vars["--power"] = power.toFixed(4);
  }

  return vars as CSSProperties;
}

/**
 * The penalty scene: goal frame, keeper, ball, the sweeping aim line and the
 * power meter. Pure CSS keyframes — the state class picks the animation, and
 * useKickMeter writes --marker-x / --power straight onto this element.
 */
export const GoalAnimation = forwardRef<HTMLDivElement, Props>(function GoalAnimation(
  { state, setup, kickX, kickPower, flash, glow, onTap },
  ref,
) {
  const live = state !== "idle";
  // Drawn from the aim stage onward, dimmed until it is live, so the second
  // gate is never a surprise the first time a kid gets there.
  const showMeter = !!setup && live;
  const meterIdle = state === "aim";

  return (
    <div
      ref={ref}
      className={`pitch-scene ${state}`}
      style={sceneVars(state, setup, kickX, kickPower)}
      onPointerDown={state === "aim" || state === "power" ? onTap : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 170" className="pitch-svg">
        <rect
          x="60"
          y="24"
          width="200"
          height="96"
          fill="none"
          stroke="var(--pitch-lines)"
          strokeWidth="4"
        />
        <g stroke="var(--net)" strokeWidth="1">
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={60 + i * 20} y1="24" x2={60 + i * 20} y2="120" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1="60" y1={24 + i * 19.2} x2="260" y2={24 + i * 19.2} />
          ))}
        </g>
        <line
          x1="0"
          y1="120"
          x2="320"
          y2="120"
          stroke="var(--pitch-lines)"
          strokeWidth="3"
        />
        <ellipse cx="160" cy="150" rx="4" ry="2" fill="var(--pitch-lines)" />
      </svg>

      {setup && live && (
        <div
          className={`aim-zone ${setup.hard ? "hard" : ""}`}
          style={{
            left: `${GOAL_LEFT + setup.zoneStart * GOAL_WIDTH}%`,
            width: `${setup.zoneWidth * GOAL_WIDTH}%`,
          }}
        />
      )}
      {/* The frozen aim line stays drawn through the power stage and the result,
          so the gap between where it stopped and the zone is a picture. */}
      {setup && live && <div className="aim-marker" />}

      {showMeter && (
        <div className={meterIdle ? "power-meter idle" : "power-meter"}>
          <div className="power-track">
            <div className="band band-reach" />
            <div className="band band-good" />
            <div className="band band-sweet" />
            <div className="band band-bust" />
            <div className="power-fill" />
            <div className="bar-tick" />
          </div>
          <span className="power-cap">PWR</span>
        </div>
      )}

      <div className="keeper">
        <div className="keeper-body" />
        <div className="keeper-head" />
      </div>

      <div className={glow ? "ball glow" : "ball"}>
        <div className="ball-inner" />
      </div>

      <div className="flash-text">{flash ?? ""}</div>
    </div>
  );
});
