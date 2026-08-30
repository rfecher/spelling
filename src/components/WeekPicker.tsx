import type { WeekRef } from "../types";

interface Props {
  weeks: WeekRef[];
  current: WeekRef | null;
  onSelect: (id: string) => void;
}

export function WeekPicker({ weeks, current, onSelect }: Props) {
  if (weeks.length <= 1) {
    return <p className="week-single muted">{current?.label ?? "No words yet"}</p>;
  }

  return (
    <label className="week-picker">
      <span className="muted">Word list</span>
      <select
        value={current?.id ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {weeks.map((week) => (
          <option key={week.id} value={week.id}>
            {week.label}
          </option>
        ))}
      </select>
    </label>
  );
}
