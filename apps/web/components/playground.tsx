"use client";

import { calculateReadingMetrics, processText, type ReadingCadence, splitText } from "@clamly/anchor";
import Link from "next/link";
import { type CSSProperties, useMemo, useState } from "react";

interface TextSample {
  id: string;
  title: string;
  lang: string;
  text: string;
}

const FIRST_SAMPLE: TextSample = {
  id: "notes",
  title: "Study notes",
  lang: "en",
  text: "Photosynthesis converts light energy into chemical energy. In the first stage, chlorophyll absorbs light and splits water molecules, releasing oxygen. In the second stage, the Calvin cycle uses that stored energy to build sugars from carbon dioxide. Most of the oxygen in the air we breathe was produced this way."
};

const SAMPLES: TextSample[] = [
  FIRST_SAMPLE,
  {
    id: "technical",
    title: "Technical",
    lang: "en",
    text: "Distributed consensus algorithms must tolerate network partitions and lost packets while keeping every replica consistent. Event-driven pipelines avoid thread contention, but they make failures harder to trace across services."
  },
  {
    id: "prose",
    title: "Prose",
    lang: "en",
    text: "The quiet library stood at the edge of the harbor, where winter fog rolled between old brick warehouses. Inside, dust drifted through shafts of pale afternoon light, across rows of books that smelled of cedar and dried lavender."
  },
  {
    id: "de",
    title: "Deutsch",
    lang: "de",
    text: "Lesen ist eine Fähigkeit, die wir jeden Tag nutzen. Lange Texte mit vielen Fachbegriffen verlangen jedoch viel Konzentration, besonders am Bildschirm."
  },
  {
    id: "ro",
    title: "Română",
    lang: "ro",
    text: "Cititul este o abilitate pe care o folosim în fiecare zi. Textele lungi, cu mulți termeni de specialitate, cer însă multă concentrare, mai ales pe ecran."
  },
  {
    id: "hi",
    title: "हिन्दी",
    lang: "hi",
    text: "पढ़ना एक ऐसा कौशल है जिसका हम हर दिन उपयोग करते हैं। लंबे पाठ के लिए अधिक ध्यान की आवश्यकता होती है।"
  }
];

const CADENCES: Array<{ value: ReadingCadence; label: string; hint: string }> = [
  { value: "all", label: "Every word", hint: "Anchors every eligible word." },
  { value: "saccade", label: "Saccade", hint: "Leaves short function words such as “the” and “of” unanchored, in the text's language." },
  { value: "alternating", label: "Alternating", hint: "Anchors every other word in a paragraph, for a lighter page." }
];

const FONTS = { sans: "font-sans", serif: "font-serif", mono: "font-mono" } as const;
const FONT_LABELS: Record<keyof typeof FONTS, string> = { sans: "Sans", serif: "Serif", mono: "Mono" };

