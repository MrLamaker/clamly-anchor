export interface Result {
  anchored: boolean;
  wordsPerMinute: number;
  correct: boolean;
}

export const STORAGE_KEY = "clamly-anchor-self-test";

/** How many runs the browser keeps; older ones are dropped. */
export const MAX_RUNS = 20;

/** The browser's local storage, or undefined where it is blocked (some privacy modes throw on access). */
export function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function wordsPerMinute(words: number, seconds: number): number {
  return seconds > 0 ? Math.round((words / seconds) * 60) : 0;
}

function isResult(value: unknown): value is Result {
  if (typeof value !== "object" || value === null) return false;
  const { anchored, wordsPerMinute: speed, correct } = value as Record<string, unknown>;
  return typeof anchored === "boolean" && typeof correct === "boolean" && typeof speed === "number" && Number.isFinite(speed);
}

/** Past runs. Stored data is checked, not trusted: anything malformed is dropped. */
export function loadHistory(storage: Storage | undefined): Result[][] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((run): run is Result[] => Array.isArray(run) && run.length > 0 && run.every(isResult)).slice(-MAX_RUNS);
  } catch {
    return [];
  }
}

/** Adds a run, keeps the most recent ones, and stores them where the browser allows it. */
export function saveRun(storage: Storage | undefined, history: Result[][], run: Result[]): Result[][] {
  const next = [...history, run].slice(-MAX_RUNS);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is full or blocked: the results are simply not kept.
  }
  return next;
}

export function clearHistory(storage: Storage | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored.
  }
}

/** Average words per minute with and without anchors over all runs. */
export function averages(history: Result[][]): { plain: number; anchored: number } {
  const all = history.flat();
  const average = (values: number[]): number =>
    values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    plain: average(all.filter((result) => !result.anchored).map((result) => result.wordsPerMinute)),
    anchored: average(all.filter((result) => result.anchored).map((result) => result.wordsPerMinute))
  };
}
