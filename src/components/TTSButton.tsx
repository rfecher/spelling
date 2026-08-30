interface Props {
  onSpeak: () => void;
  speaking: boolean;
  supported: boolean;
  label?: string;
}

export function TTSButton({ onSpeak, speaking, supported, label }: Props) {
  if (!supported) return null;

  return (
    <button
      className={`tts-btn ${speaking ? "speaking" : ""}`}
      onClick={onSpeak}
      aria-label={label ?? "Hear the word"}
    >
      <span className="tts-icon" aria-hidden="true">
        🔊
      </span>
      <span className="tts-label">{label ?? "Hear the word"}</span>
    </button>
  );
}
