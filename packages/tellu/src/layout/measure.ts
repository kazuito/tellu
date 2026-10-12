import { type Canvas2D, context2d, createCanvas } from "../canvas";
import type { TextStyle } from "../style/types";

/** The font a `Measurer` measures with. */
export interface FontSpec {
  family: TextStyle["fontFamily"];
  /** Font size in px. */
  size: number;
  weight: TextStyle["fontWeight"];
  style: TextStyle["fontStyle"];
  kerning: boolean;
}

/** Vertical extents of a font in px, measured from the alphabetic baseline. */
export interface FontMetrics {
  /** Distance above the baseline, positive. */
  ascent: number;
  /** Distance below the baseline, positive. */
  descent: number;
  /**
   * Distance from the alphabetic baseline down to the ideographic baseline, the bottom of the em box
   * that vertical text is centered on. Default: the em size split in the ratio of `ascent` to `descent`.
   */
  ideographicDescent?: number;
}

/** Ink extents of a glyph relative to its baseline origin, in px (`top` is negative above the baseline). */
export interface InkBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Text measurement backend. Swap it to lay out text outside the browser (e.g. in tests or on a server). Layout measures
 * single glyphs and growing prefixes of each run, and derives kerning from them, so results must be consistent.
 */
export interface Measurer {
  /** Advance width of `text` in px, without letter spacing or scaling. */
  measureText(text: string, font: FontSpec): number;
  /** Ascent and descent of the font. */
  fontMetrics(font: FontSpec): FontMetrics;
  /**
   * Places vertical punctuation and small kana by their ink, and measures the space `tsume` removes.
   * Without it they are moved by a fixed amount and `tsume` has no effect.
   */
  inkBounds?(text: string, font: FontSpec): InkBounds;
}

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
]);

export function fontFamilyToCss(family: FontSpec["family"]): string {
  const families = typeof family === "string" ? family.split(",") : family;
  return families
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => (GENERIC_FAMILIES.has(name) || /^["'].*["']$/.test(name) ? name : `"${name.replace(/"/g, '\\"')}"`))
    .join(", ");
}

/**
 * The families of a font stack in order, unquoted. `generic` marks CSS generic families such as `sans-serif`; a quoted
 * `"serif"` names a font and isn't generic.
 */
export function fontStack(family: FontSpec["family"]): { name: string; generic: boolean }[] {
  const families = typeof family === "string" ? family.split(",") : family;
  return families
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) =>
      /^["'].*["']$/.test(name)
        ? { name: name.slice(1, -1).replace(/\\(["'])/g, "$1"), generic: false }
        : { name, generic: GENERIC_FAMILIES.has(name) },
    );
}

/**
 * A CSS `font` shorthand, e.g. `normal 900 64px "Noto Sans JP"`. Family names are quoted; generic families are left
 * as they are.
 */
export function fontToCss(font: FontSpec): string {
  return `${font.style} ${font.weight} ${font.size}px ${fontFamilyToCss(font.family)}`;
}

/** The `FontSpec` of a style, at `size` px (default: its `fontSize`). */
export function fontSpecOf(style: TextStyle, size: number = style.fontSize): FontSpec {
  return { family: style.fontFamily, size, weight: style.fontWeight, style: style.fontStyle, kerning: style.kerning };
}

/**
 * Measures with the Canvas 2D API and caches every result. Fonts must be loaded before measuring: a font that is still
 * loading is measured with a fallback, and stays cached until `clear()`.
 */
export class CanvasMeasurer implements Measurer {
  private context: Canvas2D | undefined;
  private widths = new Map<string, number>();
  private metrics = new Map<string, FontMetrics>();
  private inks = new Map<string, InkBounds>();

  private get ctx(): Canvas2D {
    this.context ??= context2d(createCanvas(1, 1));
    return this.context;
  }

  private use(font: FontSpec): string {
    const css = fontToCss(font);
    const ctx = this.ctx;
    ctx.font = css;
    ctx.fontKerning = font.kerning ? "normal" : "none";
    return css;
  }

  measureText(text: string, font: FontSpec): number {
    const key = `${font.kerning ? 1 : 0}${fontToCss(font)}\u0000${text}`;
    let width = this.widths.get(key);
    if (width === undefined) {
      this.use(font);
      width = this.ctx.measureText(text).width;
      this.widths.set(key, width);
    }
    return width;
  }

  fontMetrics(font: FontSpec): FontMetrics {
    const key = fontToCss(font);
    let metrics = this.metrics.get(key);
    if (!metrics) {
      this.use(font);
      const m = this.ctx.measureText("Mg国");
      metrics = {
        ascent: m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent,
        descent: m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent,
      };
      if (typeof m.ideographicBaseline === "number") metrics.ideographicDescent = -m.ideographicBaseline;
      this.metrics.set(key, metrics);
    }
    return metrics;
  }

  inkBounds(text: string, font: FontSpec): InkBounds {
    const key = `${fontToCss(font)}\u0000${text}`;
    let bounds = this.inks.get(key);
    if (!bounds) {
      this.use(font);
      const m = this.ctx.measureText(text);
      bounds = {
        left: -m.actualBoundingBoxLeft,
        top: -m.actualBoundingBoxAscent,
        right: m.actualBoundingBoxRight,
        bottom: m.actualBoundingBoxDescent,
      };
      this.inks.set(key, bounds);
    }
    return bounds;
  }

  /** Drops cached measurements, e.g. after a web font finished loading. */
  clear(): void {
    this.widths.clear();
    this.metrics.clear();
    this.inks.clear();
  }
}

let shared: CanvasMeasurer | undefined;

/** The measurer used when none is given. Its cache is dropped whenever web fonts finish loading. */
export function getDefaultMeasurer(): CanvasMeasurer {
  if (!shared) {
    const measurer = new CanvasMeasurer();
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.addEventListener("loadingdone", () => measurer.clear());
    }
    shared = measurer;
  }
  return shared;
}
