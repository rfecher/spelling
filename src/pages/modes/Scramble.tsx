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
import { scrambleTiles, type Tile } from "../../lib/shuffle";
import type { WordEntry } from "../../types";
import "./modes.css";

const ROUND_SIZE = 8;

export function Scramble() {
  const { kid, week, progress } = useKid();
  const { list, loading, error } = useWordList(week);
  const tts = useTTS();

  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [bank, setBank] = useState<Tile[]>([]);
  const [placed, setPlaced] = useState<Tile[]>([]);
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
    setFeedback("none");
    setPlaced([]);
    setBank(words[0] ? scrambleTiles(words[0].word) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const current = queue[index];

  const loadWord = useCallback((entry: WordEntry) => {
    setBank(scrambleTiles(entry.word));
    setPlaced([]);
    setFeedback("none");
  }, []);

  const place = (tile: Tile) => {
    if (feedback !== "none") return;
    setPlaced((p) => [...p, tile]);
  };

  const unplace = (tile: Tile) => {
    if (feedback !== "none") return;
    setPlaced((p) => p.filter((t) => t.id !== tile.id));
  };

  const check = () => {
    if (!current) return;
    const answer = placed.map((t) => t.letter).join("").toLowerCase();
    const correct = answer === current.word.toLowerCase();
    setFeedback(correct ? "correct" : "wrong");

    const newly = progress.recordAttempt(current.word, correct, "scramble");
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
    const nextEntry = queue[index + 1];
    setIndex((i) => i + 1);
    loadWord(nextEntry);
  };

  const tryAgain = () => {
    if (!current) return;
    loadWord(current);
  };

  if (done) {
    return (
      <>
        <VantorHeader backTo={`/kid/${kid.id}`} kidName={kid.name} />
        <RoundSummary
          title={missed === 0 ? "Perfect unscramble!" : "Round complete"}
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

  return (
    <ModeShell
      kidId={kid.id}
      kidName={kid.name}
      loading={loading}
      error={error}
      ready={Boolean(current)}
      title="Word Scramble"
      subtitle={`Word ${index + 1} of ${queue.length} · ✅ ${solved}`}
    >
      {current && (
        <>
          <div className="prompt-area">
            <CategoryBadge entry={current} />
            <TTSButton
              onSpeak={() => tts.sayWord(current, { withSentence: false })}
              speaking={tts.speaking}
              supported={tts.supported}
              label="Hear the word"
            />
          </div>

          <div className="tile-slots">
            {placed.length === 0 ? (
              <span className="answer-placeholder">Tap letters to build the word</span>
            ) : (
              placed.map((tile) => (
                <button
                  key={tile.id}
                  className={`tile placed ${
                    feedback === "correct" ? "correct" : feedback === "wrong" ? "wrong" : ""
                  }`}
                  onClick={() => unplace(tile)}
                >
                  {tile.letter}
                </button>
              ))
            )}
          </div>

          <div className="tile-bank">
            {bank.map((tile) => {
              const used = placed.some((t) => t.id === tile.id);
              return (
                <button
                  key={tile.id}
                  className={`tile ${used ? "used" : ""}`}
                  onClick={() => place(tile)}
                  disabled={used || feedback !== "none"}
                >
                  {tile.letter}
                </button>
              );
            })}
          </div>

          {feedback === "wrong" && current.hint && (
            <p className="hint-note">💡 {current.hint}</p>
          )}
          {feedback === "wrong" && (
            <p className="result-word reveal">
              {current.word.split("").map((letter, i) => (
                <span key={i} className="letter" style={{ animationDelay: `${i * 50}ms` }}>
                  {letter}
                </span>
              ))}
            </p>
          )}

          <div className="mode-actions">
            {feedback === "none" && (
              <button
                className="btn btn-lg"
                onClick={check}
                disabled={placed.length !== current.word.length}
              >
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
