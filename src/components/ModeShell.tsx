import type { ReactNode } from "react";
import { VantorHeader } from "./VantorHeader";

interface Props {
  kidId: string;
  kidName: string;
  loading: boolean;
  error: string | null;
  ready: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Header + loading/error handling shared by the non-shootout modes. */
export function ModeShell({
  kidId,
  kidName,
  loading,
  error,
  ready,
  title,
  subtitle,
  children,
}: Props) {
  return (
    <>
      <VantorHeader backTo={`/kid/${kidId}`} kidName={kidName} />
      <main className="page mode-page">
        <div className="mode-heading">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>

        {loading && <p className="muted">Loading this week's words…</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && !ready && (
          <p className="muted">Getting your words ready…</p>
        )}
        {ready && children}
      </main>
    </>
  );
}
