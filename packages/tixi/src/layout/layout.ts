import { resolveKinsoku, resolveLength, resolveLineHeight, resolveStyle } from "../style/defaults";
import { applyOverride } from "../style/merge";
import type { KinsokuRules, TelopLayoutOptions, TelopStyle, TelopText } from "../style/types";
import { type FontMetrics, fontSpecOf, getDefaultMeasurer, type Measurer } from "./measure";
import { BREAK_FALLBACK, BREAK_PREFERRED, type Cluster, computeBreaks, segmentRuns } from "./segment";

export interface ResolvedRun {
  text: string;
  style: TelopStyle;
  tags: readonly string[];
}

export interface LayoutGlyph {
  index: number;
  text: string;
  runIndex: number;
  lineIndex: number;
  indexInLine: number;
  isWhitespace: boolean;
  /** Left edge of the glyph's advance box. */
  x: number;
  /** Baseline (including baseline shift). */
  y: number;
  /** Advance width including `scaleX`, excluding letter spacing. */
  advance: number;
  /** Font size after `shrink`. */
  fontSize: number;
  /** `scaleX` including `squeeze`. */
  scaleX: number;
  scaleY: number;
  ascent: number;
  descent: number;
}

export interface LayoutLine {
  index: number;
  /** Glyph index range `[start, end)`. */
  start: number;
  end: number;
  x: number;
  /** Top of the line box. */
  top: number;
  height: number;
  baseline: number;
  /** Width of the content, excluding trailing whitespace. */
  width: number;
  ascent: number;
  descent: number;
}

export interface Layout {
  runs: ResolvedRun[];
  glyphs: LayoutGlyph[];
  lines: LayoutLine[];
  /** Layout box size. The width is `maxWidth` when given. */
  width: number;
  height: number;
  /** Font scale applied by `overflow: "shrink"`. */
  fontScale: number;
}

const EPSILON = 0.01;

export function normalizeRuns(text: TelopText, base: TelopStyle): ResolvedRun[] {
  const runs = typeof text === "string" ? [text] : text;
  return runs.map((run) =>
    typeof run === "string"
      ? { text: run, style: base, tags: [] }
      : { text: run.text, style: applyOverride(base, run.style), tags: run.tags ?? [] },
  );
}

interface Prepared {
  options: TelopLayoutOptions;
  runs: ResolvedRun[];
  clusters: Cluster[];
  breaks: Uint8Array;
  advances: Advances;
  metrics: FontMetrics[];
  kinsoku: KinsokuRules | null;
}

interface LineRange {
  start: number;
  end: number;
  /** Ended by an explicit line break. */
  forced: boolean;
}

