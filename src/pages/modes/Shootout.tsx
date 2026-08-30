import { useCallback, useEffect, useState } from "react";
import { useKid } from "../../context/KidContext";
import { useWordList } from "../../hooks/useWordList";
import { useTTS } from "../../hooks/useTTS";
import { VantorHeader } from "../../components/VantorHeader";
import { TTSButton } from "../../components/TTSButton";
import { OnScreenKeyboard } from "../../components/OnScreenKeyboard";
import { GoalAnimation } from "../../components/GoalAnimation";
import { Scoreboard } from "../../components/Scoreboard";
import { RoundSummary } from "../../components/RoundSummary";
import { pickWords } from "../../lib/weighting";
import { isCorrect, weekMastered } from "../../lib/progress";
import type { WordEntry } from "../../types";
import "./modes.css";

const ROUND_SIZE = 10;

type Phase = "kickoff" | "typing" | "result" | "summary";

export function Shootout() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("kickoff");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [retryQueue, setRetryQueue] = useState<WordEntry[]>([]);
  const [inRetries, setInRetries] = useState(false);
  const [earnedTrophies, setEarnedTrophies] = useState<string[]>([]);

  const startRound = useCallback(() => {
    if (!list) return;
    setQueue(pickWords(list.words, progress.progress, ROUND_SIZE));
    setIndex(0);
    setTyped("");
    setGoals(0);
    setSaves(0);
    setStreak(0);
    setRetryQueue([]);
    setInRetries(false);
    setEarnedTrophies([]);
    setPhase("kickoff");
    // progress is read once at round start on purpose: weighting shouldn't
    // shuffle mid-round as the kid answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const current = queue[index];
  const totalKicks = queue.length;

  const hearWord = useCallback(async () => {
    if (!current) return;
    if (phase === "kickoff") setPhase("typing");
    await tts.sayWord(current);
  }, [current, phase, tts]);

  const submit = useCallback(() => {
    if (!current || typed.length === 0) return;
    tts.stop();
    const correct = isCorrect(typed, current.word);
    setLastCorrect(correct);

    const newly = progress.recordAttempt(current.word, correct, "shootout");
    if (newly.length > 0) setEarnedTrophies((prev) => [...prev, ...newly]);

    if (correct) {
      setGoals((g) => g + 1);
      setStreak((s) => s + 1);
    } else {
      setSaves((s) => s + 1);
      setStreak(0);
      // Missed words get one more kick at the end of the round.
      if (!inRetries) setRetryQueue((r) => [...r, current]);
    }
    setPhase("result");
  }, [current, typed, progress, tts, inRetries]);

  const next = useCallback(() => {
    setTyped("");
    const atEnd = index + 1 >= queue.length;

    if (!atEnd) {
      setIndex((i) => i + 1);
      setPhase("kickoff");
      return;
    }

    if (retryQueue.length > 0 && !inRetries) {
      setQueue(retryQueue);
      setRetryQueue([]);
      setInRetries(true);
      setIndex(0);
      setPhase("kickoff");
      return;
    }

    progress.completeRound();
    if (saves === 0 && goals > 0 && !inRetries) {
      const newly = progress.award("perfect-round");
      if (newly.length > 0) setEarnedTrophies((prev) => [...prev, ...newly]);
    }
    if (list && weekMastered(progress.progress, list.words)) {
      const newly = progress.award("week-mastered");
      if (newly.length > 0) setEarnedTrophies((prev) => [...prev, ...newly]);
    }
    setPhase("summary");
  }, [index, queue.length, retryQueue, inRetries, progress, saves, goals, list]);

  if (loading) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page">
          <p className="muted">Loading this week's words…</p>
        </main>
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page">
          <p className="error-text">{error ?? "No words available."}</p>
        </main>
      </>
    );
  }

  if (!current && phase !== "summary") {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page">
          <p className="muted">Setting up the shootout…</p>
        </main>
      </>
    );
  }

  if (phase === "summary") {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <RoundSummary
          title={saves === 0 ? "Clean sheet!" : "Full time"}
          goals={goals}
          saves={saves}
          total={goals + saves}
          trophies={earnedTrophies}
          onPlayAgain={startRound}
          kidId={kid.id}
        />
      </>
    );
  }

  return (
    <>
      <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
      <main className="page mode-page">
        <Scoreboard
          goals={goals}
          saves={saves}
          streak={streak}
          kick={index + 1}
          total={totalKicks}
          label={inRetries ? "Bonus kicks" : "Penalty shootout"}
        />

        <GoalAnimation
          state={phase === "result" ? (lastCorrect ? "goal" : "save") : "idle"}
        />

        {phase === "result" ? (
          <ResultPanel
            correct={lastCorrect}
            typed={typed}
            word={current.word}
            hint={current.hint}
            onNext={next}
            isLast={index + 1 >= queue.length && (inRetries || retryQueue.length === 0)}
          />
        ) : (
          <>
            <div className="prompt-area">
              <TTSButton
                onSpeak={hearWord}
                speaking={tts.speaking}
                supported={tts.supported}
                label={phase === "kickoff" ? "Hear your word" : "Hear it again"}
              />
              {!tts.supported && (
                <p className="muted fallback-hint">
                  Speech isn't available on this browser — here's the word:{" "}
                  <strong>{current.word}</strong>
                </p>
              )}
              {current.sentence && phase !== "kickoff" && (
                <button
                  className="link-btn"
                  onClick={() => tts.say(current.sentence!)}
                >
                  Hear it in a sentence
                </button>
              )}
            </div>

            <div className="answer-slots" aria-live="polite">
              {typed.length === 0 ? (
                <span className="answer-placeholder">Spell the word</span>
              ) : (
                typed.split("").map((letter, i) => (
                  <span key={i} className="answer-letter">
                    {letter}
                  </span>
                ))
              )}
            </div>

            <OnScreenKeyboard
              onKey={(letter) => setTyped((t) => t + letter)}
              onBackspace={() => setTyped((t) => t.slice(0, -1))}
              onSubmit={submit}
              submitLabel="SHOOT!"
              canSubmit={typed.length > 0}
            />
          </>
        )}
      </main>
    </>
  );
}

interface ResultProps {
  correct: boolean;
  typed: string;
  word: string;
  hint?: string;
  onNext: () => void;
  isLast: boolean;
}

function ResultPanel({ correct, typed, word, hint, onNext, isLast }: ResultProps) {
  return (
    <div className="result-panel">
      <h2 className={correct ? "result-title goal" : "result-title save"}>
        {correct ? "GOAL!" : "Saved!"}
      </h2>

      {correct ? (
        <p className="result-word">{word}</p>
      ) : (
        <>
          <p className="muted">You spelled</p>
          <p className="result-typed">{typed || "—"}</p>
          <p className="muted">The word is</p>
          <p className="result-word reveal">
            {word.split("").map((letter, i) => {
              const kidLetter = typed[i]?.toLowerCase();
              const wrong = kidLetter !== letter.toLowerCase();
              return (
                <span
                  key={i}
                  className={wrong ? "letter missed" : "letter"}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {letter}
                </span>
              );
            })}
          </p>
          {hint && <p className="hint-note">💡 {hint}</p>}
        </>
      )}

      <button className="btn btn-lg" onClick={onNext}>
        {isLast ? "See results" : "Next kick →"}
      </button>
    </div>
  );
}
