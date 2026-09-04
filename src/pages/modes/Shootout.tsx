import { useCallback, useEffect, useState } from "react";
import { useKid } from "../../context/KidContext";
import { useWordList } from "../../hooks/useWordList";
import { useTTS } from "../../hooks/useTTS";
import { useKickSweep } from "../../hooks/useKickSweep";
import { VantorHeader } from "../../components/VantorHeader";
import { TTSButton } from "../../components/TTSButton";
import { OnScreenKeyboard } from "../../components/OnScreenKeyboard";
import { GoalAnimation } from "../../components/GoalAnimation";
import { Scoreboard } from "../../components/Scoreboard";
import { RoundSummary } from "../../components/RoundSummary";
import { pickWords } from "../../lib/weighting";
import { isCorrect, weekMastered } from "../../lib/progress";
import { flashLine, inZone, kickSetup, type KickSetup } from "../../lib/kick";
import type { WordEntry } from "../../types";
import "./modes.css";

const ROUND_SIZE = 10;
const GLOW_STREAK = 3;

/**
 * kickoff → typing → aim → result, per word. Spelling is graded at SHOOT!;
 * the aim phase is the game layer where that grade sets the kick difficulty.
 */
type Phase = "kickoff" | "typing" | "aim" | "result" | "summary";

