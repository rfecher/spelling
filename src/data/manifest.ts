import type { Manifest } from "../types";

const base = import.meta.env.BASE_URL;

let cached: Promise<Manifest> | null = null;

export function loadManifest(): Promise<Manifest> {
  if (!cached) {
    cached = fetch(`${base}words/manifest.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load word list index (${res.status})`);
        return res.json() as Promise<Manifest>;
      })
      .then((data) => {
        if (!Array.isArray(data?.kids)) {
          throw new Error("The word list index is missing its 'kids' list.");
        }
        return data;
      })
      .catch((err) => {
        cached = null; // let a retry re-fetch
        throw err;
      });
  }
  return cached;
}
