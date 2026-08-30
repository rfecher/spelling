import { useRouteError } from "react-router-dom";

/** A kid-friendly stand-in for React Router's developer error page. */
export function ErrorScreen() {
  const error = useRouteError();
  const detail =
    error instanceof Error ? error.message : "Something unexpected happened.";

  return (
    <div className="boot-screen">
      <h1 className="display">Match postponed ⚽</h1>
      <p className="muted">
        Something went wrong. Tap below to head back to the pitch.
      </p>
      <button
        className="btn"
        onClick={() => {
          window.location.hash = "#/";
          window.location.reload();
        }}
      >
        Back to the start
      </button>
      <p className="muted error-detail">{detail}</p>
    </div>
  );
}
