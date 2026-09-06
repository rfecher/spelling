import { useCallback, useEffect, useState } from "react";
import { useKid } from "../../context/KidContext";
import { useWordList } from "../../hooks/useWordList";
import { useTTS } from "../../hooks/useTTS";
import { VantorHeader } from "../../components/VantorHeader";
import { TTSButton } from "../../components/TTSButton";
import { RoundSummary } from "../../components/RoundSummary";
import { ModeShell } from "../../components/ModeShell";
import { CategoryBadge } from "../../components/CategoryBadge";
import { pickWords } from "../../lib/weighting";
import { shuffle, sample } from "../../lib/shuffle";
import type { WordEntry } from "../../types";
import "./modes.css";

const ROUND_SIZE = 8;
const VOWELS = "aeiou";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

interface Puzzle {
  entry: WordEntry;
  blanks: number[];
  options: string[];
}

/** Blanks out 30–50% of a word, favouring vowels and doubled letters. */
function buildPuzzle(entry: WordEntry): Puzzle {
  const letters = entry.word.toLowerCase().split("");
  const target = Math.max(1, Math.min(5, Math.round(letters.length * 0.4)));

  const vowelIdx: number[] = [];
  const doubleIdx: number[] = [];
  const otherIdx: number[] = [];

  letters.forEach((ch, i) => {
    if (VOWELS.includes(ch)) vowelIdx.push(i);
    else if (letters[i - 1] === ch || letters[i + 1] === ch) doubleIdx.push(i);
    else otherIdx.push(i);
  });

  const priority = [
    ...shuffle(doubleIdx),
    ...shuffle(vowelIdx),
    ...shuffle(otherIdx),
  ];
  const blanks = priority.slice(0, target).sort((a, b) => a - b);

  const needed = Array.from(new Set(blanks.map((i) => letters[i])));
  const decoyPool = ALPHABET.split("").filter((c) => !needed.includes(c));
  const options = shuffle([...needed, ...sample(decoyPool, 3)]);

  return { entry, blanks, options };
}

export function MissingLetters() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [solved, setSolved] = useState(0);
  const [missed, setMissed] = useState(0);
  const [done, setDone] = useState(false);
  const [earned, setEarned] = useState<string[]>([]);

  const startRound = useCallback(() => {
    if (!list) return;
    const words = pickWords(list.words, progress.progress, ROUND_SIZE);
    setQueue(words);
    setIndex(0);
    setSolved(0);
    setMissed(0);
    setDone(false);
    setEarned([]);
    setFilled({});
    setFeedback("none");
    setPuzzle(words[0] ? buildPuzzle(words[0]) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const nextBlank = (): number | null => {
    if (!puzzle) return null;
    return puzzle.blanks.find((i) => !filled[i]) ?? null;
  };

  const chooseLetter = (letter: string) => {
    if (feedback !== "none") return;
    const slot = nextBlank();
    if (slot === null) return;
    setFilled((f) => ({ ...f, [slot]: letter }));
  };

  const clearSlot = (slot: number) => {
    if (feedback !== "none") return;
    setFilled((f) => {
      const copy = { ...f };
      delete copy[slot];
      return copy;
    });
  };

  const check = () => {
    if (!puzzle) return;
    const letters = puzzle.entry.word.toLowerCase().split("");
    const correct = puzzle.blanks.every((i) => filled[i] === letters[i]);
    setFeedback(correct ? "correct" : "wrong");

    const newly = progress.recordAttempt(puzzle.entry.word, correct, "missing");
    if (newly.length > 0) setEarned((prev) => [...prev, ...newly]);

    if (correct) setSolved((s) => s + 1);
    else setMissed((m) => m + 1);
  };

  const next = () => {
    if (index + 1 >= queue.length) {
      progress.completeRound();
      setDone(true);
      return;
    }
    const entry = queue[index + 1];
    setIndex((i) => i + 1);
    setPuzzle(buildPuzzle(entry));
    setFilled({});
    setFeedback("none");
  };

  const tryAgain = () => {
    if (!puzzle) return;
    setFilled({});
    setFeedback("none");
  };

  if (done) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <RoundSummary
          title={missed === 0 ? "Every gap filled!" : "Round complete"}
          goals={solved}
          saves={missed}
          total={queue.length}
          trophies={earned}
          onPlayAgain={startRound}
          kidId={kid.id}
          scoreNoun="solved"
        />
      </>
    );
  }

  const letters = puzzle?.entry.word.split("") ?? [];
  const allFilled = puzzle?.blanks.every((i) => Boolean(filled[i])) ?? false;

  return (
    <ModeShell
      kidId={kid.id}
      kidName={kid.name}
      loading={loading}
      error={error}
      ready={Boolean(puzzle)}
      title="Missing Letters"
      subtitle={`Word ${index + 1} of ${queue.length} · ✅ ${solved}`}
    >
      {puzzle && (
        <>
          <div className="prompt-area">
            <CategoryBadge entry={puzzle.entry} />
            <TTSButton
              onSpeak={() => tts.sayWord(puzzle.entry)}
              speaking={tts.speaking}
              supported={tts.supported}
              label="Hear the word"
            />
          </div>

          <div className="tile-slots">
            {letters.map((letter, i) => {
              const isBlank = puzzle.blanks.includes(i);
              if (!isBlank) {
                return (
                  <span key={i} className="tile fixed">
                    {letter}
                  </span>
                );
              }
              const value = filled[i];
              const correctHere =
                feedback !== "none" &&
                value === puzzle.entry.word[i].toLowerCase();
              return (
                <button
                  key={i}
                  className={`tile ${value ? "placed" : "blank"} ${
                    feedback === "none"
                      ? ""
                      : correctHere
                        ? "correct"
                        : "wrong"
                  }`}
                  onClick={() => clearSlot(i)}
                >
                  {value ?? "_"}
                </button>
              );
            })}
          </div>

          <div className="tile-bank">
            {puzzle.options.map((letter) => (
              <button
                key={letter}
                className="tile"
                onClick={() => chooseLetter(letter)}
                disabled={feedback !== "none" || nextBlank() === null}
              >
                {letter}
              </button>
            ))}
          </div>

          {feedback === "wrong" && (
            <>
              <p className="result-word reveal">
                {puzzle.entry.word.split("").map((letter, i) => (
                  <span
                    key={i}
                    className={
                      puzzle.blanks.includes(i) ? "letter missed" : "letter"
                    }
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {letter}
                  </span>
                ))}
              </p>
              {puzzle.entry.hint && (
                <p className="hint-note">💡 {puzzle.entry.hint}</p>
              )}
            </>
          )}

          <div className="mode-actions">
            {feedback === "none" && (
              <button className="btn btn-lg" onClick={check} disabled={!allFilled}>
                Check it
              </button>
            )}
            {feedback === "correct" && (
              <button className="btn btn-lg btn-accent" onClick={next}>
                Nice! Next word →
              </button>
            )}
            {feedback === "wrong" && (
              <>
                <button className="btn btn-lg" onClick={tryAgain}>
                  Try again
                </button>
                <button className="btn btn-lg btn-ghost" onClick={next}>
                  Next word →
                </button>
              </>
            )}
          </div>
        </>
      )}
    </ModeShell>
  );
}
