"use client";

import { calculateReadingMetrics, type ReadingCadence, splitText } from "@clamly/anchor";
import { useEffect, useRef, useState } from "react";
import { averages, browserStorage, clearHistory, loadHistory, type Result, saveRun, wordsPerMinute } from "../lib/self-test";

interface Passage {
  id: string;
  title: string;
  text: string;
  question: string;
  options: string[];
  answer: number;
}

const PASSAGES: [Passage, Passage] = [
  {
    id: "tides",
    title: "Tides",
    text: "Ocean tides are caused mainly by the Moon. Its gravity pulls hardest on the side of the Earth that faces it, so the water there bulges outward. A second bulge forms on the opposite side, where the Moon's pull is weakest and the Earth is, in effect, pulled away from the water. As the planet turns, most coastlines pass through both bulges every day, which is why many places see two high tides and two low tides roughly every twenty-five hours. The Sun matters too, but less. When the Sun and Moon line up, at new and full moon, their pulls add together and produce especially large spring tides. When they sit at right angles, the pulls partly cancel and the tides are weaker; these are called neap tides. Local geography then shapes everything: narrow bays and long estuaries can funnel the water into tides many metres high, while some enclosed seas barely notice the tide at all.",
    question: "What produces especially large spring tides?",
    options: ["The Sun and the Moon lining up", "Strong winds in spring", "The Moon at right angles to the Sun"],
    answer: 0
  },
  {
    id: "bees",
    title: "Honeybees",
    text: "A honeybee that finds a good patch of flowers can tell her nestmates where it is without a map. Back in the hive she performs a waggle dance on the vertical surface of the comb. She runs forward in a straight line while shaking her body, loops back, and repeats the run again and again. The angle of the straight run, measured from vertical, matches the angle between the food and the direction of the Sun outside. The length of each run tells the others how far away the flowers are: the longer she waggles, the longer the flight. Other bees follow her closely, sensing the vibrations and the scent of the flowers she has visited. Because the Sun moves across the sky during the day, dancers adjust the angle as time passes, so the directions stay accurate. Researchers have used tiny radar tags to follow recruited bees and found that most of them fly close to the advertised spot.",
    question: "What does the length of the waggle run tell other bees?",
    options: ["How far away the flowers are", "How much nectar there is", "Where the Sun is"],
    answer: 0
  }
];

interface Trial {
  passage: Passage;
  anchored: boolean;
}

type Step =
  | { kind: "intro" }
  | { kind: "ready"; index: number }
  | { kind: "reading"; index: number; start: number }
  | { kind: "question"; index: number; elapsed: number }
  | { kind: "results" };

