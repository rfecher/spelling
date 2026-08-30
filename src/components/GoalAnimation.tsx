export type GoalState = "idle" | "goal" | "save";

/**
 * The penalty scene: goal frame, keeper, ball. Pure CSS keyframes — the state
 * class on the wrapper drives which animation runs.
 */
export function GoalAnimation({ state }: { state: GoalState }) {
  return (
    <div className={`pitch-scene ${state}`} aria-hidden="true">
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

      {/* Keeper */}
      <div className="keeper">
        <div className="keeper-body" />
        <div className="keeper-head" />
      </div>

      {/* Ball */}
      <div className="ball">
        <div className="ball-inner" />
      </div>

      <div className="flash-text">{state === "goal" ? "GOAL!" : "SAVED!"}</div>
    </div>
  );
}
