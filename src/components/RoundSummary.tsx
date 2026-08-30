import { Link } from "react-router-dom";
import { trophyById } from "../lib/progress";

interface Props {
  title: string;
  goals: number;
  saves: number;
  total: number;
  trophies: string[];
  onPlayAgain: () => void;
  kidId: string;
  scoreNoun?: string;
}

export function RoundSummary({
  title,
  goals,
  saves,
  total,
  trophies,
  onPlayAgain,
  kidId,
  scoreNoun = "goals",
}: Props) {
  const perfect = total > 0 && saves === 0;
  const unique = Array.from(new Set(trophies));

  return (
    <main className="page summary-page">
      {perfect && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 5.5 + 4) % 100}%`,
                animationDelay: `${(i % 6) * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      <h1 className="display summary-title">{title}</h1>

      <div className="final-score">
        <span className="final-goals">{goals}</span>
        <span className="final-of">/ {total}</span>
      </div>
      <p className="muted summary-sub">
        {goals} {scoreNoun}, {saves} {saves === 1 ? "miss" : "misses"}
      </p>

      {unique.length > 0 && (
        <div className="new-trophies">
          <h2>New trophies!</h2>
          <div className="trophy-row">
            {unique.map((id) => {
              const trophy = trophyById(id);
              if (!trophy) return null;
              return (
                <div key={id} className="trophy earned pop">
                  <span className="trophy-icon">{trophy.icon}</span>
                  <span className="trophy-name">{trophy.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="summary-actions">
        <button className="btn btn-lg" onClick={onPlayAgain}>
          Play again
        </button>
        <Link className="btn btn-lg btn-ghost" to={`/kid/${kidId}`}>
          Back to menu
        </Link>
      </div>
    </main>
  );
}
