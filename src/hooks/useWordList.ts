import { useEffect, useState } from "react";
import type { WeekList, WeekRef } from "../types";
import { loadWeekList } from "../data/wordLists";

interface State {
  list: WeekList | null;
  loading: boolean;
  error: string | null;
}

export function useWordList(week: WeekRef | null): State {
  const [state, setState] = useState<State>({
    list: null,
    loading: Boolean(week),
    error: null,
  });

  const file = week?.file ?? null;

  useEffect(() => {
    if (!file) {
      setState({ list: null, loading: false, error: null });
      return;
    }

    let active = true;
    setState({ list: null, loading: true, error: null });

    loadWeekList(file)
      .then((list) => {
        if (active) setState({ list, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (active) setState({ list: null, loading: false, error: err.message });
      });

    return () => {
      active = false;
    };
  }, [file]);

  return state;
}
