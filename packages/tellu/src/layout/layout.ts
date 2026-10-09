import { resolveKinsoku, resolveLength, resolveLineHeight, resolveStyle } from "../style/defaults";
import { applyOverride } from "../style/merge";
import type { Box, KinsokuRules, LayoutOptions, TextContent, TextStyle, WritingMode } from "../style/types";
import { type FontMetrics, fontSpecOf, getDefaultMeasurer, type Measurer } from "./measure";
import { BREAK_FALLBACK, BREAK_PREFERRED, type Cluster, computeBreaks, segmentRuns } from "./segment";
import { combineUpright, isVertical, type VerticalOrientation, verticalOrientation, verticalShift } from "./vertical";

export interface ResolvedRun {
  text: string;
  style: TextStyle;
  tags: readonly string[];
}

export interface LayoutGlyph {
  index: number;
  text: string;
  runIndex: number;
  lineIndex: number;
  indexInLine: number;
  isWhitespace: boolean;
  /** Where the glyph is drawn from: the start of its baseline, before `rotation` (baseline shift included). */
  x: number;
  y: number;
  /** Clockwise rotation in degrees: `90` for glyphs set sideways in vertical text. */
  rotation: 0 | 90;
  /** Advance along the line including scale, excluding letter spacing. */
  advance: number;
  /** Font size after `shrink`. */
  fontSize: number;
  /** Horizontal scale on screen, including `squeeze` and 縦中横 condensing. */
  scaleX: number;
  /** Vertical scale on screen, including `squeeze` in vertical text. */
  scaleY: number;
  /** Font ascent and descent in the glyph's own orientation, scaled. */
  ascent: number;
  descent: number;
  /** The glyph's cell in layout coordinates: its advance along the line × the font's extent across it. */
  box: Box;
}

export interface LayoutLine {
  index: number;
  /** Glyph index range `[start, end)`. */
  start: number;
  end: number;
  /** Offset of the content along the line after alignment: x in horizontal text, y in vertical text. */
  inlineStart: number;
  /** Length of the content along the line, excluding trailing whitespace. */
  inlineSize: number;
  /** Where the line box starts across the lines: its top in horizontal text, its left edge in vertical text. */
  blockStart: number;
  /** Thickness of the line box (the line height). */
  blockSize: number;
  /** The baseline: y in horizontal text, x of the central baseline in vertical text. */
  baseline: number;
  /** Extent of the fonts from the baseline: up / down in horizontal text, right / left in vertical text. */
  ascent: number;
  descent: number;
  /** The content in layout coordinates: its length along the line × `ascent + descent` across it. */
  contentBox: Box;
}

export interface Layout {
  writingMode: WritingMode;
  runs: ResolvedRun[];
  glyphs: LayoutGlyph[];
  /** In order: top → bottom, right → left (`vertical-rl`) or left → right (`vertical-lr`). */
  lines: LayoutLine[];
  /** Layout box size. The line length is `maxWidth` (`maxHeight` in vertical text) when given. */
  width: number;
  height: number;
  /** Font scale applied by `overflow: "shrink"`. */
  fontScale: number;
}

const EPSILON = 0.01;

export function normalizeRuns(text: TextContent, base: TextStyle): ResolvedRun[] {
  const runs = typeof text === "string" ? [text] : text;
  return runs.map((run) =>
    typeof run === "string"
      ? { text: run, style: base, tags: [] }
      : { text: run.text, style: applyOverride(base, run.style), tags: run.tags ?? [] },
  );
}

interface Prepared {
  options: LayoutOptions;
  vertical: boolean;
  runs: ResolvedRun[];
  clusters: Cluster[];
  /** Per cluster; only set in vertical text. */
  orientations: VerticalOrientation[] | null;
  breaks: Uint8Array;
  advances: Advances;
  metrics: FontMetrics[];
  /** Offsets of shifted glyphs at the run's font size, `[x0, y0, x1, y1, …]`. */
  shifts: Float64Array;
  kinsoku: KinsokuRules | null;
}

interface LineRange {
  start: number;
  end: number;
  /** Ended by an explicit line break. */
  forced: boolean;
}

