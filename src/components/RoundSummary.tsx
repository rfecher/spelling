import { Link } from "react-router-dom";
import { trophyById } from "../lib/progress";

interface Props {
  title: string;
  /** Words spelled right / attempted. When given, this is the headline. */
  spelledRight?: number;
  spelledTotal?: number;
  goals: number;
  saves: number;
  /** Denominator for the goals line. Defaults to goals + saves. */
  total?: number;
  trophies: string[];
  onPlayAgain: () => void;
  kidId: string;
  scoreNoun?: string;
  /** Confetti. Defaults to a round with no misses. */
  celebrate?: boolean;
}

/**
 * The headline number is SPELLING wherever spelling was graded. Goals are a
 * noisier proxy for effort now that the kick has two timing gates, and the
 * biggest number on the screen the kid stares at longest should not be
 * measuring thumb skill.
 */
export function RoundSummary({
  title,
  spelledRight,
  spelledTotal,
  goals,
  saves,
  total,
  trophies,
  onPlayAgain,
  kidId,
  scoreNoun = "goals",
  celebrate,
}: Props) {
  const kicks = total ?? goals + saves;
  const showSpelling = spelledRight != null && spelledTotal != null;
  const headline = showSpelling ? spelledRight : goals;
  const headlineOf = showSpelling ? spelledTotal : kicks;
  const perfect = celebrate ?? (kicks > 0 && saves === 0);
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
        <span className="final-goals">{headline}</span>
        <span className="final-of">/ {headlineOf}</span>
      </div>
      <p className="summary-headline-label">
        {showSpelling ? "words spelled right" : scoreNoun}
      </p>

      {showSpelling && (
        <p className="muted summary-sub">
          ⚽ {goals} of {kicks} kicks scored
        </p>
      )}

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
        <button className="btn btn-lg" onClick={onPlayAgain}>Play again</button>
        <Link className="btn btn-lg btn-ghost" to={`/kid/${kidId}`}>Back to menu</Link>
      </div>
    </main>
  );
}
