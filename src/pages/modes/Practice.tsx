import { useCallback, useEffect, useState } from "react";
import { useKid } from "../../context/KidContext";
import { useWordList } from "../../hooks/useWordList";
import { useTTS } from "../../hooks/useTTS";
import { TTSButton } from "../../components/TTSButton";
import { OnScreenKeyboard } from "../../components/OnScreenKeyboard";
import { ModeShell } from "../../components/ModeShell";
import { CategoryBadge } from "../../components/CategoryBadge";
import { CATEGORIES, CATEGORY_META, categoryOf } from "../../lib/categories";
import { pickWords } from "../../lib/weighting";
import { isCorrect } from "../../lib/progress";
import type { WordCategory, WordEntry } from "../../types";
import "./modes.css";

type Stage = "study" | "type" | "checked";

/** Keeps the sentence as a clue while blanking out the answer inside it. */
function maskWord(sentence: string, word: string): string {
  return sentence.replace(
    new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    "_".repeat(word.length),
  );
}

export function Practice() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("study");
  const [typed, setTyped] = useState("");
  const [peeking, setPeeking] = useState(false);
  const [wasRight, setWasRight] = useState(false);
  // Study one category at a time before a test, or everything.
  const [filter, setFilter] = useState<WordCategory | "all">("all");

  const startRound = useCallback(() => {
    if (!list) return;
    const pool =
      filter === "all" ? list.words : list.words.filter((w) => categoryOf(w) === filter);
    setQueue(pickWords(pool, progress.progress, pool.length));
    setIndex(0);
    setStage("study");
    setTyped("");
    setPeeking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, filter]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const current = queue[index];
  const present = CATEGORIES.filter((c) => list?.words.some((w) => categoryOf(w) === c));

  const check = () => {
    if (!current) return;
    const correct = isCorrect(typed, current.word);
    setWasRight(correct);
    // Practice is pressure-free: it builds mastery but never breaks a streak.
    progress.recordAttempt(current.word, correct, "practice");
    setStage("checked");
  };

  const next = () => {
    setTyped("");
    setPeeking(false);
    setStage("study");
    setIndex((i) => (i + 1) % Math.max(queue.length, 1));
  };

  return (
    <ModeShell
      kidId={kid.id}
      kidName={kid.name}
      loading={loading}
      error={error}
      ready={Boolean(current)}
      title="Practice"
      subtitle={
        current ? `Card ${index + 1} of ${queue.length} · no score kept` : undefined
      }
    >
      {list && present.length > 1 && (
        <div className="cat-filter" role="tablist" aria-label="Word category">
          <button
            role="tab"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All {list.words.length}
          </button>
          {present.map((c) => (
            <button
              key={c}
              role="tab"
              className={filter === c ? "active" : ""}
              onClick={() => setFilter(c)}
            >
              {CATEGORY_META[c].icon} {CATEGORY_META[c].label}s{" "}
              {list.words.filter((w) => categoryOf(w) === c).length}
            </button>
          ))}
        </div>
      )}

      {current && (
        <>
          <div className="card flashcard">
            <CategoryBadge entry={current} />
            {stage === "study" || peeking || stage === "checked" ? (
              <span className="flashcard-word">{current.word}</span>
            ) : (
              <span className="flashcard-word hidden-word">
                {"•".repeat(current.word.length)}
              </span>
            )}

            <TTSButton
              onSpeak={() => tts.sayWord(current)}
              speaking={tts.speaking}
              supported={tts.supported}
              label="Hear it"
            />

            {current.sentence && (
              <p className="flashcard-sentence">
                "
                {stage === "type" && !peeking
                  ? maskWord(current.sentence, current.word)
                  : current.sentence}
                "
              </p>
            )}
            {current.hint && <p className="hint-note">💡 {current.hint}</p>}
          </div>

          {stage === "type" && (
            <>
              <div className="answer-slots">
                {typed.length === 0 ? (
                  <span className="answer-placeholder">Type it from memory</span>
                ) : (
                  typed.split("").map((letter, i) => (
                    <span key={i} className="answer-letter">
                      {letter}
                    </span>
                  ))
                )}
              </div>
              <button
                className="btn btn-ghost peek-btn"
                onMouseDown={() => setPeeking(true)}
                onMouseUp={() => setPeeking(false)}
                onMouseLeave={() => setPeeking(false)}
                onTouchStart={() => setPeeking(true)}
                onTouchEnd={() => setPeeking(false)}
              >
                👀 Hold to peek
              </button>
              <OnScreenKeyboard
                onKey={(letter) => setTyped((t) => t + letter)}
                onBackspace={() => setTyped((t) => t.slice(0, -1))}
                onSubmit={check}
                submitLabel="CHECK"
                canSubmit={typed.length > 0}
              />
            </>
          )}

          {stage === "checked" && (
            <div className="result-panel">
              <h2 className={wasRight ? "result-title goal" : "result-title save"}>
                {wasRight ? "Spot on!" : "So close"}
              </h2>
              {!wasRight && (
                <>
                  <p className="muted">You typed</p>
                  <p className="result-typed">{typed || "—"}</p>
                </>
              )}
            </div>
          )}

          {stage === "study" && (
            <div className="mode-actions">
              <button
                className="btn btn-lg"
                onClick={() => {
                  setStage("type");
                  setPeeking(false);
                }}
              >
                Now I'll type it
              </button>
              <button className="btn btn-lg btn-ghost" onClick={next}>
                Skip to next word →
              </button>
            </div>
          )}

          {stage === "checked" && (
            <div className="mode-actions">
              <button className="btn btn-lg btn-accent" onClick={next}>
                Next word →
              </button>
            </div>
          )}
        </>
      )}
    </ModeShell>
  );
}
