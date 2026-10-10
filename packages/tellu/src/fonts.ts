import { normalizeRuns } from "./layout/layout";
import { fontSpecOf, fontToCss } from "./layout/measure";
import { resolveStyle } from "./style/defaults";
import type { LayoutOptions } from "./style/types";

export interface FontRequest {
  /** CSS font shorthand, e.g. `"900 16px 'Noto Sans JP'"`. */
  font: string;
  /** Characters that will be drawn; needed for fonts split by `unicode-range`. */
  text: string;
}

/** The fonts the text needs, and the characters drawn with each. */
export function fontRequests(options: Pick<LayoutOptions, "text" | "style">): FontRequest[] {
  const requests = new Map<string, string>();
  for (const run of normalizeRuns(options.text, resolveStyle(options.style))) {
    const font = fontToCss(fontSpecOf(run.style, 16));
    requests.set(font, (requests.get(font) ?? "") + run.text);
  }
  return [...requests].map(([font, text]) => ({ font, text: text || " " }));
}

function fontFaceSet(): FontFaceSet | undefined {
  return typeof document !== "undefined" ? document.fonts : undefined;
}

/** Whether every font face the text needs is loaded. Always `true` outside the browser. */
export function fontsReady(options: Pick<LayoutOptions, "text" | "style">): boolean {
  const fonts = fontFaceSet();
  if (!fonts) return true;
  return fontRequests(options).every(({ font, text }) => {
    try {
      return fonts.check(font, text);
    } catch {
      return true;
    }
  });
}

/**
 * Loads every font face the text needs, including the `unicode-range` subsets of its characters, through
 * `document.fonts.load()`. Resolves when they can be measured, or at once outside the browser. Only faces already
 * declared by `@font-face` rules can load: load the stylesheet first, or text silently falls back to another font.
 *
 * @example await loadFonts({ text: "テロップ", style: { fontFamily: "Noto Sans JP", fontWeight: 900 } })
 */
export async function loadFonts(
  options: Pick<LayoutOptions, "text" | "style"> | readonly FontRequest[],
): Promise<void> {
  const fonts = fontFaceSet();
  if (!fonts) return;
  const requests = Array.isArray(options)
    ? (options as readonly FontRequest[])
    : fontRequests(options as LayoutOptions);
  await Promise.all(requests.map(({ font, text }) => fonts.load(font, text)));
}

let fontEpoch = 0;
const epochListeners = new Set<() => void>();

/** A counter that increments whenever the document finishes loading web fonts. Pairs with `subscribeFontEpoch()`. */
export function getFontEpoch(): number {
  return fontEpoch;
}

/**
 * Calls `listener` after the document finishes loading web fonts. Returns an unsubscribe function. With
 * `getFontEpoch()` it fits React's `useSyncExternalStore`, to re-measure text once late fonts arrive.
 */
export function subscribeFontEpoch(listener: () => void): () => void {
  const fonts = fontFaceSet();
  if (!fonts) return () => {};
  if (epochListeners.size === 0) fonts.addEventListener("loadingdone", bumpEpoch);
  epochListeners.add(listener);
  return () => {
    epochListeners.delete(listener);
    if (epochListeners.size === 0) fonts.removeEventListener("loadingdone", bumpEpoch);
  };
}

function bumpEpoch(): void {
  fontEpoch++;
  for (const listener of epochListeners) listener();
}
