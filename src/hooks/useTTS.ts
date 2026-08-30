import { useCallback, useEffect, useState } from "react";
import type { WordEntry } from "../types";
import {
  cancelSpeech,
  onVoicesReady,
  speak,
  speakWord,
  ttsSupported,
  voicesReady,
} from "../lib/tts";

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [ready, setReady] = useState(() => voicesReady());
  const supported = ttsSupported();

  useEffect(() => onVoicesReady(setReady), []);

  useEffect(() => () => cancelSpeech(), []);

  const say = useCallback(
    async (text: string) => {
      if (!supported) return;
      setSpeaking(true);
      try {
        await speak(text);
      } finally {
        setSpeaking(false);
      }
    },
    [supported],
  );

  const sayWord = useCallback(
    async (entry: WordEntry, opts?: { withSentence?: boolean }) => {
      if (!supported) return;
      setSpeaking(true);
      try {
        await speakWord(entry, opts);
      } finally {
        setSpeaking(false);
      }
    },
    [supported],
  );

  const stop = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
  }, []);

  return { say, sayWord, stop, speaking, ready, supported };
}
