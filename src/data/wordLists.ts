import type { WeekList } from "../types";

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<WeekList>>();

export function loadWeekList(file: string): Promise<WeekList> {
  const existing = cache.get(file);
  if (existing) return existing;

  const request = fetch(`${base}words/${file}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load this week's words (${res.status})`);
      return res.json() as Promise<WeekList>;
    })
    .then((data) => {
      if (!Array.isArray(data?.words) || data.words.length === 0) {
        throw new Error(`${file} has no words in it.`);
      }
      return {
        ...data,
        words: data.words.filter((w) => typeof w?.word === "string" && w.word.trim()),
      };
    })
    .catch((err) => {
      cache.delete(file);
      throw err;
    });

  cache.set(file, request);
  return request;
}
