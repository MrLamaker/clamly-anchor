import { describe, expect, it } from "vitest";
import { averages, clearHistory, loadHistory, MAX_RUNS, type Result, STORAGE_KEY, saveRun, wordsPerMinute } from "../lib/self-test";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value)
  };
}

const run = (plain: number, anchored: number): Result[] => [
  { anchored: false, wordsPerMinute: plain, correct: true },
  { anchored: true, wordsPerMinute: anchored, correct: false }
];

describe("wordsPerMinute", () => {
  it("converts words and seconds to words per minute", () => {
    expect(wordsPerMinute(150, 60)).toBe(150);
    expect(wordsPerMinute(160, 40)).toBe(240);
    expect(wordsPerMinute(100, 0)).toBe(0);
  });
});

describe("loadHistory", () => {
  it("reads stored runs", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify([run(200, 210)]) });
    expect(loadHistory(storage)).toEqual([run(200, 210)]);
  });

  it("drops what it cannot trust instead of showing NaN", () => {
    const stored = [run(200, 210), [{ anchored: "yes", wordsPerMinute: 1, correct: true }], [], "x", [{ anchored: true, correct: true }]];
    expect(loadHistory(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual([run(200, 210)]);
    expect(loadHistory(memoryStorage({ [STORAGE_KEY]: "{not json" }))).toEqual([]);
    expect(loadHistory(memoryStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([]);
    expect(loadHistory(undefined)).toEqual([]);
  });
});

describe("saveRun", () => {
  it("stores runs and keeps only the most recent ones", () => {
    const storage = memoryStorage();
    let history: Result[][] = [];
    for (let index = 0; index < MAX_RUNS + 5; index += 1) history = saveRun(storage, history, run(index, index));
    expect(history).toHaveLength(MAX_RUNS);
    expect(history[0]).toEqual(run(5, 5));
    expect(loadHistory(storage)).toEqual(history);
  });

  it("still returns the results when the browser refuses to store them", () => {
    const refusing: Storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
    };
    expect(saveRun(refusing, [], run(1, 2))).toEqual([run(1, 2)]);
    expect(saveRun(undefined, [], run(1, 2))).toEqual([run(1, 2)]);
  });

  it("forgets everything when cleared", () => {
    const storage = memoryStorage();
    saveRun(storage, [], run(1, 2));
    clearHistory(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("averages", () => {
  it("averages each condition over every run", () => {
    expect(averages([run(200, 220), run(240, 230)])).toEqual({ plain: 220, anchored: 225 });
    expect(averages([])).toEqual({ plain: 0, anchored: 0 });
  });
});
