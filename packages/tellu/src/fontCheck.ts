import { BLANK_FONT_WOFF_BASE64 } from "./blankFont";
import { type Canvas2D, context2d, createCanvas } from "./canvas";
import { fontRequests } from "./fonts";
import { normalizeRuns } from "./layout/layout";
import { fontFamilyToCss, fontSpecOf, fontStack, fontToCss } from "./layout/measure";
import { resolveStyle } from "./style/defaults";
import type { FontStyle, FontWeight, LayoutOptions } from "./style/types";

/**
 * A reason a caption may not be drawn with the fonts its style asks for. `font` is the CSS font of the affected runs,
 * and `message` describes the issue in English.
 */
export type FontIssue =
  | {
      /** No `@font-face` rule declares the family, and it isn't installed. */
      type: "family-not-found";
      family: string;
      font: string;
      message: string;
    }
  | {
      /** The family is declared, but no face has the weight and style asked for. */
      type: "face-unavailable";
      family: string;
      font: string;
      weight: number;
      style: FontStyle;
      message: string;
    }
  | {
      /** A declared face the text needs failed to load. */
      type: "load-failed";
      family: string;
      font: string;
      message: string;
    }
  | {
      /** No font in the stack has these characters. */
      type: "missing-glyphs";
      font: string;
      characters: string;
      message: string;
    };

/** What `<Text>` and `createCanvasText()` do about font issues: log them, fail, or skip the check. */
export type FontCheckMode = "warn" | "error" | "off";

/** Thrown, or passed to `onError`, when `fontCheck` is `"error"` and the fonts have issues. */
export class FontIssueError extends Error {
  readonly issues: readonly FontIssue[];

  constructor(issues: readonly FontIssue[]) {
    super(issues.map((issue) => issue.message).join("\n"));
    this.name = "FontIssueError";
    this.issues = issues;
  }
}

/** The fonts a text uses: one entry per distinct CSS font, with the characters drawn with it. */
export interface FontUse {
  /** CSS font shorthand at 16px. */
  font: string;
  /** The stack, without generic families. */
  families: string[];
  /** Whether the stack ends in (or contains) a generic family, which accepts any fallback. */
  generic: boolean;
  weight: FontWeight;
  style: FontStyle;
  text: string;
}

/** A declared font face, as `document.fonts` reports it. */
export interface FaceInfo {
  family: string;
  weight: string;
  style: string;
  status: FontFaceLoadStatus;
  unicodeRange: string;
}

/** Whether a font of `families` (in that order, with nothing after them) draws `char`. */
export type GlyphTest = (use: FontUse, families: readonly string[], char: string) => boolean;

/** The fonts a text uses. */
export function fontUses(options: Pick<LayoutOptions, "text" | "style">): FontUse[] {
  const uses = new Map<string, FontUse>();
  for (const run of normalizeRuns(options.text, resolveStyle(options.style))) {
    const spec = fontSpecOf(run.style, 16);
    const font = fontToCss(spec);
    const existing = uses.get(font);
    if (existing) {
      existing.text += run.text;
      continue;
    }
    const stack = fontStack(spec.family);
    uses.set(font, {
      font,
      families: stack.filter((entry) => !entry.generic).map((entry) => entry.name),
      generic: stack.some((entry) => entry.generic),
      weight: spec.weight,
      style: spec.style,
      text: run.text,
    });
  }
  return [...uses.values()];
}

/** Code points nothing is drawn for, so they can't be checked: whitespace, controls, format characters and marks. */
const UNCHECKED = /[\s\p{Cc}\p{Cf}\p{M}\p{Zl}\p{Zp}]/u;

/** The distinct characters (code points) of `text` a font must draw. */
export function checkedCharacters(text: string): string[] {
  const chars = new Set<string>();
  for (const char of text) if (!UNCHECKED.test(char)) chars.add(char);
  return [...chars];
}

