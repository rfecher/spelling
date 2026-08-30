const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

interface Props {
  onKey: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitLabel: string;
  canSubmit: boolean;
}

/**
 * A custom keyboard, not the tablet's own: the native one offers autocorrect
 * and spell-check, which would hand the kid the answer.
 */
export function OnScreenKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  submitLabel,
  canSubmit,
}: Props) {
  return (
    <div className="keyboard">
      {ROWS.map((row, i) => (
        <div className="key-row" key={i}>
          {row.split("").map((letter) => (
            <button
              key={letter}
              className="key"
              onClick={() => onKey(letter.toLowerCase())}
            >
              {letter}
            </button>
          ))}
          {i === 2 && (
            <button
              className="key key-wide"
              onClick={onBackspace}
              aria-label="Delete last letter"
            >
              ⌫
            </button>
          )}
        </div>
      ))}

      <button
        className="key key-submit"
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        {submitLabel}
      </button>
    </div>
  );
}
