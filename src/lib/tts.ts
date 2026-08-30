import type { WordEntry } from "../types";

let cachedVoice: SpeechSynthesisVoice | null = null;
let unlocked = false;
const readyListeners = new Set<(ok: boolean) => void>();

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Prefer a natural-sounding en-US voice; these names cover iOS and Android.
  const preferred = [
    "Samantha",
    "Google US English",
    "Karen",
    "Aaron",
    "Nicky",
    "Alex",
  ];
  for (const name of preferred) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0]
  );
}

function refreshVoice() {
  const voice = pickVoice();
  if (voice) {
    cachedVoice = voice;
    readyListeners.forEach((cb) => cb(true));
  }
}

/**
 * Must be called from inside a user gesture (a tap). Safari refuses to speak
 * otherwise, and both Safari and Chrome load their voice list asynchronously.
 */
export function initTTS(): void {
  if (!ttsSupported() || unlocked) return;
  unlocked = true;

  refreshVoice();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoice);

  // A silent utterance inside the gesture unlocks the audio channel on iOS.
  const primer = new SpeechSynthesisUtterance(" ");
  primer.volume = 0;
  try {
    window.speechSynthesis.speak(primer);
  } catch {
    /* speech stays unavailable; callers fall back to on-screen hints */
  }
}

export function onVoicesReady(cb: (ok: boolean) => void): () => void {
  readyListeners.add(cb);
  if (cachedVoice) cb(true);
  return () => readyListeners.delete(cb);
}

export function voicesReady(): boolean {
  return cachedVoice !== null;
}

export function cancelSpeech(): void {
  if (!ttsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* nothing to cancel */
  }
}

export function speak(text: string, rate = 0.85): Promise<void> {
  if (!ttsSupported() || !text.trim()) return Promise.resolve();

  return new Promise((resolve) => {
    // Safari wedges its queue if utterances stack up.
    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    if (!cachedVoice) refreshVoice();
    if (cachedVoice) utterance.voice = cachedVoice;
    utterance.lang = cachedVoice?.lang ?? "en-US";
    utterance.rate = rate;
    utterance.pitch = 1;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety net: if the engine never fires onend, don't leave the UI waiting.
    const guard = window.setTimeout(finish, 1000 + text.length * 120);
    const clearGuard = () => window.clearTimeout(guard);
    utterance.addEventListener("end", clearGuard);
    utterance.addEventListener("error", clearGuard);

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Says the word, pauses, then the example sentence for context. */
export async function speakWord(
  entry: WordEntry,
  opts: { withSentence?: boolean } = {},
): Promise<void> {
  const { withSentence = true } = opts;
  await speak(entry.word, 0.8);
  if (withSentence && entry.sentence) {
    await delay(320);
    await speak(entry.sentence, 0.9);
  }
}
