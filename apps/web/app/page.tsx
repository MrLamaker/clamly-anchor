"use client";

import { calculateReadingMetrics, splitText, type ReadingCadence } from "@clamly/anchor";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

interface TextSample {
  id: string;
  title: string;
  category: string;
  text: string;
}

const SAMPLES: TextSample[] = [
  {
    id: "cognitive",
    title: "Cognitive Science",
    category: "Academic",
    text: `During silent reading, human eyes do not glide continuously across a line of text. Instead, they execute rapid, ballistic jumps called saccades, pausing at fixation points for roughly 200 to 250 milliseconds to extract linguistic meaning. For neurodivergent readers with ADHD or dyslexia, irregular regressions and visual crowding frequently interrupt comprehension. By anchoring the initial characters of key words, Anchor provides pre-computed visual waypoints that reduce oculomotor strain and facilitate effortless reading cadence.`
  },
  {
    id: "attention",
    title: "ADHD & Attention",
    category: "Reflective Essay",
    text: `The ADHD mind is not deficient in attention; rather, it struggles with regulating focus across visually uniform stimuli. When confronted with an unbroken wall of identical text, every word demands equal cognitive energy. Visual anchors introduce subtle visual topography to the page, creating gentle stepping stones that keep wandering attention grounded and allow deep immersion without mental exhaustion.`
  },
  {
    id: "systems",
    title: "System Architecture",
    category: "Technical",
    text: `Distributed consensus algorithms must tolerate arbitrary network partitions and asymmetric packet loss while maintaining linearizable state consistency. In high-throughput architectures, asynchronous event-driven pipelines eliminate thread contention and optimize memory utilization across concurrent database replicas without cascading failure modes.`
  },
  {
    id: "literature",
    title: "The Harbor Library",
    category: "Prose",
    text: `The quiet library stood at the edge of the harbor, where winter fog rolled between ancient brick warehouses. Inside, dust motes drifted lazily through shafts of pale afternoon light, illuminating rows of vellum-bound volumes that smelled of cedarwood, dried lavender, and forgotten centuries.`
  }
];

