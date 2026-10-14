import type { KinsokuRules, Length, LineHeight, TextStyle } from "./types";

/** The style every run starts from: white 64px `sans-serif` text with no outline, emoji in their own colors. */
export const defaultStyle: TextStyle = {
  fontFamily: "sans-serif",
  fontSize: 64,
  fontWeight: "normal",
  fontStyle: "normal",
  letterSpacing: 0,
  tsume: 0,
  scaleX: 1,
  scaleY: 1,
  lineHeight: 1.2,
  kerning: true,
  baselineShift: 0,
  textOrientation: "mixed",
  textCombineUpright: "digits 2",
  layers: [{ paint: "#ffffff", colorGlyphs: "keep" }],
  decorations: [],
};

/** The line breaking rules `kinsoku: true` applies. Extend a set by concatenating to it. */
export const defaultKinsoku: KinsokuRules = {
  lineStart:
    ",)]}、〕〉》」』】〙〗〟’”｠»" +
    "ヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻" +
    "‐゠–〜～?!‼⁇⁈⁉・:;/。.，．：；？！）］｝",
  lineEnd: "([{〔〈《「『【〘〖〝‘“｟«（［｛",
  inseparable: "—…‥〳〴〵",
  hanging: "、。,.，．",
};

/** `defaultStyle` with `style` applied, ignoring `undefined` values. */
export function resolveStyle(style: Partial<TextStyle> | undefined): TextStyle {
  return style ? { ...defaultStyle, ...stripUndefined(style) } : defaultStyle;
}

export function resolveLength(length: Length, fontSize: number): number {
  return typeof length === "number" ? length : length.em * fontSize;
}

export function resolveLineHeight(lineHeight: LineHeight, fontSize: number): number {
  return typeof lineHeight === "number" ? lineHeight * fontSize : lineHeight.px;
}

export function resolveKinsoku(kinsoku: boolean | Partial<KinsokuRules> | undefined): KinsokuRules | null {
  if (kinsoku === false) return null;
  if (kinsoku === true || kinsoku === undefined) return defaultKinsoku;
  return { ...defaultKinsoku, ...stripUndefined(kinsoku) };
}

export function stripUndefined<T extends object>(value: T): T {
  const result = {} as T;
  for (const key in value) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}
