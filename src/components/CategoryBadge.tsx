import type { WordCategory, WordEntry } from "../types";
import { CATEGORY_META, categoryOf } from "../lib/categories";

interface Props {
  entry?: WordEntry;
  category?: WordCategory;
  /** Regular words are the default; hide the badge for them unless asked. */
  showRegular?: boolean;
  size?: "sm" | "md";
}

/** The label the test puts on a word, so the kid knows what's coming. */
export function CategoryBadge({ entry, category, showRegular = false, size = "md" }: Props) {
  const cat = category ?? (entry ? categoryOf(entry) : "regular");
  if (cat === "regular" && !showRegular) return null;
  const meta = CATEGORY_META[cat];
  return (
    <span className={`cat-badge ${cat} ${size}`} title={meta.blurb}>
      <span aria-hidden="true">{meta.icon}</span> {meta.label}
    </span>
  );
}