export function Playground() {
  const [sampleId, setSampleId] = useState(FIRST_SAMPLE.id);
  const [text, setText] = useState(FIRST_SAMPLE.text);
  const [lang, setLang] = useState(FIRST_SAMPLE.lang);
  const [fixationStrength, setFixationStrength] = useState(45);
  const [minimumWordLength, setMinimumWordLength] = useState(1);
  const [cadence, setCadence] = useState<ReadingCadence>("all");
  const [position, setPosition] = useState(50);
  const [font, setFont] = useState<keyof typeof FONTS>("sans");
  const [status, setStatus] = useState("");

  const options = useMemo(
    () => ({ fixationStrength, minimumWordLength, cadence, locale: lang }),
    [fixationStrength, minimumWordLength, cadence, lang]
  );
  const segments = useMemo(() => splitText(text, options), [text, options]);
  const metrics = useMemo(() => calculateReadingMetrics(text, options), [text, options]);

  const choose = (sample: TextSample) => {
    setSampleId(sample.id);
    setText(sample.text);
    setLang(sample.lang);
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied`);
    } catch {
      setStatus("Copying is not allowed in this browser");
    }
    setTimeout(() => setStatus(""), 2500);
  };

  return (
    <section id="playground" aria-labelledby="playground-title" className="workspace" data-anchor="off">
      <div className="workspace-toolbar">
        <fieldset className="sample-list">
          <legend className="sr-only">Sample texts</legend>
          {SAMPLES.map((sample) => (
            <button key={sample.id} type="button" lang={sample.lang} aria-pressed={sampleId === sample.id} onClick={() => choose(sample)}>
              {sample.title}
            </button>
          ))}
        </fieldset>
        <div className="toolbar-actions">
          <button type="button" onClick={() => copy(processText(text, options), "HTML")}>
            Copy HTML
          </button>
          <span role="status" className="toolbar-status">
            {status}
          </span>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="workspace-controls">
          <h2 id="playground-title" className="section-title">
            Playground
          </h2>
          <label htmlFor="source-text" className="control-label">
            Your text
          </label>
          <textarea
            id="source-text"
            value={text}
            lang={lang}
            rows={8}
            spellCheck
            onChange={(event) => {
              setSampleId("");
              setText(event.target.value);
            }}
            placeholder="Paste any text to see it anchored."
          />
          <p className="control-hint">Everything runs in your browser. Nothing you type is sent anywhere.</p>

          <fieldset className="control-group">
            <legend className="control-label">Cadence</legend>
            <div className="segmented">
              {CADENCES.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="cadence"
                    value={option.value}
                    checked={cadence === option.value}
                    onChange={() => setCadence(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <p className="control-hint">{CADENCES.find((option) => option.value === cadence)?.hint}</p>
          </fieldset>

          <RangeControl
            id="fixation-strength"
            label="Fixation strength"
            value={fixationStrength}
            valueLabel={`${fixationStrength}%`}
            min={0}
            max={80}
            onChange={setFixationStrength}
            hint="How much of each word is bold."
          />
          <RangeControl
            id="minimum-word-length"
            label="Minimum word length"
            value={minimumWordLength}
            valueLabel={`${minimumWordLength} ${minimumWordLength === 1 ? "letter" : "letters"}`}
            min={1}
            max={8}
            onChange={setMinimumWordLength}
            hint="Shorter words stay as they are."
          />

          <fieldset className="control-group">
            <legend className="control-label">Preview font</legend>
            <div className="segmented">
              {(Object.keys(FONTS) as Array<keyof typeof FONTS>).map((key) => (
                <label key={key}>
                  <input type="radio" name="font" value={key} checked={font === key} onChange={() => setFont(key)} />
                  <span className={FONTS[key]}>{FONT_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="workspace-preview">
          <h3 className="section-title">Before and after</h3>
          <p className="control-hint">
            Drag the divider to compare. The preview uses the highlight style most browsers get, which never changes line breaks.
          </p>
          <Comparison
            text={text}
            lang={lang}
            segments={segments}
            position={position}
            fontClass={FONTS[font]}
            onPositionChange={setPosition}
          />
          <dl className="metrics">
            <div>
              <dt>Words</dt>
              <dd>{metrics.wordCount}</dd>
            </div>
            <div>
              <dt>Anchored words</dt>
              <dd>
                {metrics.fixationCount} <small>({metrics.fixationDensityPercentage}%)</small>
              </dd>
            </div>
            <div>
              <dt>Reading time</dt>
              <dd>
                ~{metrics.estimatedReadingTimeSeconds}s <small>at {metrics.wordsPerMinute} words/min</small>
              </dd>
            </div>
          </dl>
          <p className="control-hint">
            Anchors are a reading preference: published studies have not found that they make reading faster.{" "}
            <Link href="/self-test">Measure your own reading</Link> to see what works for you.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Pairs each segment with its position in the text, a stable key across edits. */
function withOffsets(segments: ReturnType<typeof splitText>): Array<{ segment: ReturnType<typeof splitText>[number]; start: number }> {
  let offset = 0;
  return segments.map((segment) => {
    const start = offset;
    offset += segment.value.length;
    return { segment, start };
  });
}

interface ComparisonProps {
  text: string;
  lang: string;
  segments: ReturnType<typeof splitText>;
  position: number;
  fontClass: string;
  onPositionChange: (value: number) => void;
}

/** Two layers with identical layout; the slider reveals the original on the left. */
function Comparison({ text, lang, segments, position, fontClass, onPositionChange }: ComparisonProps) {
  const style = { "--comparison-position": `${position}%` } as CSSProperties;
  if (text.length === 0) return <p className="comparison-empty">Type or paste some text to see it anchored.</p>;
  return (
    <div className="comparison-shell" style={style}>
      <div className="comparison-stage">
        <span className="comparison-label comparison-label-before" aria-hidden="true">
          Original
        </span>
        <span className="comparison-label comparison-label-after" aria-hidden="true">
          Anchored
        </span>
        <div lang={lang} className={`comparison-text comparison-after ${fontClass}`}>
          {withOffsets(segments).map(({ segment, start }) =>
            segment.bold ? <b key={start}>{segment.value}</b> : <span key={start}>{segment.value}</span>
          )}
        </div>
        <div className="comparison-before" aria-hidden="true">
          <div lang={lang} className={`comparison-text ${fontClass}`}>
            {text}
          </div>
        </div>
        <div className="comparison-divider" aria-hidden="true">
          <span>↔</span>
        </div>
        <label className="sr-only" htmlFor="comparison-slider">
          Share of the original text shown
        </label>
        <input
          id="comparison-slider"
          className="comparison-range"
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => onPositionChange(Number(event.target.value))}
          aria-valuetext={`${position}% original`}
        />
      </div>
    </div>
  );
}

interface RangeControlProps {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  hint: string;
  onChange: (value: number) => void;
}

function RangeControl({ id, label, value, valueLabel, min, max, hint, onChange }: RangeControlProps) {
  return (
    <div className="control-group">
      <div className="control-row">
        <label htmlFor={id} className="control-label">
          {label}
        </label>
        <output htmlFor={id}>{valueLabel}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="anchor-range"
      />
      <p className="control-hint">{hint}</p>
    </div>
  );
}
