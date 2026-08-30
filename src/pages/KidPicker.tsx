import { useNavigate } from "react-router-dom";
import { useManifest } from "../context/KidContext";
import { VantorHeader } from "../components/VantorHeader";
import { initTTS } from "../lib/tts";
import "./KidPicker.css";

export function KidPicker() {
  const manifest = useManifest();
  const navigate = useNavigate();

  const choose = (kidId: string) => {
    // First tap of the session: unlocks speech on iPad and starts voice loading.
    initTTS();
    navigate(`/kid/${kidId}`);
  };

  return (
    <>
      <VantorHeader />
      <main className="page picker">
        <div className="picker-title">
          <p className="kicker">Spelling</p>
          <h1 className="display">Who's up next?</h1>
          <p className="muted">Pick your player to start training.</p>
        </div>

        <div className="kid-cards">
          {manifest.kids.map((kid) => (
            <button
              key={kid.id}
              className="kid-card"
              data-kid={kid.id}
              onClick={() => choose(kid.id)}
            >
              <span className="jersey" aria-hidden="true">
                <span className="jersey-number">
                  {kid.name.charAt(0).toUpperCase()}
                </span>
              </span>
              <span className="kid-card-name">{kid.name}</span>
              <span className="kid-card-meta">Grade {kid.grade}</span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
