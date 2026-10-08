import { type Canvas2D, context2d, createCanvas } from "../canvas";
import type { TextStyle } from "../style/types";

export interface FontSpec {
  family: TextStyle["fontFamily"];
  size: number;
  weight: TextStyle["fontWeight"];
  style: TextStyle["fontStyle"];
  kerning: boolean;
}

export interface FontMetrics {
  ascent: number;
  descent: number;
}

/** Text measurement backend. Swap it to lay out text outside the browser (e.g. in tests). */
export interface Measurer {
  /** Advance width of `text` in px, without letter spacing or scaling. */
  measureText(text: string, font: FontSpec): number;
  fontMetrics(font: FontSpec): FontMetrics;
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

export function fontToCss(font: FontSpec): string {
  return `${font.style} ${font.weight} ${font.size}px ${fontFamilyToCss(font.family)}`;
}

export function fontSpecOf(style: TextStyle, size: number = style.fontSize): FontSpec {
  return { family: style.fontFamily, size, weight: style.fontWeight, style: style.fontStyle, kerning: style.kerning };
}

/** Measures with the Canvas 2D API. Fonts must be loaded before measuring. */
export class CanvasMeasurer implements Measurer {
  private context: Canvas2D | undefined;
  private widths = new Map<string, number>();
  private metrics = new Map<string, FontMetrics>();

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
      this.metrics.set(key, metrics);
    }
    return metrics;
  }

  /** Drops cached measurements, e.g. after a web font finished loading. */
  clear(): void {
    this.widths.clear();
    this.metrics.clear();
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
