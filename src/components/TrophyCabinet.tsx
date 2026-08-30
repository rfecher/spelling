import { TROPHIES } from "../lib/progress";

export function TrophyCabinet({ earned }: { earned: string[] }) {
  return (
    <div className="trophy-grid">
      {TROPHIES.map((trophy) => {
        const has = earned.includes(trophy.id);
        return (
          <div
            key={trophy.id}
            className={`trophy ${has ? "earned" : "locked"}`}
            title={trophy.blurb}
          >
            <span className="trophy-icon" aria-hidden="true">
              {has ? trophy.icon : "🔒"}
            </span>
            <span className="trophy-name">{trophy.name}</span>
            <span className="trophy-blurb">{trophy.blurb}</span>
          </div>
        );
      })}
    </div>
  );
}