export default function PlaygroundPage() {
  const [selectedSample, setSelectedSample] = useState<string>(SAMPLES[0].id);
  const [text, setText] = useState<string>(SAMPLES[0].text);
  const [fixationStrength, setFixationStrength] = useState<number>(45);
  const [minimumWordLength, setMinimumWordLength] = useState<number>(1);
  const [cadence, setCadence] = useState<ReadingCadence>("saccade");
  const [comparisonPosition, setComparisonPosition] = useState<number>(50);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("sans");
  const [focusRulerActive, setFocusRulerActive] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const segments = useMemo(
    () => splitText(text, { fixationStrength, minimumWordLength, cadence }),
    [text, fixationStrength, minimumWordLength, cadence]
  );

  const metrics = useMemo(
    () => calculateReadingMetrics(text, { fixationStrength, minimumWordLength, cadence }),
    [text, fixationStrength, minimumWordLength, cadence]
  );

  const handleSelectSample = (sample: TextSample) => {
    setSelectedSample(sample.id);
    setText(sample.text);
  };

  const handleCopyFormatted = async () => {
    const html = segments.map((s) => (s.bold ? `<b>${s.value}</b>` : s.value)).join("");
    try {
      await navigator.clipboard.writeText(html);
      setCopyStatus("Copied HTML!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Clipboard failed");
    }
  };

  const handleCopyPlain = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied text!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch {
      setCopyStatus("Clipboard failed");
    }
  };

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  return (
    <main className="min-h-screen bg-[#F2F0E3] px-6 py-10 text-[#41413F] sm:px-10 lg:px-14 lg:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Navigation Header */}
        <header className="site-header mb-12">
          <a href="https://clamly.app" className="brand-lockup" aria-label="Clamly home">
            <span>clamly</span>
          </a>
          <span className="project-label">Anchor <span aria-hidden="true">/</span> Open Source Suite</span>
        </header>

        {/* Hero Section */}
        <div className="intro mb-12">
          <p className="eyebrow">A Clamly Cognitive Accessibility Tool</p>
          <h1>Find your reading rhythm in dense text.</h1>
          <p className="mt-3 max-w-2xl text-base text-[#6E6B5C] leading-relaxed">
            Anchor creates artificial fixation points that guide your eyes along natural saccadic trajectories.
            Words and layout remain completely preserved - only the ease with which your brain navigates them changes.
          </p>
        </div>

        {/* Workspace Card - Spacious Split-Screen */}
        <section aria-label="Clamly Anchor Reader Studio" className="workspace rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] shadow-sm mb-14 overflow-hidden">
          {/* Sample Switcher Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D6D3C0] bg-[#F5F2E6] px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E6B5C] mr-1">Samples:</span>
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    selectedSample === sample.id
                      ? "bg-[#41413F] text-[#FAF8F0] shadow-xs"
                      : "bg-[#FAF8F0] text-[#41413F] hover:bg-[#EAE6D6] border border-[#D6D3C0]"
                  }`}
                >
                  {sample.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFormatted}
                className="rounded-lg border border-[#D6D3C0] bg-[#FAF8F0] px-3.5 py-1.5 text-xs font-semibold text-[#41413F] transition hover:border-[#8DA2FB] cursor-pointer"
                title="Copy formatted text with bold HTML tags"
              >
                {copyStatus === "Copied HTML!" ? "✓ Copied HTML" : "Copy Formatted"}
              </button>
              <button
                type="button"
                onClick={handleCopyPlain}
                className="rounded-lg border border-[#D6D3C0] bg-[#FAF8F0] px-3.5 py-1.5 text-xs font-semibold text-[#41413F] transition hover:border-[#8DA2FB] cursor-pointer"
              >
                {copyStatus === "Copied text!" ? "✓ Copied" : "Copy Text"}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#D6D3C0]">
            {/* Left: Source Text & Parameter Controls */}
            <div className="p-6 sm:p-8 lg:p-10 space-y-8">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label htmlFor="source-text" className="section-title text-base font-bold text-[#41413F]">
                    Source Material
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setText("")}
                      className="text-xs font-semibold text-[#6E6B5C] hover:text-[#41413F] cursor-pointer"
                      disabled={!text}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSample(SAMPLES[0])}
                      className="text-xs font-semibold text-[#8DA2FB] hover:underline cursor-pointer"
                    >
                      Reset Sample
                    </button>
                  </div>
                </div>

                <textarea
                  id="source-text"
                  value={text}
                  onChange={(event) => {
                    setSelectedSample("");
                    setText(event.target.value);
                  }}
                  spellCheck
                  rows={9}
                  className="w-full resize-y rounded-xl border border-[#D6D3C0] bg-[#FFFEFA] p-5 text-base leading-relaxed outline-none transition focus:border-[#8DA2FB] focus:ring-4 focus:ring-[#8DA2FB]/25"
                  placeholder="Paste any article, document, or narrative here..."
                />
                <p className="mt-2 text-xs text-[#6E6B5C]">
                  All processing is computed locally in your browser. No text is ever uploaded or stored.
                </p>
              </div>

              {/* Parameter Controls with ample breathing room */}
              <div className="space-y-7 border-t border-[#D6D3C0] pt-7">
                {/* Cadence Rhythm Mode */}
                <div>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <span className="font-semibold text-sm text-[#41413F]">Cadence Strategy</span>
                    <span className="text-xs text-[#6E6B5C]">
                      {cadence === "saccade" && "Smart semantic anchors (recommended)"}
                      {cadence === "all" && "Dense anchors on all words"}
                      {cadence === "alternating" && "Airy alternating rhythm"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCadence("saccade")}
                      className={`rounded-xl py-2.5 text-xs font-semibold transition border cursor-pointer ${
                        cadence === "saccade"
                          ? "bg-[#8DA2FB] border-[#8DA2FB] text-white shadow-xs"
                          : "bg-[#FAF8F0] border-[#D6D3C0] text-[#41413F] hover:bg-[#EAE6D6]"
                      }`}
                    >
                      Saccade
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadence("all")}
                      className={`rounded-xl py-2.5 text-xs font-semibold transition border cursor-pointer ${
                        cadence === "all"
                          ? "bg-[#8DA2FB] border-[#8DA2FB] text-white shadow-xs"
                          : "bg-[#FAF8F0] border-[#D6D3C0] text-[#41413F] hover:bg-[#EAE6D6]"
                      }`}
                    >
                      Every Word
                    </button>
                    <button
                      type="button"
                      onClick={() => setCadence("alternating")}
                      className={`rounded-xl py-2.5 text-xs font-semibold transition border cursor-pointer ${
                        cadence === "alternating"
                          ? "bg-[#8DA2FB] border-[#8DA2FB] text-white shadow-xs"
                          : "bg-[#FAF8F0] border-[#D6D3C0] text-[#41413F] hover:bg-[#EAE6D6]"
                      }`}
                    >
                      Alternating
                    </button>
                  </div>
                </div>

                {/* Fixation Strength */}
                <RangeControl
                  id="fixation-strength"
                  label="Fixation Strength"
                  value={fixationStrength}
                  valueLabel={`${fixationStrength}%`}
                  min={0}
                  max={80}
                  onChange={setFixationStrength}
                  hint="How much of each eligible word is visually emphasized."
                />

                {/* Minimum Word Length */}
                <RangeControl
                  id="minimum-word-length"
                  label="Minimum Word Length"
                  value={minimumWordLength}
                  valueLabel={`${minimumWordLength} ${minimumWordLength === 1 ? "letter" : "letters"}`}
                  min={1}
                  max={8}
                  onChange={setMinimumWordLength}
                  hint="Words shorter than this count remain unstyled."
                />

                {/* Focus Ruler Guide Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-[#D6D3C0] bg-[#FFFEFA] p-4">
                  <div>
                    <label htmlFor="focus-ruler-toggle" className="font-semibold text-sm cursor-pointer block text-[#41413F]">
                      Reading Focus Ruler
                    </label>
                    <p className="mt-0.5 text-xs text-[#6E6B5C]">
                      Translucent visual horizontal guide that moves with your cursor.
                    </p>
                  </div>
                  <input
                    id="focus-ruler-toggle"
                    type="checkbox"
                    checked={focusRulerActive}
                    onChange={(e) => setFocusRulerActive(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#8DA2FB] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Comparison Preview Stage */}
            <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title text-base font-bold text-[#41413F]">Reading Comparison</h2>
                    <p className="mt-0.5 text-xs text-[#6E6B5C]">
                      Slide the divider to reveal raw vs. anchored reading.
                    </p>
                  </div>

                  {/* Font Selector */}
                  <div className="flex items-center gap-1 rounded-xl border border-[#D6D3C0] bg-[#FFFEFA] p-1">
                    <button
                      type="button"
                      onClick={() => setFontFamily("sans")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        fontFamily === "sans" ? "bg-[#41413F] text-white" : "text-[#6E6B5C] hover:text-[#41413F]"
                      }`}
                    >
                      Sans
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontFamily("serif")}
                      className={`rounded-lg px-3 py-1 text-xs font-serif font-semibold transition cursor-pointer ${
                        fontFamily === "serif" ? "bg-[#41413F] text-white" : "text-[#6E6B5C] hover:text-[#41413F]"
                      }`}
                    >
                      Serif
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontFamily("mono")}
                      className={`rounded-lg px-3 py-1 text-xs font-mono font-semibold transition cursor-pointer ${
                        fontFamily === "mono" ? "bg-[#41413F] text-white" : "text-[#6E6B5C] hover:text-[#41413F]"
                      }`}
                    >
                      Mono
                    </button>
                  </div>
                </div>

                <ComparisonPreview
                  text={text}
                  segments={segments}
                  position={comparisonPosition}
                  fontClass={fontClass}
                  focusRulerActive={focusRulerActive}
                  onPositionChange={setComparisonPosition}
                />
              </div>

              <div className="mt-6 flex items-center justify-between text-xs text-[#6E6B5C]">
                <span>Left: Raw unstyled text</span>
                <span>Right: Anchored visual waypoints</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Reading Diagnostics placed below the main workspace */}
        <section aria-label="Reading Diagnostics" className="mb-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6B5C]">Reading Diagnostics</h2>
            <span className="text-xs text-[#6E6B5C]">Live cognitive metrics for current passage</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-5 sm:p-6 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6B5C]">Word Count</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#41413F]">{metrics.wordCount}</span>
                <span className="text-xs text-[#6E6B5C]">{metrics.characterCount} chars</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-5 sm:p-6 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6B5C]">Active Fixations</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#8DA2FB]">{metrics.fixationCount}</span>
                <span className="text-xs text-[#6E6B5C]">{metrics.fixationDensityPercentage}% density</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-5 sm:p-6 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6B5C]">Estimated Pace</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#81B29A]">{metrics.estimatedWordsPerMinute}</span>
                <span className="text-xs text-[#6E6B5C]">WPM (+22%)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-5 sm:p-6 shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6B5C]">Estimated Time</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#41413F]">{metrics.anchoredReadingTimeSeconds}s</span>
                <span className="text-xs text-[#81B29A] font-semibold">save ~{metrics.estimatedSecondsSaved}s</span>
              </div>
            </div>
          </div>
        </section>

        {/* Cognitive Science & Accessibility Explainer with generous spacing */}
        <section aria-label="How Clamly Anchor Works" className="mt-20 mb-16 space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <p className="eyebrow">Cognitive Accessibility Principles</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#41413F] sm:text-3xl">
              Engineered for genuine reading comfort.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-7 sm:p-8 shadow-xs">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#8DA2FB]/20 font-bold text-[#41413F]">
                1
              </div>
              <h3 className="font-bold text-base text-[#41413F]">Oculomotor Guidance</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6E6B5C]">
                During reading, the eye relies on parafoveal previews to target its next saccade. Bold anchors eliminate fixation ambiguity, accelerating word recognition before the fovea lands fully.
              </p>
            </div>

            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-7 sm:p-8 shadow-xs">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#81B29A]/20 font-bold text-[#41413F]">
                2
              </div>
              <h3 className="font-bold text-base text-[#41413F]">Prevents Visual Crowding</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6E6B5C]">
                Neurodivergent readers often suffer from visual crowding where letters merge into uniform blocks. Smart cadence modes provide high-contrast landmarks that break up visual fatigue.
              </p>
            </div>

            <div className="rounded-2xl border border-[#D6D3C0] bg-[#FAF8F0] p-7 sm:p-8 shadow-xs">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6D3C0]/40 font-bold text-[#41413F]">
                3
              </div>
              <h3 className="font-bold text-base text-[#41413F]">Accessibility & Privacy First</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6E6B5C]">
                Never breaks screen readers. Anchor uses presentational <code>&lt;b&gt;</code> tags and <code>display: contents</code> wrapper spans rather than disruptive <code>&lt;strong&gt;</code> markup. Your text remains 100% private.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="project-footer mt-16 border-t border-[#D6D3C0] pt-8 pb-12">
          <div>
            <a href="https://clamly.app" className="brand-lockup footer-brand" aria-label="Clamly home">
              <span>clamly</span>
            </a>
            <p className="mt-1 text-xs text-[#6E6B5C]">
              Clamly Anchor is an open-source assistive reading initiative dedicated to cognitive inclusion.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

interface ComparisonPreviewProps {
  text: string;
  segments: ReturnType<typeof splitText>;
  position: number;
  fontClass: string;
  focusRulerActive: boolean;
  onPositionChange: (value: number) => void;
}

/** A two-layer comparison that keeps both versions at exactly the same layout. */
function ComparisonPreview({
  text,
  segments,
  position,
  fontClass,
  focusRulerActive,
  onPositionChange
}: ComparisonPreviewProps) {
  const [mouseY, setMouseY] = useState<number>(100);
  const style = { "--comparison-position": `${position}%` } as CSSProperties;
  const empty = text.length === 0;

  return (
    <div
      className="comparison-shell relative rounded-2xl border border-[#D6D3C0] bg-[#FFFEFA] overflow-hidden"
      style={style}
      onMouseMove={(e) => {
        if (!focusRulerActive) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseY(Math.max(10, Math.min(rect.height - 36, e.clientY - rect.top - 18)));
      }}
    >
      <div className="comparison-stage min-h-[380px] sm:min-h-[440px]">
        <div className="comparison-label comparison-label-before" aria-hidden="true">Original</div>
        <div className="comparison-label comparison-label-after" aria-hidden="true">Anchored</div>

        {/* Anchored Layer */}
        <article aria-live="polite" className={`comparison-text comparison-after p-6 sm:p-8 text-lg leading-relaxed sm:leading-loose text-[#3A3A38] ${fontClass}`}>
          {empty ? (
            <span className="text-[#6E6B5C]">Start typing to see your anchored text.</span>
          ) : (
            segments.map((segment, index) =>
              segment.bold ? (
                <b key={index} className="font-bold text-[#1F1F1E]">{segment.value}</b>
              ) : (
                <span key={index}>{segment.value}</span>
              )
            )
          )}
        </article>

        {/* Original Layer */}
        {!empty && (
          <div className="comparison-before" aria-hidden="true">
            <div className={`comparison-text p-6 sm:p-8 text-lg leading-relaxed sm:leading-loose text-[#6E6B5C] ${fontClass}`}>
              {text}
            </div>
          </div>
        )}

        {/* Drag Divider */}
        {!empty && <div className="comparison-divider" aria-hidden="true"><span>↔</span></div>}

        {/* Interactive Focus Ruler Preview */}
        {focusRulerActive && (
          <div
            className="pointer-events-none absolute left-0 right-0 z-10 border-y border-[#8DA2FB]/50 bg-[#8DA2FB]/12 transition-[top] duration-75"
            style={{ top: `${mouseY}px`, height: "36px" }}
            aria-hidden="true"
          />
        )}

        <label className="sr-only" htmlFor="before-after-slider">
          Before and after comparison: {position}% original text visible
        </label>
        <input
          id="before-after-slider"
          className="comparison-range"
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => onPositionChange(Number(event.target.value))}
          aria-valuetext={`${position}% original text visible`}
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
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-semibold text-sm text-[#41413F]">{label}</label>
        <output htmlFor={id} className="text-sm font-bold text-[#41413F]">{valueLabel}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="anchor-range w-full"
      />
      <p className="mt-1.5 text-xs text-[#6E6B5C]">{hint}</p>
    </div>
  );
}