export function Shootout() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("kickoff");

  // Spelling (the learning stat)
  const [spelledRight, setSpelledRight] = useState(false);
  const [spelled, setSpelled] = useState(0);
  const [misspelled, setMisspelled] = useState(0);
  const [streak, setStreak] = useState(0);

  // Kicks (the game stat)
  const [setup, setSetup] = useState<KickSetup | null>(null);
  const [kickX, setKickX] = useState<number | null>(null);
  const [scored, setScored] = useState(false);
  const [flash, setFlash] = useState("GOAL!");
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);

  const [retryQueue, setRetryQueue] = useState<WordEntry[]>([]);
  const [inRetries, setInRetries] = useState(false);
  const [retryMisses, setRetryMisses] = useState(0);
  const [earnedTrophies, setEarnedTrophies] = useState<string[]>([]);

  const sweep = useKickSweep(phase === "aim", setup?.roundTripMs ?? 2800);

  const startRound = useCallback(() => {
    if (!list) return;
    setQueue(pickWords(list.words, progress.progress, ROUND_SIZE));
    setIndex(0);
    setTyped("");
    setSpelled(0);
    setMisspelled(0);
    setStreak(0);
    setSetup(null);
    setKickX(null);
    setGoals(0);
    setSaves(0);
    setRetryQueue([]);
    setInRetries(false);
    setRetryMisses(0);
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

  const addTrophies = useCallback((ids: string[]) => {
    if (ids.length > 0) setEarnedTrophies((prev) => [...prev, ...ids]);
  }, []);

  const hearWord = useCallback(async () => {
    if (!current) return;
    if (phase === "kickoff") setPhase("typing");
    await tts.sayWord(current);
  }, [current, phase, tts]);

  /** SHOOT! — grade the spelling and set up the kick it earned. */
  const submit = useCallback(() => {
    if (!current || typed.length === 0) return;
    tts.stop();
    const correct = isCorrect(typed, current.word);
    const nextStreak = correct ? streak + 1 : 0;

    addTrophies(progress.recordAttempt(current.word, correct, "shootout"));
    setSpelledRight(correct);
    setStreak(nextStreak);
    if (correct) {
      setSpelled((n) => n + 1);
    } else {
      setMisspelled((n) => n + 1);
      // Missed words get one more kick at the end of the round.
      if (inRetries) setRetryMisses((n) => n + 1);
      else setRetryQueue((r) => [...r, current]);
    }

    setSetup(kickSetup(correct, nextStreak));
    setKickX(null);
    setPhase("aim");
  }, [current, typed, streak, progress, tts, inRetries, addTrophies]);

  /** KICK! — freeze the line and see if it's in the zone. */
  const kick = useCallback(() => {
    if (phase !== "aim" || !setup) return;
    const x = sweep.read();
    const goal = inZone(x, setup);
    setKickX(x);
    setScored(goal);
    setFlash(flashLine(goal));
    if (goal) setGoals((g) => g + 1);
    else setSaves((s) => s + 1);
    addTrophies(progress.recordKick(goal, setup.hard));
    // Android tablets buzz; iPad ignores this.
    navigator.vibrate?.(goal ? [30, 40, 60] : 90);
    setPhase("result");
  }, [phase, setup, sweep, progress, addTrophies]);

  const next = useCallback(() => {
    setTyped("");
    const atEnd = index + 1 >= queue.length;

    if (!atEnd) {
      setIndex((i) => i + 1);
      setPhase("kickoff");
      return;
    }

    if (!inRetries && goals === queue.length && queue.length >= 5) {
      addTrophies(progress.award("golden-boot"));
    }

    if (retryQueue.length > 0 && !inRetries) {
      setQueue(retryQueue);
      setRetryQueue([]);
      setInRetries(true);
      setRetryMisses(0);
      setIndex(0);
      setPhase("kickoff");
      return;
    }

    progress.completeRound();
    if (misspelled === 0 && spelled > 0) addTrophies(progress.award("perfect-round"));
    if (inRetries && retryMisses === 0) addTrophies(progress.award("comeback"));
    if (list && weekMastered(progress.progress, list.words)) {
      addTrophies(progress.award("week-mastered"));
    }
    setPhase("summary");
  }, [
    index,
    queue.length,
    retryQueue,
    inRetries,
    retryMisses,
    progress,
    goals,
    spelled,
    misspelled,
    list,
    addTrophies,
  ]);

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
          title={misspelled === 0 ? "Clean sheet!" : "Full time"}
          goals={goals}
          saves={saves}
          total={goals + saves}
          spelling={{ right: spelled, total: spelled + misspelled }}
          celebrate={misspelled === 0}
          trophies={earnedTrophies}
          onPlayAgain={startRound}
          kidId={kid.id}
        />
      </>
    );
  }

  const sceneState =
    phase === "aim" ? "aim" : phase === "result" ? (scored ? "goal" : "save") : "idle";

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
          ref={sweep.sceneRef}
          state={sceneState}
          setup={setup}
          kickX={kickX}
          flash={flash}
          glow={streak >= GLOW_STREAK && phase !== "result"}
          onTap={kick}
        />

        {phase === "aim" && setup && (
          <AimPanel
            spelledRight={spelledRight}
            word={current.word}
            setup={setup}
            onKick={kick}
          />
        )}

        {phase === "result" && (
          <ResultPanel
            scored={scored}
            spelledRight={spelledRight}
            hard={setup?.hard ?? false}
            typed={typed}
            word={current.word}
            hint={current.hint}
            onNext={next}
            isLast={index + 1 >= queue.length && (inRetries || retryQueue.length === 0)}
          />
        )}

        {(phase === "kickoff" || phase === "typing") && (
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

interface AimProps {
  spelledRight: boolean;
  word: string;
  setup: KickSetup;
  onKick: () => void;
}

function AimPanel({ spelledRight, word, setup, onKick }: AimProps) {
  let coaching: string;
  if (setup.hard) {
    coaching = "Hard kick: tiny target, quick keeper. Time it perfectly!";
  } else if (setup.bonusLevel > 0) {
    coaching = `Streak bonus ×${setup.bonusLevel}: bigger target, slower keeper!`;
  } else {
    coaching = "Easy kick: tap when the line is in the zone.";
  }

  return (
    <div className="aim-panel">
      <p className={spelledRight ? "verdict right" : "verdict wrong"}>
        {spelledRight ? (
          "✓ Spelled it right!"
        ) : (
          <>
            ✗ Not quite — it's <strong>{word}</strong>
          </>
        )}
      </p>
      <p className={setup.hard ? "coaching hard" : "coaching"}>{coaching}</p>
      <button
        className="btn btn-lg btn-accent kick-btn"
        onPointerDown={onKick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onKick();
          }
        }}
      >
        KICK!
      </button>
    </div>
  );
}

interface ResultProps {
  scored: boolean;
  spelledRight: boolean;
  hard: boolean;
  typed: string;
  word: string;
  hint?: string;
  onNext: () => void;
  isLast: boolean;
}

function ResultPanel({
  scored,
  spelledRight,
  hard,
  typed,
  word,
  hint,
  onNext,
  isLast,
}: ResultProps) {
  return (
    <div className="result-panel">
      <h2 className={scored ? "result-title goal" : "result-title save"}>
        {scored ? (hard ? "Top bins!" : "GOAL!") : "Saved!"}
      </h2>

      {spelledRight ? (
        <>
          <p className="verdict right">✓ Spelled it right</p>
          <p className="result-word">{word}</p>
          {!scored && <p className="muted">Great spelling — the keeper just guessed right.</p>}
        </>
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
          <p className="muted">Spell it right next time for an easier kick.</p>
        </>
      )}

      <button className="btn btn-lg" onClick={onNext}>
        {isLast ? "See results" : "Next kick →"}
      </button>
    </div>
  );
}