export function layoutText(options: LayoutOptions, measurer: Measurer = getDefaultMeasurer()): Layout {
  const base = resolveStyle(options.style);
  const runs = normalizeRuns(options.text, base);
  const locale = options.locale ?? "ja";
  const kinsoku = resolveKinsoku(options.kinsoku);
  const vertical = isVertical(options.writingMode);
  let clusters = segmentRuns(
    runs.map((run) => run.text),
    locale,
  );
  if (vertical) clusters = combineUpright(clusters, (runIndex) => runs[runIndex]!.style.textCombineUpright);
  const orientations = vertical
    ? clusters.map((cluster) => verticalOrientation(cluster, runs[cluster.runIndex]!.style.textOrientation))
    : null;
  const metrics = runs.map((run) => measurer.fontMetrics(fontSpecOf(run.style)));
  const prepared: Prepared = {
    options,
    vertical,
    runs,
    clusters,
    orientations,
    breaks: computeBreaks(clusters, { lineBreak: options.lineBreak ?? "char", locale, kinsoku }),
    advances: measureAdvances(clusters, runs, orientations, measurer),
    metrics,
    shifts: measureShifts(clusters, runs, orientations, metrics, measurer),
    kinsoku,
  };

  const { maxLines, overflow = "visible" } = options;
  const [lineLimit, blockLimit] = limits(options);
  if (overflow !== "shrink" || (lineLimit === undefined && blockLimit === undefined)) return build(prepared, 1, true);

  const fits = (layout: Layout) => {
    const blockSize = vertical ? layout.width : layout.height;
    return (
      (lineLimit === undefined || layout.lines.every((line) => line.inlineSize <= lineLimit + EPSILON)) &&
      (blockLimit === undefined || blockSize <= blockLimit + EPSILON) &&
      (maxLines === undefined || layout.lines.length <= maxLines)
    );
  };
  const full = build(prepared, 1, false);
  if (fits(full)) return full;

  const minScale = options.minScale ?? 0.3;
  const smallest = build(prepared, minScale, false);
  // Even the smallest scale overflows: keep it, cut to `maxLines` like the other overflow modes.
  if (!fits(smallest)) return maxLines === undefined ? smallest : build(prepared, minScale, true);

  let best = smallest;
  let low = minScale;
  let high = 1;
  for (let i = 0; i < 16 && high - low > 0.001; i++) {
    const mid = (low + high) / 2;
    const candidate = build(prepared, mid, false);
    if (fits(candidate)) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

/** `[line length, block size]` limits: `maxWidth` runs along horizontal lines, `maxHeight` along vertical ones. */
function limits(options: LayoutOptions): [line: number | undefined, block: number | undefined] {
  return isVertical(options.writingMode)
    ? [options.maxHeight, options.maxWidth]
    : [options.maxWidth, options.maxHeight];
}

interface Advances {
  /** Horizontal advance of each cluster on its own. */
  own: Float64Array;
  /** Kerning between a cluster and the previous one in the same run (usually negative). */
  kern: Float64Array;
}

/** Longest text measured at once to find kerning. Longer runs restart the measurement. */
const KERN_WINDOW = 64;
/** Clusters before a restart that are measured again, so shaping still sees its neighbours. */
const KERN_CONTEXT = 16;

/**
 * Kerning-aware advances. Measuring growing prefixes of each run yields the kerning between
 * neighbours as the browser shapes them in context, which shifts the following glyph (it is not
 * part of that glyph's own advance). Prefixes restart every `KERN_WINDOW` clusters so long runs
 * cost linear time. In vertical text only neighbouring sideways glyphs kern.
 */
function measureAdvances(
  clusters: readonly Cluster[],
  runs: readonly ResolvedRun[],
  orientations: readonly VerticalOrientation[] | null,
  measurer: Measurer,
): Advances {
  const own = new Float64Array(clusters.length);
  const kern = new Float64Array(clusters.length);
  const kerns = (index: number) => {
    const cluster = clusters[index]!;
    return cluster.kind !== "newline" && (!orientations || orientations[index] === "sideways");
  };
  let segmentStart = 0;
  /** First cluster of the measured prefix. */
  let base = 0;
  /** Width of the prefix up to the previous cluster. */
  let previous = 0;
  clusters.forEach((cluster, index) => {
    if (cluster.kind === "newline") return;
    const run = runs[cluster.runIndex]!;
    const font = fontSpecOf(run.style);
    own[index] = measurer.measureText(cluster.text, font);
    const before = clusters[index - 1];
    if (!before || before.runIndex !== cluster.runIndex || !kerns(index - 1) || !kerns(index)) {
      segmentStart = base = index;
      previous = own[index]!;
      return;
    }
    if (index - base >= KERN_WINDOW) {
      base = Math.max(segmentStart, index - KERN_CONTEXT);
      previous = measurer.measureText(run.text.slice(clusters[base]!.start, before.end), font);
    }
    const prefix = measurer.measureText(run.text.slice(clusters[base]!.start, cluster.end), font);
    kern[index] = prefix - previous - own[index]!;
    previous = prefix;
  });
  return { own, kern };
}

/** The em box of a font in px: `[ascent, descent]` around the alphabetic baseline, summing to the font size. */
function emBox(metric: FontMetrics, fontSize: number): [ascent: number, descent: number] {
  const descent = metric.ideographicDescent ?? (fontSize * metric.descent) / (metric.ascent + metric.descent);
  return [fontSize - descent, descent];
}

/** Where each shifted glyph moves in vertical text (see `verticalShift`). */
function measureShifts(
  clusters: readonly Cluster[],
  runs: readonly ResolvedRun[],
  orientations: readonly VerticalOrientation[] | null,
  metrics: readonly FontMetrics[],
  measurer: Measurer,
): Float64Array {
  const offsets = new Float64Array(clusters.length * 2);
  if (!orientations) return offsets;
  clusters.forEach((cluster, index) => {
    if (orientations[index] !== "shifted") return;
    const style = runs[cluster.runIndex]!.style;
    const font = fontSpecOf(style);
    const shift = verticalShift(cluster.text);
    const ink = shift.reflect ? measurer.inkBounds?.(cluster.text, font) : undefined;
    if (ink) {
      const [ascent, descent] = emBox(metrics[cluster.runIndex]!, style.fontSize);
      const advance = measurer.measureText(cluster.text, font);
      offsets[index * 2] = advance - (ink.left + ink.right);
      offsets[index * 2 + 1] = descent - ascent - (ink.top + ink.bottom);
    } else {
      offsets[index * 2] = shift.x * style.fontSize;
      offsets[index * 2 + 1] = shift.y * style.fontSize;
    }
  });
  return offsets;
}

const START_ALIGN = new Set(["start", "left", "top"]);
const END_ALIGN = new Set(["end", "right", "bottom"]);

interface LineMetrics {
  /** Thickness of the line box. */
  size: number;
  ascent: number;
  descent: number;
}

/** @param truncate Drop the lines after `maxLines`. */
function build(prepared: Prepared, fontScale: number, truncate: boolean): Layout {
  const { options, vertical, runs, clusters, orientations, breaks, advances, metrics, shifts, kinsoku } = prepared;
  const { maxLines, align = "start", overflow = "visible" } = options;
  const writingMode = options.writingMode ?? "horizontal-tb";
  const [lineLimit] = limits(options);
  const wrap = lineLimit !== undefined && (options.wrap ?? "auto") === "auto";

  // Everything up to placing glyphs runs along the line ("inline") and across lines ("block").
  const advance = new Float64Array(clusters.length);
  const kern = new Float64Array(clusters.length);
  const spacing = new Float64Array(clusters.length);
  clusters.forEach((cluster, index) => {
    const style = runs[cluster.runIndex]!.style;
    const inlineScale = (vertical ? style.scaleY : style.scaleX) * fontScale;
    const upright = vertical && orientations![index] !== "sideways";
    advance[index] = (upright ? style.fontSize : advances.own[index]!) * inlineScale;
    kern[index] = advances.kern[index]! * inlineScale;
    spacing[index] = resolveLength(style.letterSpacing, style.fontSize) * fontScale;
  });

  let ranges = breakLines(clusters, breaks, advance, kern, spacing, wrap ? lineLimit : undefined, kinsoku);
  if (maxLines !== undefined && truncate) ranges = ranges.slice(0, maxLines);

  const contentEnds = ranges.map((range) => {
    let end = range.end;
    while (end > range.start && clusters[end - 1]!.kind === "space") end--;
    return end;
  });
  const lineLengths = ranges.map((range, lineIndex) => {
    const contentEnd = contentEnds[lineIndex]!;
    let length = 0;
    for (let k = range.start; k < contentEnd; k++) {
      length += (k > range.start ? kern[k]! : 0) + advance[k]! + (k < contentEnd - 1 ? spacing[k]! : 0);
    }
    return length;
  });
  const boxLength = lineLimit ?? Math.max(0, ...lineLengths);

  const styleAt = (k: number) => runs[clusters[k]?.runIndex ?? 0]?.style ?? resolveStyle(options.style);
  const metricAt = (k: number) => {
    const style = styleAt(k);
    return metrics[clusters[k]?.runIndex ?? 0] ?? { ascent: style.fontSize * 0.88, descent: style.fontSize * 0.12 };
  };
  const shiftAt = (k: number) => {
    const style = styleAt(k);
    return resolveLength(style.baselineShift, style.fontSize) * fontScale;
  };

  const lineMetrics = ranges.map((range): LineMetrics => {
    const line: LineMetrics = { size: 0, ascent: 0, descent: 0 };
    const measure = (k: number) => {
      const style = styleAt(k);
      const shift = shiftAt(k);
      // Vertical lines are centered on the central baseline, so each glyph reaches half an em to either side.
      const over = vertical
        ? (style.fontSize * fontScale * style.scaleX) / 2
        : metricAt(k).ascent * fontScale * style.scaleY;
      const under = vertical ? over : metricAt(k).descent * fontScale * style.scaleY;
      line.ascent = Math.max(line.ascent, over + shift);
      line.descent = Math.max(line.descent, under - shift);
      line.size = Math.max(line.size, resolveLineHeight(style.lineHeight, style.fontSize * fontScale));
    };
    // A blank line still takes the size of the style it was typed in.
    if (range.start === range.end) measure(range.start < clusters.length ? range.start : clusters.length - 1);
    for (let k = range.start; k < range.end; k++) measure(k);
    return line;
  });
  const blockTotal = lineMetrics.reduce((sum, line) => sum + line.size, 0);

  const glyphs: LayoutGlyph[] = [];
  const lines: LayoutLine[] = [];
  let blockOffset = 0;

  ranges.forEach((range, lineIndex) => {
    const contentEnd = contentEnds[lineIndex]!;
    const { size, ascent, descent } = lineMetrics[lineIndex]!;

    let squeeze = 1;
    let lineLength = lineLengths[lineIndex]!;
    if (overflow === "squeeze" && lineLimit !== undefined && lineLength > lineLimit) {
      squeeze = Math.max(options.minScale ?? 0.3, lineLimit / lineLength);
      lineLength *= squeeze;
    }

    let extra = 0;
    let gapFilter: (k: number) => boolean = () => false;
    const isLastLine = lineIndex === ranges.length - 1;
    if (align === "justify" && lineLimit !== undefined && !isLastLine && !range.forced && lineLength < lineLimit) {
      const inner = (k: number) => k >= range.start && k < contentEnd - 1;
      const spaces = (k: number) => inner(k) && clusters[k + 1]!.kind === "space" && clusters[k]!.kind !== "space";
      let gaps = 0;
      for (let k = range.start; k < contentEnd; k++) if (spaces(k)) gaps++;
      gapFilter = gaps > 0 ? spaces : inner;
      if (gaps === 0) gaps = contentEnd - range.start - 1;
      if (gaps > 0) extra = (lineLimit - lineLength) / gaps;
      lineLength += extra * gaps;
    }

    const inlineStart =
      START_ALIGN.has(align) || align === "justify"
        ? 0
        : END_ALIGN.has(align)
          ? boxLength - lineLength
          : (boxLength - lineLength) / 2;
    // Physical start of the line box across the lines.
    const blockStart = writingMode === "vertical-rl" ? blockTotal - blockOffset - size : blockOffset;
    const baseline = vertical
      ? blockStart + (size - (ascent + descent)) / 2 + descent
      : blockStart + (size - (ascent + descent)) / 2 + ascent;

    const start = glyphs.length;
    let pen = inlineStart;
    for (let k = range.start; k < range.end; k++) {
      const cluster = clusters[k]!;
      const style = runs[cluster.runIndex]!.style;
      const metric = metrics[cluster.runIndex]!;
      const fontSize = style.fontSize * fontScale;
      const shift = shiftAt(k);
      if (k > range.start) pen += kern[k]! * squeeze;
      const glyph: LayoutGlyph = {
        index: glyphs.length,
        text: cluster.text,
        runIndex: cluster.runIndex,
        lineIndex,
        indexInLine: k - range.start,
        isWhitespace: cluster.kind !== "char",
        x: pen,
        y: baseline - shift,
        rotation: 0,
        advance: advance[k]! * squeeze,
        fontSize,
        scaleX: style.scaleX * squeeze,
        scaleY: style.scaleY,
        ascent: metric.ascent * fontScale * style.scaleY,
        descent: metric.descent * fontScale * style.scaleY,
        box: { x: 0, y: 0, width: 0, height: 0 },
      };
      if (vertical) {
        placeVertical(glyph, {
          orientation: orientations![k]!,
          style,
          metric,
          fontScale,
          squeeze,
          center: baseline + shift,
          top: pen,
          ownAdvance: advances.own[k]! * fontScale,
          shiftX: shifts[k * 2]! * fontScale,
          shiftY: shifts[k * 2 + 1]! * fontScale,
        });
      } else {
        glyph.box = {
          x: glyph.x,
          y: glyph.y - glyph.ascent,
          width: glyph.advance,
          height: glyph.ascent + glyph.descent,
        };
      }
      glyphs.push(glyph);
      pen += (advance[k]! + spacing[k]!) * squeeze + (gapFilter(k) ? extra : 0);
    }

    lines.push({
      index: lineIndex,
      start,
      end: glyphs.length,
      inlineStart,
      inlineSize: lineLength,
      blockStart,
      blockSize: size,
      baseline,
      ascent,
      descent,
      contentBox: vertical
        ? { x: baseline - descent, y: inlineStart, width: ascent + descent, height: lineLength }
        : { x: inlineStart, y: baseline - ascent, width: lineLength, height: ascent + descent },
    });
    blockOffset += size;
  });

  const [width, height] = vertical ? [blockTotal, boxLength] : [boxLength, blockTotal];
  return { writingMode, runs, glyphs, lines, width, height, fontScale };
}

interface VerticalPlacement {
  orientation: VerticalOrientation;
  style: TextStyle;
  metric: FontMetrics;
  fontScale: number;
  squeeze: number;
  /** x of the glyph's central baseline, baseline shift included. */
  center: number;
  /** Top of the glyph's cell. */
  top: number;
  /** Horizontal advance of the glyph at the scaled font size. */
  ownAdvance: number;
  shiftX: number;
  shiftY: number;
}

/** Places a glyph of a vertical line: centered on the central baseline, its em box at the top of its cell. */
function placeVertical(glyph: LayoutGlyph, placement: VerticalPlacement): void {
  const { orientation, style, metric, fontScale, squeeze, center, top, ownAdvance } = placement;
  const fontSize = style.fontSize * fontScale;
  const [emAscent, emDescent] = emBox(metric, style.fontSize).map((value) => value * fontScale) as [number, number];
  let scaleX = style.scaleX;
  const scaleY = style.scaleY * squeeze;
  glyph.scaleY = scaleY;
  glyph.box = { x: center - (fontSize * scaleX) / 2, y: top, width: fontSize * scaleX, height: glyph.advance };

  if (orientation === "sideways") {
    glyph.rotation = 90;
    glyph.x = center - (scaleX * (emAscent - emDescent)) / 2;
    glyph.y = top;
    glyph.ascent = metric.ascent * fontScale * scaleX;
    glyph.descent = metric.descent * fontScale * scaleX;
  } else {
    if (orientation === "combined") scaleX *= Math.min(1, fontSize / ownAdvance);
    glyph.x = center - (ownAdvance * scaleX) / 2;
    glyph.y = top + emAscent * scaleY;
    if (orientation === "shifted") {
      glyph.x += placement.shiftX * scaleX;
      glyph.y += placement.shiftY * scaleY;
    }
  }
  glyph.scaleX = scaleX;
}

function breakLines(
  clusters: readonly Cluster[],
  breaks: Uint8Array,
  advance: Float64Array,
  kern: Float64Array,
  spacing: Float64Array,
  maxLength: number | undefined,
  kinsoku: KinsokuRules | null,
): LineRange[] {
  const ranges: LineRange[] = [];
  let lineStart = 0;
  let lineLength = 0;
  let i = 0;

  const startLine = (start: number) => {
    lineStart = start;
    while (lineStart < clusters.length && clusters[lineStart]!.kind === "space") lineStart++;
    lineLength = 0;
    i = lineStart;
  };

  while (i < clusters.length) {
    const cluster = clusters[i]!;
    if (cluster.kind === "newline") {
      ranges.push({ start: lineStart, end: i, forced: true });
      lineStart = i + 1;
      lineLength = 0;
      i++;
      continue;
    }

    const shift = i > lineStart ? kern[i]! : 0;
    if (
      maxLength !== undefined &&
      cluster.kind === "char" &&
      i > lineStart &&
      lineLength + shift + advance[i]! > maxLength + EPSILON
    ) {
      if (!cluster.combined && kinsoku?.hanging.includes(cluster.text) && clusters[i - 1]!.kind === "char") {
        ranges.push({ start: lineStart, end: i + 1, forced: false });
        startLine(i + 1);
        continue;
      }
      const end = findBreak(breaks, lineStart, i);
      ranges.push({ start: lineStart, end, forced: false });
      startLine(end);
      continue;
    }

    lineLength += shift + advance[i]! + spacing[i]!;
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
