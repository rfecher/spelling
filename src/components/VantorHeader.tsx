import { useNavigate } from "react-router-dom";

interface Props {
  backTo?: string;
  kidName?: string;
  onBack?: () => void;
}

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
