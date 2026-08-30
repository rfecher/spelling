import { useNavigate } from "react-router-dom";

interface Props {
  backTo?: string;
  kidName?: string;
  onBack?: () => void;
}

/**
 * Vantor lockup: logomark left of the wordmark, mark height matching the
 * wordmark cap height, gap about half the wordmark height. Cream on the dark
 * background — never the accent purple, per brand rules.
 */
export function VantorHeader({ backTo, kidName, onBack }: Props) {
  const navigate = useNavigate();
  const showBack = Boolean(backTo || onBack);

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
  };

  return (
    <header className="site-header">
      {showBack && (
        <button className="icon-btn" onClick={handleBack} aria-label="Back">
          ←
        </button>
      )}

      <div className="lockup">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2 3 L12 21 L22 3 L17.5 3 L12 12.8 L6.5 3 Z"
            fill="currentColor"
          />
        </svg>
        <span className="wordmark">Vantor</span>
      </div>

      <div className="header-spacer" />

      {kidName && (
        <span className="kid-badge">
          <span className="dot" />
          {kidName}
        </span>
      )}
    </header>
  );
}
