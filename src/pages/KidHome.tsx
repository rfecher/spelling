import { Link } from "react-router-dom";
import { useKid } from "../context/KidContext";
import { useWordList } from "../hooks/useWordList";
import { VantorHeader } from "../components/VantorHeader";
import { WeekPicker } from "../components/WeekPicker";
import { TrophyCabinet } from "../components/TrophyCabinet";
import { accuracy, isMastered, masteredCount } from "../lib/progress";
import { CATEGORIES, CATEGORY_META, groupByCategory, masteredIn } from "../lib/categories";
import "./KidHome.css";

const MODES = [
  {
    path: "shootout",
    name: "Penalty Shootout",
    blurb: "Spell it right, then time your kick",
    icon: "⚽",
    primary: true,
  },
  {
    path: "scramble",
    name: "Word Scramble",
    blurb: "Put the letters back in order",
    icon: "🔀",
    primary: false,
  },
  {
    path: "missing",
    name: "Missing Letters",
    blurb: "Fill in the gaps",
    icon: "🧩",
    primary: false,
  },
  {
    path: "practice",
    name: "Practice",
    blurb: "Warm up, no pressure",
    icon: "🎯",
    primary: false,
  },
];

export function KidHome() {
  const { kid, week, weeks, setWeekId, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const stats = progress.progress;

  const mastered = list ? masteredCount(stats, list.words) : 0;
  const total = list?.words.length ?? 0;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <>
      <VantorHeader backTo="/" kidName={kid.name} />
      <main className="page kid-home">
        <section className="home-hero">
          <h1 className="display">Hey {kid.name} 👋</h1>
          <WeekPicker weeks={weeks} current={week} onSelect={setWeekId} />
        </section>

        <section className="card progress-card">
          <div className="progress-head">
            <span className="muted">This week's words</span>
            <strong>
              {mastered} / {total} mastered
            </strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          {list && (
            <div className="cat-row" aria-label="Mastery by word category">
              {CATEGORIES.map((c) => {
                const m = masteredIn(stats, list.words, c);
                if (m.total === 0) return null;
                return (
                  <span
                    key={c}
                    className={`cat-chip ${m.mastered === m.total ? "done" : ""}`}
                    title={CATEGORY_META[c].blurb}
                  >
                    {CATEGORY_META[c].icon} {CATEGORY_META[c].label}s{" "}
                    <strong>
                      {m.mastered}/{m.total}
                    </strong>
                  </span>
                );
              })}
            </div>
          )}
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{stats.totals.goalsScored}</span>
              <span className="stat-label">Words right</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.totals.bestStreak}</span>
              <span className="stat-label">Best streak</span>
            </div>
            <div className="stat">
              <span className="stat-value">{accuracy(stats)}%</span>
              <span className="stat-label">Accuracy</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.totals.kicksScored}</span>
              <span className="stat-label">Goals</span>
            </div>
          </div>
        </section>

        {loading && <p className="muted">Loading this week's words…</p>}
        {error && <p className="error-text">{error}</p>}

        {list && (
          <nav className="mode-list">
            {MODES.map((mode) => (
              <Link
                key={mode.path}
                to={mode.path}
                className={`mode-card ${mode.primary ? "primary" : ""}`}
              >
                <span className="mode-icon" aria-hidden="true">
                  {mode.icon}
                </span>
                <span className="mode-text">
                  <span className="mode-name">{mode.name}</span>
                  <span className="mode-blurb">{mode.blurb}</span>
                </span>
                <span className="mode-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>
        )}

        <section className="trophies-section">
          <h2>Trophy Cabinet</h2>
          <TrophyCabinet earned={stats.trophies} />
        </section>

        {list && (
          <details className="word-preview">
            <summary>See all {total} words</summary>
            <div className="word-groups">
              {CATEGORIES.map((c) => {
                const words = groupByCategory(list.words)[c];
                if (words.length === 0) return null;
                return (
                  <div key={c} className="word-group">
                    <h3>
                      {CATEGORY_META[c].icon} {CATEGORY_META[c].label}s · {words.length}
                    </h3>
                    <ul>
                      {words.map((w) => (
                        <li
                          key={w.word}
                          className={`${isMastered(stats, w.word) ? "mastered" : ""} ${c}`}
                        >
                          {w.word}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </main>
    </>
  );
}
