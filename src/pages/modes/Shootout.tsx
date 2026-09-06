import { useCallback, useEffect, useRef, useState } from "react";
import { useKid } from "../../context/KidContext";
import { useWordList } from "../../hooks/useWordList";
import { useTTS } from "../../hooks/useTTS";
import { useKickMeter } from "../../hooks/useKickMeter";
import { VantorHeader } from "../../components/VantorHeader";
import { TTSButton } from "../../components/TTSButton";
import { OnScreenKeyboard } from "../../components/OnScreenKeyboard";
import { GoalAnimation, type SceneState } from "../../components/GoalAnimation";
import { Scoreboard } from "../../components/Scoreboard";
import { CategoryBadge } from "../../components/CategoryBadge";
import { RoundSummary } from "../../components/RoundSummary";
import { pickWords } from "../../lib/weighting";
import { isCorrect, weekMastered } from "../../lib/progress";
import { categoryOf, challengeMastered, nextStreak } from "../../lib/categories";
import {
  flashLine,
  inZone,
  kickCopy,
  kickSetup,
  resolveKick,
  type KickOutcome,
  type KickSetup,
} from "../../lib/kick";
import type { WordCategory, WordEntry } from "../../types";
import "./modes.css";

const ROUND_SIZE = 10;
const GLOW_STREAK = 3;
/**
 * Reduced motion slows both gates. That also makes them slightly more
 * forgiving, which is the right trade: the setting is a signal that fast
 * moving targets are a barrier, not that the kid wants a harder game.
 */
const CALM_EASE = 1.25;
/** Swallows the double-tap that would otherwise fire the power stage at ~0. */
const TAP_LOCK_MS = 110;

/**
 * Per word: kickoff → typing → aim → power → result. Spelling is graded at
 * SHOOT!; the two timing gates that follow are the game layer whose difficulty
 * that grade sets.
 */
type Phase = "kickoff" | "typing" | "aim" | "power" | "result" | "summary";

interface Resolved {
  outcome: KickOutcome;
  scored: boolean;
  aimOk: boolean;
}

