import { forwardRef, type CSSProperties } from "react";
import type { KickSetup } from "../lib/kick";

export type GoalState = "idle" | "aim" | "goal" | "save";

interface Props {
  state: GoalState;
  /** Target zone to draw while aiming and during the result. */
  setup?: KickSetup | null;
  /** Where the aim line was frozen, 0..1 across the goal mouth. */
  kickX?: number | null;
  /** Big text shown over the scene on goal/save. */
  flash?: string;
  /** Ball glows once a spelling streak is going. */
  glow?: boolean;
  onTap?: () => void;
}

// Goal mouth in the 320x170 scene: x 60..260 → 18.75%..81.25% of the width.
const GOAL_LEFT = 18.75;
const GOAL_WIDTH = 62.5;
const BALL_W = 7; // % of scene width, see .ball
const KEEPER_W = 9; // see .keeper

/** Custom properties the keyframes read so the ball flies to where the kid aimed. */
function kickVars(state: GoalState, kickX: number | null | undefined): CSSProperties {
  if (kickX == null || (state !== "goal" && state !== "save")) return {};
  const target = GOAL_LEFT + kickX * GOAL_WIDTH;
  const ballDx = ((target - 50) / BALL_W) * 100;
  const toward = ((target - 50) / KEEPER_W) * 100;
  // On a goal the keeper guesses wrong and dives away from the ball.
  const keeperDx = state === "goal" ? (kickX < 0.5 ? 190 : -190) : toward;
  const keeperRot = Math.max(-65, Math.min(65, keeperDx / 3));
  return {
    "--ball-dx": `${ballDx.toFixed(1)}%`,
    "--keeper-dx": `${keeperDx.toFixed(1)}%`,
    "--keeper-rot": `${keeperRot.toFixed(1)}deg`,
    "--marker-x": kickX.toFixed(4),
  } as CSSProperties;
}

/**
 * The penalty scene: goal frame, keeper, ball, and (while aiming) the sweeping
 * line plus target zone. Pure CSS keyframes — the state class drives which
 * animation runs; the sweep is driven by useKickSweep writing --marker-x.
 */
export const GoalAnimation = forwardRef<HTMLDivElement, Props>(function GoalAnimation(
  { state, setup, kickX, flash, glow, onTap },
  ref,
) {
  const showAim = !!setup && state !== "idle";
  return (
    <div
      ref={ref}
      className={`pitch-scene ${state}`}
      style={kickVars(state, kickX)}
      onPointerDown={state === "aim" ? onTap : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 170" className="pitch-svg">
        {/* Goal frame */}
        <rect
          x="60"
          y="24"
          width="200"
          height="96"
          fill="none"
          stroke="var(--pitch-lines)"
          strokeWidth="4"
        />
        {/* Net */}
        <g stroke="var(--net)" strokeWidth="1">
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={60 + i * 20}
              y1="24"
              x2={60 + i * 20}
              y2="120"
            />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line
              key={`h${i}`}
              x1="60"
              y1={24 + i * 19.2}
              x2="260"
              y2={24 + i * 19.2}
            />
          ))}
        </g>
        {/* Penalty spot + ground line */}
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

      {showAim && (
        <div
          className={`aim-zone ${setup.hard ? "hard" : ""}`}
          style={{
            left: `${GOAL_LEFT + setup.zoneStart * GOAL_WIDTH}%`,
            width: `${setup.zoneWidth * GOAL_WIDTH}%`,
          }}
        />
      )}
      {showAim && <div className="aim-marker" />}

      {/* Keeper */}
      <div className="keeper">
        <div className="keeper-body" />
        <div className="keeper-head" />
      </div>

      {/* Ball */}
      <div className={glow ? "ball glow" : "ball"}>
        <div className="ball-inner" />
      </div>

      <div className="flash-text">
        {flash ?? (state === "goal" ? "GOAL!" : "SAVED!")}
      </div>
    </div>
  );
});