/** Code point ranges of a `unicode-range` descriptor. */
export function parseUnicodeRange(descriptor: string): [from: number, to: number][] {
  const ranges: [number, number][] = [];
  for (const token of descriptor.split(",")) {
    const match = /^\s*u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?\s*$/i.exec(token);
    if (!match) continue;
    const [, start, end] = match;
    if (start!.includes("?")) {
      ranges.push([Number.parseInt(start!.replace(/\?/g, "0"), 16), Number.parseInt(start!.replace(/\?/g, "f"), 16)]);
    } else {
      const from = Number.parseInt(start!, 16);
      ranges.push([from, end ? Number.parseInt(end, 16) : from]);
    }
  }
  return ranges;
}

function covers(ranges: readonly [number, number][], char: string): boolean {
  const code = char.codePointAt(0)!;
  return ranges.some(([from, to]) => code >= from && code <= to);
}

/** The weight a style asks for as a number, or `undefined` for relative weights. */
function numericWeight(weight: FontWeight): number | undefined {
  if (typeof weight === "number") return weight;
  if (weight === "normal") return 400;
  if (weight === "bold") return 700;
  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** The weights a face covers, from its `font-weight` descriptor. */
function faceWeights(descriptor: string): [number, number] {
  const values = descriptor
    .trim()
    .split(/\s+/)
    .map((value) => numericWeight(value as FontWeight) ?? 400);
  return [values[0] ?? 400, values[1] ?? values[0] ?? 400];
}

function faceStyleMatches(descriptor: string, style: FontStyle): boolean {
  const slanted = /^(italic|oblique)/.test(descriptor.trim());
  return style === "normal" ? !slanted : slanted;
}

function quoted(names: readonly string[]): string {
  return names.map((name) => `"${name}"`).join(", ");
}

/**
 * Finds the font issues of `uses` given the declared faces and a way to test glyphs. Faces that failed to load and
 * missing faces are only reported when they cover characters of the text.
 */
export function classifyFontIssues(uses: readonly FontUse[], faces: readonly FaceInfo[], hasGlyph: GlyphTest) {
  const issues: FontIssue[] = [];
  const notFound = new Set<string>();
  const byFamily = new Map<string, FaceInfo[]>();
  for (const face of faces) {
    const family = fontStack(face.family)[0]?.name.toLowerCase() ?? "";
    byFamily.set(family, [...(byFamily.get(family) ?? []), face]);
  }

  for (const use of uses) {
    const chars = checkedCharacters(use.text);
    if (chars.length === 0) continue;
    let unusable = false;

    for (const family of use.families) {
      const declared = byFamily.get(family.toLowerCase()) ?? [];
      if (declared.length === 0) {
        // Not declared: it may still be installed. A font draws something of a few common characters, or of the text.
        const probes = [...new Set(["A", "a", "0", ...chars])];
        if (notFound.has(family) || !probes.some((char) => hasGlyph(use, [family], char))) {
          unusable = true;
          if (!notFound.has(family)) {
            notFound.add(family);
            issues.push({
              type: "family-not-found",
              family,
              font: use.font,
              message: `tellu: the font family "${family}" is not declared by any @font-face rule and is not installed, so a fallback font is used instead (${use.font}). Load the stylesheet that declares it before drawing.`,
            });
          }
        }
        continue;
      }

      const covering = declared.filter((face) => {
        const ranges = parseUnicodeRange(face.unicodeRange || "U+0-10FFFF");
        return chars.some((char) => covers(ranges, char));
      });
      if (covering.length === 0) continue;

      const weight = numericWeight(use.weight);
      const matching = covering.filter((face) => {
        if (!faceStyleMatches(face.style, use.style)) return false;
        if (weight === undefined) return true;
        const [min, max] = faceWeights(face.weight);
        return weight >= min && weight <= max;
      });
      if (weight !== undefined && matching.length === 0) {
        issues.push({
          type: "face-unavailable",
          family,
          font: use.font,
          weight,
          style: use.style,
          message: `tellu: the font family "${family}" has no ${use.style} face of weight ${weight}, so the browser uses the nearest face and may synthesize bold or italic (${use.font}). Declare that face, e.g. add the weight to the stylesheet URL.`,
        });
      }
      if ((matching.length > 0 ? matching : covering).some((face) => face.status === "error")) {
        unusable = true;
        issues.push({
          type: "load-failed",
          family,
          font: use.font,
          message: `tellu: a face of the font family "${family}" failed to load, so a fallback font is used instead (${use.font}).`,
        });
      }
    }

    // A generic family accepts any fallback; a family that isn't there already explains missing characters.
    if (use.generic || unusable || use.families.length === 0) continue;
    const missing = chars.filter((char) => !hasGlyph(use, use.families, char));
    if (missing.length > 0) {
      issues.push({
        type: "missing-glyphs",
        font: use.font,
        characters: missing.join(""),
        message: `tellu: no font in ${quoted(use.families)} has the characters "${missing.join("")}", so they are drawn with a fallback font (${use.font}). Add a font that has them to the stack, or end it with a generic family such as sans-serif to accept the fallback.`,
      });
    }
  }
  return issues;
}

const BLANK_FAMILY = "tellu-blank-check";
let blankFont: Promise<boolean> | undefined;
let measureContext: Canvas2D | undefined;
const glyphCache = new Map<string, boolean>();
let watchingFonts = false;

function fontFaceSet(): FontFaceSet | undefined {
  return typeof document !== "undefined" ? document.fonts : undefined;
}

/** Adds the blank font to the document once. It is loaded before it is added, so adding it starts no font load. */
function loadBlankFont(fonts: FontFaceSet): Promise<boolean> {
  blankFont ??= (async () => {
    if (typeof FontFace === "undefined") return false;
    const binary = atob(BLANK_FONT_WOFF_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const face = new FontFace(BLANK_FAMILY, bytes.buffer);
    await face.load();
    fonts.add(face);
    return true;
  })().catch(() => false);
  return blankFont;
}

/** Measures `char` in `families` followed by the blank font: a character none of them has measures as nothing. */
const measureGlyph: GlyphTest = (use, families, char) => {
  const font = `${use.style} ${use.weight} 32px ${fontFamilyToCss([...families, BLANK_FAMILY])}`;
  const key = `${font}\u0000${char}`;
  let has = glyphCache.get(key);
  if (has === undefined) {
    measureContext ??= context2d(createCanvas(1, 1));
    measureContext.font = font;
    const metrics = measureContext.measureText(char);
    has = metrics.width > 0 || metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight > 0;
    glyphCache.set(key, has);
  }
  return has;
};

function declaredFaces(fonts: FontFaceSet): FaceInfo[] {
  const faces: FaceInfo[] = [];
  fonts.forEach((face) => {
    if (face.family === BLANK_FAMILY) return;
    faces.push({
      family: face.family,
      weight: face.weight,
      style: face.style,
      status: face.status,
      unicodeRange: face.unicodeRange,
    });
  });
  return faces;
}

/**
 * Loads the fonts a text needs, then checks that it can be drawn with them: that every family is declared or installed,
 * that the faces for its weights and styles exist and loaded, and that some font in each stack has every character.
 * Resolves to the issues found, or `[]` outside the browser. Stacks with a generic family (`sans-serif`) accept any
 * fallback, so their characters aren't checked.
 *
 * @example
 * const issues = await checkFonts({ text: "テロップ", style: { fontFamily: "Noto Sans JP", fontWeight: 900 } });
 * for (const issue of issues) console.warn(issue.message);
 */
export async function checkFonts(options: Pick<LayoutOptions, "text" | "style">): Promise<FontIssue[]> {
  const fonts = fontFaceSet();
  if (!fonts) return [];
  if (!watchingFonts) {
    fonts.addEventListener("loadingdone", () => glyphCache.clear());
    watchingFonts = true;
  }
  const [blank] = await Promise.all([
    loadBlankFont(fonts),
    Promise.allSettled(fontRequests(options).map(({ font, text }) => fonts.load(font, text))),
  ]);
  if (!blank) return [];
  return classifyFontIssues(fontUses(options), declaredFaces(fonts), measureGlyph);
}

const warned = new Set<string>();

/** Logs each issue with `console.warn`, once per page. */
export function warnFontIssues(issues: readonly FontIssue[]): void {
  for (const issue of issues) {
    if (warned.has(issue.message)) continue;
    warned.add(issue.message);
    console.warn(issue.message);
  }
}