export function layoutTelop(options: TelopLayoutOptions, measurer: Measurer = getDefaultMeasurer()): Layout {
  const base = resolveStyle(options.style);
  const runs = normalizeRuns(options.text, base);
  const locale = options.locale ?? "ja";
  const kinsoku = resolveKinsoku(options.kinsoku);
  const clusters = segmentRuns(
    runs.map((run) => run.text),
    locale,
  );
  const prepared: Prepared = {
    options,
    runs,
    clusters,
    breaks: computeBreaks(clusters, { lineBreak: options.lineBreak ?? "char", locale, kinsoku }),
    advances: measureAdvances(clusters, runs, measurer),
    metrics: runs.map((run) => measurer.fontMetrics(fontSpecOf(run.style))),
    kinsoku,
  };

  const { maxWidth, maxLines, overflow = "visible" } = options;
  if (overflow !== "shrink" || maxWidth === undefined) return build(prepared, 1);

  const fits = (layout: Layout) =>
    layout.lines.every((line) => line.width <= maxWidth + EPSILON) &&
    (maxLines === undefined || layout.lines.length <= maxLines);
  const full = build(prepared, 1);
  if (fits(full)) return full;

  const minScale = options.minScale ?? 0.3;
  let best = build(prepared, minScale);
  let low = minScale;
  let high = 1;
  for (let i = 0; i < 16 && high - low > 0.001; i++) {
    const mid = (low + high) / 2;
    const candidate = build(prepared, mid);
    if (fits(candidate)) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

interface Advances {
  /** Advance of each cluster on its own. */
  own: Float64Array;
  /** Kerning between a cluster and the previous one in the same run (usually negative). */
  kern: Float64Array;
}

/**
 * Kerning-aware advances. Measuring growing prefixes of each run yields the kerning between
 * neighbours, which shifts the following glyph (it is not part of that glyph's own advance).
 */
function measureAdvances(clusters: readonly Cluster[], runs: readonly ResolvedRun[], measurer: Measurer): Advances {
  const own = new Float64Array(clusters.length);
  const kern = new Float64Array(clusters.length);
  let runIndex = -1;
  let segmentStart = 0;
  let previous = 0;
  clusters.forEach((cluster, index) => {
    if (cluster.runIndex !== runIndex) {
      runIndex = cluster.runIndex;
      segmentStart = cluster.start;
      previous = 0;
    }
    if (cluster.kind === "newline") {
      segmentStart = cluster.end;
      previous = 0;
      return;
    }
    const run = runs[runIndex]!;
    const font = fontSpecOf(run.style);
    const prefix = measurer.measureText(run.text.slice(segmentStart, cluster.end), font);
    own[index] = measurer.measureText(cluster.text, font);
    kern[index] = cluster.start === segmentStart ? 0 : prefix - previous - own[index]!;
    previous = prefix;
  });
  return { own, kern };
}

function build(prepared: Prepared, fontScale: number): Layout {
  const { options, runs, clusters, breaks, advances, metrics, kinsoku } = prepared;
  const { maxWidth, maxLines, align = "left", overflow = "visible" } = options;
  const wrap = maxWidth !== undefined && (options.wrap ?? "auto") === "auto";

  const width = new Float64Array(clusters.length);
  const kern = new Float64Array(clusters.length);
  const spacing = new Float64Array(clusters.length);
  clusters.forEach((cluster, index) => {
    const style = runs[cluster.runIndex]!.style;
    width[index] = advances.own[index]! * fontScale * style.scaleX;
    kern[index] = advances.kern[index]! * fontScale * style.scaleX;
    spacing[index] = resolveLength(style.letterSpacing, style.fontSize) * fontScale;
  });

  let ranges = breakLines(clusters, breaks, width, kern, spacing, wrap ? maxWidth : undefined, kinsoku);
  if (maxLines !== undefined && overflow !== "shrink") ranges = ranges.slice(0, maxLines);

  const glyphs: LayoutGlyph[] = [];
  const lines: LayoutLine[] = [];
  let top = 0;
  let boxWidth = maxWidth ?? 0;
  const lineWidths: number[] = [];

  for (const range of ranges) {
    let contentEnd = range.end;
    while (contentEnd > range.start && clusters[contentEnd - 1]!.kind === "space") contentEnd--;
    let lineWidth = 0;
    for (let k = range.start; k < contentEnd; k++) {
      lineWidth += (k > range.start ? kern[k]! : 0) + width[k]! + (k < contentEnd - 1 ? spacing[k]! : 0);
    }
    lineWidths.push(lineWidth);
    if (maxWidth === undefined) boxWidth = Math.max(boxWidth, lineWidth);
  }

  ranges.forEach((range, lineIndex) => {
    let contentEnd = range.end;
    while (contentEnd > range.start && clusters[contentEnd - 1]!.kind === "space") contentEnd--;

    let squeeze = 1;
    let lineWidth = lineWidths[lineIndex]!;
    if (overflow === "squeeze" && maxWidth !== undefined && lineWidth > maxWidth) {
      squeeze = Math.max(options.minScale ?? 0.3, maxWidth / lineWidth);
      lineWidth *= squeeze;
    }

    let extra = 0;
    let gapFilter: (k: number) => boolean = () => false;
    const isLastLine = lineIndex === ranges.length - 1;
    if (align === "justify" && maxWidth !== undefined && !isLastLine && !range.forced && lineWidth < maxWidth) {
      const inner = (k: number) => k >= range.start && k < contentEnd - 1;
      const spaces = (k: number) => inner(k) && clusters[k + 1]!.kind === "space" && clusters[k]!.kind !== "space";
      let gaps = 0;
      for (let k = range.start; k < contentEnd; k++) if (spaces(k)) gaps++;
      gapFilter = gaps > 0 ? spaces : inner;
      if (gaps === 0) gaps = contentEnd - range.start - 1;
      if (gaps > 0) extra = (maxWidth - lineWidth) / gaps;
      lineWidth += extra * gaps;
    }

    const x = align === "center" ? (boxWidth - lineWidth) / 2 : align === "right" ? boxWidth - lineWidth : 0;

    // A blank line still takes the height of the style it was typed in.
    const sampleIndex = range.start < range.end ? range.start : Math.min(range.end, clusters.length - 1);
    let ascent = 0;
    let descent = 0;
    let height = 0;
    const measureCluster = (k: number) => {
      const runIndex = clusters[k]?.runIndex ?? 0;
      const style = runs[runIndex]?.style ?? resolveStyle(options.style);
      const metric = metrics[runIndex] ?? { ascent: style.fontSize * 0.88, descent: style.fontSize * 0.12 };
      const shift = resolveLength(style.baselineShift, style.fontSize) * fontScale;
      ascent = Math.max(ascent, metric.ascent * fontScale * style.scaleY + shift);
      descent = Math.max(descent, metric.descent * fontScale * style.scaleY - shift);
      height = Math.max(height, resolveLineHeight(style.lineHeight, style.fontSize * fontScale));
    };
    if (range.start === range.end) measureCluster(sampleIndex);
    for (let k = range.start; k < range.end; k++) measureCluster(k);

    const baseline = top + (height - (ascent + descent)) / 2 + ascent;
    const start = glyphs.length;
    let pen = x;
    for (let k = range.start; k < range.end; k++) {
      const cluster = clusters[k]!;
      const style = runs[cluster.runIndex]!.style;
      const metric = metrics[cluster.runIndex]!;
      const fontSize = style.fontSize * fontScale;
      if (k > range.start) pen += kern[k]! * squeeze;
      glyphs.push({
        index: glyphs.length,
        text: cluster.text,
        runIndex: cluster.runIndex,
        lineIndex,
        indexInLine: k - range.start,
        isWhitespace: cluster.kind !== "char",
        x: pen,
        y: baseline - resolveLength(style.baselineShift, style.fontSize) * fontScale,
        advance: width[k]! * squeeze,
        fontSize,
        scaleX: style.scaleX * squeeze,
        scaleY: style.scaleY,
        ascent: metric.ascent * fontScale * style.scaleY,
        descent: metric.descent * fontScale * style.scaleY,
      });
      pen += (width[k]! + spacing[k]!) * squeeze + (gapFilter(k) ? extra : 0);
    }

    lines.push({
      index: lineIndex,
      start,
      end: glyphs.length,
      x,
      top,
      height,
      baseline,
      width: lineWidth,
      ascent,
      descent,
    });
    top += height;
  });

  return { runs, glyphs, lines, width: boxWidth, height: top, fontScale };
}

function breakLines(
  clusters: readonly Cluster[],
  breaks: Uint8Array,
  width: Float64Array,
  kern: Float64Array,
  spacing: Float64Array,
  maxWidth: number | undefined,
  kinsoku: KinsokuRules | null,
): LineRange[] {
  const ranges: LineRange[] = [];
  let lineStart = 0;
  let lineWidth = 0;
  let i = 0;

  const startLine = (start: number) => {
    lineStart = start;
    while (lineStart < clusters.length && clusters[lineStart]!.kind === "space") lineStart++;
    lineWidth = 0;
    i = lineStart;
  };

  while (i < clusters.length) {
    const cluster = clusters[i]!;
    if (cluster.kind === "newline") {
      ranges.push({ start: lineStart, end: i, forced: true });
      lineStart = i + 1;
      lineWidth = 0;
      i++;
      continue;
    }

    const shift = i > lineStart ? kern[i]! : 0;
    if (
      maxWidth !== undefined &&
      cluster.kind === "char" &&
      i > lineStart &&
      lineWidth + shift + width[i]! > maxWidth + EPSILON
    ) {
      if (kinsoku?.hanging.includes(cluster.text) && clusters[i - 1]!.kind === "char") {
        ranges.push({ start: lineStart, end: i + 1, forced: false });
        startLine(i + 1);
        continue;
      }
      const end = findBreak(breaks, lineStart, i);
      ranges.push({ start: lineStart, end, forced: false });
      startLine(end);
      continue;
    }

    lineWidth += shift + width[i]! + spacing[i]!;
    i++;
  }
  ranges.push({ start: lineStart, end: clusters.length, forced: false });
  return ranges;
}

/** Last allowed break in `(lineStart, overflow]`, preferring phrase boundaries; breaks anywhere as a last resort. */
function findBreak(breaks: Uint8Array, lineStart: number, overflow: number): number {
  let fallback = -1;
  for (let j = overflow; j > lineStart; j--) {
    if (breaks[j] === BREAK_PREFERRED) return j;
    if (breaks[j] === BREAK_FALLBACK && fallback === -1) fallback = j;
  }
  return fallback !== -1 ? fallback : overflow;
}