export function Shootout() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();
  const ease = kid.kickEase ?? 1;

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("kickoff");

  // Spelling — the learning stat.
  const [spelledRight, setSpelledRight] = useState(false);
  const [spelled, setSpelled] = useState(0);
  const [misspelled, setMisspelled] = useState(0);
  const [streak, setStreak] = useState(0);

  // Kick — the arcade stat.
  const [setup, setSetup] = useState<KickSetup | null>(null);
  const [kickX, setKickX] = useState<number | null>(null);
  const [kickPower, setKickPower] = useState<number | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [flash, setFlash] = useState("");
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);

  const [retryQueue, setRetryQueue] = useState<WordEntry[]>([]);
  const [inRetries, setInRetries] = useState(false);
  const [retryMisses, setRetryMisses] = useState(0);
  const [earnedTrophies, setEarnedTrophies] = useState<string[]>([]);

  // The phase STATE cannot gate re-entry: React batches, so two pointer events
  // in the same tick both read the old value. These refs are the real lock.
  const stageRef = useRef<Phase>("kickoff");
  const tapLockUntil = useRef(0);

  const goPhase = useCallback((next: Phase) => {
    stageRef.current = next;
    setPhase(next);
  }, []);

  const addTrophies = useCallback((ids: string[]) => {
    if (ids.length > 0) setEarnedTrophies((prev) => [...prev, ...ids]);
  }, []);

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
    setKickPower(null);
    setResolved(null);
    setGoals(0);
    setSaves(0);
    setRetryQueue([]);
    setInRetries(false);
    setRetryMisses(0);
    setEarnedTrophies([]);
    goPhase("kickoff");
    // progress is read once at round start on purpose: weighting shouldn't
    // shuffle mid-round as the kid answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, goPhase]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const current = queue[index];
  const totalKicks = queue.length;

  /**
   * The one place a kick can end. Sole caller of recordKick, the scoreline, the
   * haptics and the move to `result`, so no auto-fire or shortcut can ever
   * double-record.
   */
  const finishKick = useCallback(
    (aimX: number, power: number, held: boolean) => {
      if (!setup || stageRef.current === "result") return;
      stageRef.current = "result";

      const r = resolveKick(aimX, power, setup, held);
      setKickX(aimX);
      setKickPower(power);
      setResolved({ outcome: r.outcome, scored: r.scored, aimOk: r.aimOk });
      setFlash(flashLine(r.outcome));
      if (r.scored) setGoals((g) => g + 1);
      else setSaves((s) => s + 1);
      addTrophies(progress.recordKick(r.scored, setup.hard, r.outcome === "upper90"));
      // Android tablets buzz; iPad ignores this, so no outcome may live only here.
      navigator.vibrate?.(r.scored ? [30, 40, 60] : 90);
      setPhase("result");
    },
    [setup, progress, addTrophies],
  );

  const onBust = useCallback(() => {
    if (!setup || kickX == null) return;
    finishKick(kickX, 1.12, true);
  }, [setup, kickX, finishKick]);

  const meterStage =
    phase === "aim" ? "aim" : phase === "power" ? "power" : "idle";
  const meter = useKickMeter(meterStage, setup, onBust);

  const hearWord = useCallback(async () => {
    if (!current) return;
    if (phase === "kickoff") goPhase("typing");
    await tts.sayWord(current);
  }, [current, phase, tts, goPhase]);

  /** SHOOT! — grade the spelling, then set up the kick it earned. */
  const submit = useCallback(() => {
    if (!current || typed.length === 0) return;
    tts.stop();
    const correct = isCorrect(typed, current.word);
    // Challenge words are extra credit: double step when right, streak kept
    // when wrong (the kick is still hard). Regular and review words are plain.
    const streakAfter = nextStreak(streak, correct, categoryOf(current));

    addTrophies(progress.recordAttempt(current.word, correct, "shootout"));
    setSpelledRight(correct);
    setStreak(streakAfter);
    if (correct) {
      setSpelled((n) => n + 1);
    } else {
      setMisspelled((n) => n + 1);
      if (inRetries) setRetryMisses((n) => n + 1);
      else setRetryQueue((r) => [...r, current]);
    }

    // Read once per kick rather than subscribing: an OS toggle then applies
    // from the next word, with no listener and no stale closure.
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? CALM_EASE
      : 1;
    setSetup(kickSetup(correct, streakAfter, ease * calm));
    setKickX(null);
    setKickPower(null);
    setResolved(null);
    setFlash("");
    tapLockUntil.current = performance.now() + TAP_LOCK_MS;
    goPhase("aim");
  }, [current, typed, streak, progress, tts, inRetries, addTrophies, ease, goPhase]);

  /** One handler for both taps — which gate it closes depends on the stage. */
  const tap = useCallback(() => {
    const now = performance.now();
    if (now < tapLockUntil.current) return;

    if (stageRef.current === "aim") {
      if (!setup) return;
      const x = meter.readAim();
      setKickX(x);
      meter.setVar("--marker-x", x.toFixed(4));
      // A shot already off target cannot be rescued by power, so fire now
      // rather than making the kid sit through a meter that cannot help.
      if (!inZone(x, setup)) {
        finishKick(x, (setup.reach + setup.bar) / 2, false);
        return;
      }
      tapLockUntil.current = now + TAP_LOCK_MS;
      goPhase("power");
      return;
    }

    if (stageRef.current === "power") {
      if (kickX == null) return;
      finishKick(kickX, meter.readPower(), false);
    }
  }, [setup, meter, kickX, finishKick, goPhase]);

  const next = useCallback(() => {
    setTyped("");
    const atEnd = index + 1 >= queue.length;

    if (!atEnd) {
      setIndex((i) => i + 1);
      goPhase("kickoff");
      return;
    }

    if (!inRetries) {
      if (goals >= 5) addTrophies(progress.award("sharpshooter"));
      if (goals === queue.length && queue.length >= 5) {
        addTrophies(progress.award("golden-boot"));
      }
    }

    if (retryQueue.length > 0 && !inRetries) {
      setQueue(retryQueue);
      setRetryQueue([]);
      setInRetries(true);
      setRetryMisses(0);
      setIndex(0);
      goPhase("kickoff");
      return;
    }

    progress.completeRound();
    if (misspelled === 0 && spelled > 0) addTrophies(progress.award("perfect-round"));
    if (inRetries && retryMisses === 0) addTrophies(progress.award("comeback"));
    if (list && challengeMastered(progress.progress, list.words)) {
      addTrophies(progress.award("giant-killer"));
    }
    if (list && weekMastered(progress.progress, list.words)) {
      addTrophies(progress.award("week-mastered"));
    }
    goPhase("summary");
  }, [
    index, queue.length, retryQueue, inRetries, retryMisses,
    progress, goals, spelled, misspelled, list, addTrophies, goPhase,
  ]);

  if (loading) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page"><p className="muted">Loading this week's words…</p></main>
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page"><p className="error-text">{error ?? "No words available."}</p></main>
      </>
    );
  }

  if (!current && phase !== "summary") {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <main className="page"><p className="muted">Setting up the shootout…</p></main>
      </>
    );
  }

  if (phase === "summary") {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <RoundSummary
          title={misspelled === 0 ? "Clean sheet!" : "Full time"}
          spelledRight={spelled}
          spelledTotal={spelled + misspelled}
          goals={goals}
          saves={saves}
          celebrate={misspelled === 0}
          trophies={earnedTrophies}
          onPlayAgain={startRound}
          kidId={kid.id}
        />
      </>
    );
  }

  const sceneState: SceneState =
    phase === "aim" ? "aim"
    : phase === "power" ? "power"
    : phase === "result" && resolved ? resolved.outcome
    : "idle";

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
          ref={meter.sceneRef}
          state={sceneState}
          setup={setup}
          kickX={kickX}
          kickPower={kickPower}
          flash={flash}
          glow={streak >= GLOW_STREAK && phase !== "result"}
          onTap={tap}
        />

        {(phase === "aim" || phase === "power") && setup && (
          <KickPanel
            stage={phase}
            spelledRight={spelledRight}
            category={categoryOf(current)}
            word={current.word}
            setup={setup}
            onTap={tap}
          />
        )}

        {phase === "result" && resolved && (
          <ResultPanel
            resolved={resolved}
            spelledRight={spelledRight}
            category={categoryOf(current)}
            streak={streak}
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
              <CategoryBadge entry={current} />
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
                <button className="link-btn" onClick={() => tts.say(current.sentence!)}>
                  Hear it in a sentence
                </button>
              )}
            </div>

            <div className="answer-slots" aria-live="polite">
              {typed.length === 0 ? (
                <span className="answer-placeholder">Spell the word</span>
              ) : (
                typed.split("").map((letter, i) => (
                  <span key={i} className="answer-letter">{letter}</span>
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

interface KickPanelProps {
  stage: "aim" | "power";
  spelledRight: boolean;
  category: WordCategory;
  word: string;
  setup: KickSetup;
  onTap: () => void;
}

/**
 * One panel across both gates, and one button that never remounts — remounting
 * it between stages would drop keyboard focus and kill the Enter/Space path for
 * the second tap.
 */
function KickPanel({ stage, spelledRight, category, word, setup, onTap }: KickPanelProps) {
  const coaching =
    stage === "aim"
      ? setup.hard
        ? "Hard kick: tiny target, fast sweep. Stop the line in the zone."
        : setup.bonusLevel > 0
          ? `Streak bonus ×${setup.bonusLevel}: bigger target, slower sweep.`
          : "Stop the line inside the zone."
      : "Now the power — over the keeper, under the bar!";

  return (
    <div className="aim-panel">
      {/* The word stays on screen through both gates. On a miss that is the one
          place extra kick ceremony genuinely helps the spelling. */}
      <CategoryBadge category={category} size="sm" />
      <p className={spelledRight ? "verdict right" : "verdict wrong"}>
        {spelledRight ? "✓ Spelled it right!" : <>✗ Not quite — it's <strong>{word}</strong></>}
      </p>
      {category === "challenge" && spelledRight && (
        <p className="challenge-note">⭐ Challenge bonus: double streak step!</p>
      )}
      <p className={setup.hard ? "coaching hard" : "coaching"}>{coaching}</p>
      <button
        className={`btn btn-lg btn-accent kick-btn ${stage}`}
        onPointerDown={onTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTap();
          }
        }}
      >
        {stage === "aim" ? "AIM" : "KICK!"}
      </button>
    </div>
  );
}

interface ResultProps {
  resolved: Resolved;
  spelledRight: boolean;
  category: WordCategory;
  streak: number;
  typed: string;
  word: string;
  hint?: string;
  onNext: () => void;
  isLast: boolean;
}

function ResultPanel({
  resolved, spelledRight, category, streak, typed, word, hint, onNext, isLast,
}: ResultProps) {
  const copy = kickCopy(resolved.outcome, resolved.aimOk);
  // Showing the consequence BEFORE the next kick is what links spelling to the
  // reward; felt afterwards, a kid doesn't connect the two.
  let preview: string;
  if (spelledRight) {
    preview =
      category === "challenge"
        ? `Challenge bonus! Streak ×${streak} — your next target gets much bigger.`
        : `Streak ×${streak} — your next target gets bigger.`;
  } else if (category === "challenge") {
    preview = `Challenge word — your streak (×${streak}) is safe. It comes back for a bonus kick.`;
  } else {
    preview = "Streak reset. Next kick is a hard one — spell it right to get your target back.";
  }

  return (
    <div className="result-panel">
      {spelledRight ? (
        <>
          <h2 className={resolved.scored ? "result-title goal" : "result-title save"}>
            {copy.title}
          </h2>
          <p className="verdict right">✓ Spelled it right</p>
          <p className="result-word">{word}</p>
          <p className="muted cause-line">{copy.cause}</p>
        </>
      ) : (
        /* On a misspelling the word comes first and the kick is demoted: with
           six kick outcomes, leading with the kick teaches the wrong thing. */
        <>
          <p className="muted">You spelled</p>
          <p className="result-typed">{typed || "—"}</p>
          <p className="muted">The word is</p>
          <p className="result-word reveal">
            {word.split("").map((letter, i) => {
              const wrong = typed[i]?.toLowerCase() !== letter.toLowerCase();
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
          <p className={`kick-subline ${resolved.scored ? "goal" : ""}`}>
            {copy.title} — {copy.cause}
          </p>
        </>
      )}

      <p className="streak-preview">{preview}</p>

      <button className="btn btn-lg" onClick={onNext}>
        {isLast ? "See results" : "Next kick →"}
      </button>
    </div>
  );
}
