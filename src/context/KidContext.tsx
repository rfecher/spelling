import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import type { KidConfig, Manifest, WeekRef } from "../types";
import { loadManifest } from "../data/manifest";
import { useProgress } from "../hooks/useProgress";

interface KidContextValue {
  kid: KidConfig;
  week: WeekRef | null;
  weeks: WeekRef[];
  setWeekId: (id: string) => void;
  progress: ReturnType<typeof useProgress>;
}

const KidCtx = createContext<KidContextValue | null>(null);

export function useKid(): KidContextValue {
  const ctx = useContext(KidCtx);
  if (!ctx) throw new Error("useKid must be used inside a kid route");
  return ctx;
}

const ManifestCtx = createContext<Manifest | null>(null);

export function useManifest(): Manifest {
  const ctx = useContext(ManifestCtx);
  if (!ctx) throw new Error("useManifest must be used inside ManifestProvider");
  return ctx;
}

export function ManifestProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadManifest()
      .then((data) => active && setManifest(data))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="boot-screen">
        <h1>Can't load the word lists</h1>
        <p>{error}</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="boot-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return <ManifestCtx.Provider value={manifest}>{children}</ManifestCtx.Provider>;
}

/** Layout route for /kid/:kidId — supplies the kid, their week, and progress. */
export function KidLayout() {
  const { kidId } = useParams<{ kidId: string }>();
  const manifest = useManifest();
  const kid = manifest.kids.find((k) => k.id === kidId);
  const weeks = useMemo(() => kid?.weeks ?? [], [kid]);

  // The newest week is the default; the picker can go back to earlier ones.
  const [weekId, setWeekId] = useState<string | null>(null);
  const progress = useProgress(kidId ?? "unknown");

  const week = useMemo(() => {
    if (weeks.length === 0) return null;
    return weeks.find((w) => w.id === weekId) ?? weeks[weeks.length - 1];
  }, [weeks, weekId]);

  const selectWeek = useCallback((id: string) => setWeekId(id), []);

  useEffect(() => {
    if (kidId) document.documentElement.setAttribute("data-kid", kidId);
    return () => document.documentElement.removeAttribute("data-kid");
  }, [kidId]);

  if (!kid) return <Navigate to="/" replace />;

  return (
    <KidCtx.Provider
      value={{ kid, week, weeks, setWeekId: selectWeek, progress }}
    >
      <Outlet />
    </KidCtx.Provider>
  );
}
