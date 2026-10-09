import type { TextCombineUpright, TextOrientation, WritingMode } from "../style/types";
import type { Cluster } from "./segment";

/**
 * How a glyph is set in vertical text.
 * - `upright`: centered in its cell
 * - `sideways`: turned 90° clockwise
 * - `combined`: 縦中横, set horizontally and condensed into one upright cell
 * - `shifted`: upright, moved to where its vertical form sits (、。 and small kana toward the top right)
 */
export type VerticalOrientation = "upright" | "sideways" | "combined" | "shifted";

export function isVertical(mode: WritingMode | undefined): boolean {
  return mode === "vertical-rl" || mode === "vertical-lr";
}

/** Full-width forms whose vertical alternates are (close to) the glyph turned 90°. */
const ROTATED = new Set("ー―‐－～〜〰…‥（）［］｛｝〔〕〈〉《》「」『』【】〘〙〖〗｟｠＜＞＝：；＿￣←→↔⇒⇔—–");
const PUNCTUATION = new Set("、。，．");
const SMALL_KANA = new Set("ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ");
/** Approximates Unicode `Vertical_Orientation=U`: scripts and symbols that stay upright in `mixed`. */
const UPRIGHT =
  /^(?:[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}⺀-⿿　-㏿︰-﹏！-￯①-⓿☀-➿§©®±¼-¾×÷※℀-⅏]|\p{Extended_Pictographic})/u;

export function verticalOrientation(cluster: Cluster, orientation: TextOrientation): VerticalOrientation {
  if (cluster.combined) return "combined";
  if (orientation === "sideways") return "sideways";
  if (ROTATED.has(cluster.text)) return "sideways";
  if (PUNCTUATION.has(cluster.text) || SMALL_KANA.has(cluster.text)) return "shifted";
  if (orientation === "upright") return "upright";
  return UPRIGHT.test(cluster.text) ? "upright" : "sideways";
}

/**
 * How a `shifted` glyph moves from its horizontal position, in em. Punctuation is mirrored through the
 * em box center by its ink (`"reflect"`); this offset approximates that when ink bounds are unknown.
 * Small kana move by a fixed amount, as in the vertical alternates of common Japanese fonts.
 */
export function verticalShift(text: string): { reflect: boolean; x: number; y: number } {
  return PUNCTUATION.has(text) ? { reflect: true, x: 0.6, y: -0.6 } : { reflect: false, x: 0.12, y: -0.08 };
}

function maxDigits(combine: TextCombineUpright): number {
  if (combine === "none" || combine === "all") return 0;
  return combine === "digits" ? 2 : Number(combine.slice(7));
}

const DIGIT = /^[0-9]$/;

/**
 * Merges the clusters set as 縦中横 into one cluster each: every run with `all`, and runs of
 * at most N ASCII digits with `digits N`. Newlines are never merged.
 */
export function combineUpright(
  clusters: readonly Cluster[],
  combineOf: (runIndex: number) => TextCombineUpright,
): Cluster[] {
  const result: Cluster[] = [];
  let i = 0;
  while (i < clusters.length) {
    const first = clusters[i]!;
    const combine = combineOf(first.runIndex);
    const belongs =
      combine === "all"
        ? (cluster: Cluster) => cluster.kind !== "newline"
        : (cluster: Cluster) => DIGIT.test(cluster.text);
    if (combine === "none" || !belongs(first)) {
      result.push(first);
      i++;
      continue;
    }
    let end = i + 1;
    while (end < clusters.length && clusters[end]!.runIndex === first.runIndex && belongs(clusters[end]!)) end++;
    const count = end - i;
    if (combine === "all" || count <= maxDigits(combine)) {
      const last = clusters[end - 1]!;
      result.push({
        text: clusters
          .slice(i, end)
          .map((cluster) => cluster.text)
          .join(""),
        runIndex: first.runIndex,
        start: first.start,
        end: last.end,
        kind: "char",
        combined: true,
      });
    } else {
      result.push(...clusters.slice(i, end));
    }
    i = end;
  }
  return result;
}