export function SelfTest() {
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [trials, setTrials] = useState<Trial[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [history, setHistory] = useState<Result[][]>([]);
  const [cadence, setCadence] = useState<ReadingCadence>("all");
  const [choice, setChoice] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => setHistory(loadHistory(browserStorage())), []);
  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect must run whenever the step changes, which is what step.kind tracks.
  useEffect(() => headingRef.current?.focus(), [step.kind]);

  const start = () => {
    // Random passage order and random assignment of anchors, so neither passage nor order favours one condition.
    const passages = Math.random() < 0.5 ? [...PASSAGES] : [PASSAGES[1], PASSAGES[0]];
    const anchoredFirst = Math.random() < 0.5;
    setTrials(passages.map((passage, index) => ({ passage, anchored: index === 0 ? anchoredFirst : !anchoredFirst })));
    setResults([]);
    setStep({ kind: "ready", index: 0 });
  };

  const finishReading = (index: number, startTime: number) => {
    setChoice(null);
    setStep({ kind: "question", index, elapsed: (performance.now() - startTime) / 1000 });
  };

  const answer = (index: number, elapsed: number) => {
    const trial = trials[index];
    if (!trial || choice === null) return;
    const words = calculateReadingMetrics(trial.passage.text).wordCount;
    const next = [
      ...results,
      { anchored: trial.anchored, wordsPerMinute: wordsPerMinute(words, elapsed), correct: choice === trial.passage.answer }
    ];
    setResults(next);
    if (index + 1 < trials.length) {
      setStep({ kind: "ready", index: index + 1 });
      return;
    }
    setHistory(saveRun(browserStorage(), history, next));
    setStep({ kind: "results" });
  };

  const clearResults = () => {
    setHistory([]);
    clearHistory(browserStorage());
  };

  if (step.kind === "intro") {
    return (
      <section className="self-test" aria-labelledby="self-test-step">
        <h2 id="self-test-step" ref={headingRef} tabIndex={-1}>
          How it works
        </h2>
        <ol>
          <li>You read two short passages, one with anchors and one without, in a random order.</li>
          <li>Press the button when you have finished each one, then answer a short question.</li>
          <li>You see your reading speed for both. Nothing leaves your browser.</li>
        </ol>
        <fieldset className="control-group">
          <legend className="control-label">Anchor style for the anchored passage</legend>
          <div className="segmented">
            {(["all", "saccade", "alternating"] as const).map((value) => (
              <label key={value}>
                <input type="radio" name="self-test-cadence" value={value} checked={cadence === value} onChange={() => setCadence(value)} />
                <span>{value === "all" ? "Every word" : value === "saccade" ? "Saccade" : "Alternating"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" className="button-primary" onClick={start}>
          Start
        </button>
        <History history={history} onClear={clearResults} />
      </section>
    );
  }

  if (step.kind === "results") {
    const anchored = results.find((result) => result.anchored);
    const plain = results.find((result) => !result.anchored);
    return (
      <section className="self-test" aria-labelledby="self-test-step">
        <h2 id="self-test-step" ref={headingRef} tabIndex={-1}>
          Your results
        </h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Passage</th>
              <th scope="col">Words per minute</th>
              <th scope="col">Answer</th>
            </tr>
          </thead>
          <tbody>
            {[plain, anchored].map((result) =>
              result ? (
                <tr key={String(result.anchored)}>
                  <th scope="row">{result.anchored ? "With anchors" : "Without anchors"}</th>
                  <td>{result.wordsPerMinute}</td>
                  <td>{result.correct ? "Correct" : "Incorrect"}</td>
                </tr>
              ) : null
            )}
          </tbody>
        </table>
        <p>
          One run says little: reading speed varies a lot between passages and from minute to minute, so differences of 10 to 20 percent are
          common by chance. Repeat the test on a few different days and look at the averages below. And speed is not everything: if anchored
          text simply feels more comfortable, that is a good reason to use it.
        </p>
        <button type="button" className="button-primary" onClick={start}>
          Run again
        </button>
        <History history={history} onClear={clearResults} />
      </section>
    );
  }

  const trial = trials[step.index];
  if (!trial) return null;
  const label = `Passage ${step.index + 1} of ${trials.length}`;

  if (step.kind === "ready") {
    return (
      <section className="self-test" aria-labelledby="self-test-step">
        <h2 id="self-test-step" ref={headingRef} tabIndex={-1}>
          {label}
        </h2>
        <p>
          This passage is shown {trial.anchored ? "with" : "without"} anchors. Read it at your normal pace, as you would read an article,
          then press the button below it.
        </p>
        <button
          type="button"
          className="button-primary"
          onClick={() => setStep({ kind: "reading", index: step.index, start: performance.now() })}
        >
          Show the passage
        </button>
      </section>
    );
  }

  if (step.kind === "reading") {
    const segments = trial.anchored ? splitText(trial.passage.text, { cadence }) : [{ value: trial.passage.text, bold: false }];
    let offset = 0;
    return (
      <section className="self-test" aria-labelledby="self-test-step">
        <h2 id="self-test-step" ref={headingRef} tabIndex={-1}>
          {trial.passage.title}
        </h2>
        <p className="self-test-passage" data-anchor="off">
          {segments.map((segment) => {
            const key = offset;
            offset += segment.value.length;
            return segment.bold ? <b key={key}>{segment.value}</b> : <span key={key}>{segment.value}</span>;
          })}
        </p>
        <button type="button" className="button-primary" onClick={() => finishReading(step.index, step.start)}>
          I have finished reading
        </button>
      </section>
    );
  }

  return (
    <section className="self-test" aria-labelledby="self-test-step">
      <h2 id="self-test-step" ref={headingRef} tabIndex={-1}>
        {label}: a quick check
      </h2>
      <fieldset className="control-group">
        <legend className="control-label">{trial.passage.question}</legend>
        <div className="answers">
          {trial.passage.options.map((option, index) => (
            <label key={option}>
              <input type="radio" name={`answer-${trial.passage.id}`} checked={choice === index} onChange={() => setChoice(index)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" className="button-primary" disabled={choice === null} onClick={() => answer(step.index, step.elapsed)}>
        {step.index + 1 < trials.length ? "Next passage" : "See results"}
      </button>
    </section>
  );
}

function History({ history, onClear }: { history: Result[][]; onClear: () => void }) {
  if (history.length === 0) return null;
  const { plain, anchored } = averages(history);
  return (
    <div className="self-test-history">
      <h3>
        Your averages over {history.length} {history.length === 1 ? "run" : "runs"}
      </h3>
      <p>
        Without anchors: <strong>{plain}</strong> words per minute. With anchors: <strong>{anchored}</strong> words per minute.
      </p>
      <button type="button" className="button-secondary" onClick={onClear}>
        Clear my results
      </button>
    </div>
  );
}
