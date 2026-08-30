export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface Tile {
  id: number;
  letter: string;
}

/** Letter tiles carry an id so duplicate letters ("bamboo") stay distinct. */
export function toTiles(letters: string[]): Tile[] {
  return letters.map((letter, id) => ({ id, letter }));
}

/** Shuffles a word's letters, retrying so the answer isn't handed over. */
export function scrambleTiles(word: string): Tile[] {
  const letters = word.toUpperCase().split("");
  if (letters.length < 2) return toTiles(letters);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = shuffle(toTiles(letters));
    if (candidate.map((t) => t.letter).join("") !== letters.join("")) {
      return candidate;
    }
  }
  // Degenerate case (e.g. "aaa"): any order reads the same anyway.
  return toTiles(letters);
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function sample<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}
