interface Props {
  goals: number;
  saves: number;
  streak: number;
  kick: number;
  total: number;
  label: string;
}

export function Scoreboard({ goals, saves, streak, kick, total, label }: Props) {
  return (
    <div className="scoreboard">
      <div className="score-line">
        <span className="score-chip">⚽ {goals}</span>
        <div className="score-mid">
          <span className="score-label">{label}</span>
          <span className="score-kick">
            Kick {Math.min(kick, total)} of {total}
          </span>
        </div>
        <span className="score-chip">🧤 {saves}</span>
      </div>
      {streak >= 2 && (
        <div className="streak-pill">🔥 {streak} spelled right in a row</div>
      )}
    </div>
  );
}
