import type { KinsokuRules, LineBreak } from "../style/types";

export type ClusterKind = "char" | "space" | "newline";

export interface Cluster {
  text: string;
  runIndex: number;
  /** Offset of the cluster within its run's text. */
  start: number;
  end: number;
  kind: ClusterKind;
}

/** No break is allowed before this cluster. */
export const BREAK_NONE = 0;
/** A break is allowed but only used when no preferred break fits (inside a phrase). */
export const BREAK_FALLBACK = 1;
export const BREAK_PREFERRED = 2;

const NEWLINE = /^(?:\r\n|\r|\n|\u2028|\u2029)$/;
const BREAK_SPACE = /^[ \t\u1680\u2000-\u2006\u2008-\u200b\u205f]$/;
const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-〿ー！-｠￠-￦]|\p{Extended_Pictographic}/u;
const HIRAGANA_ONLY = /^[\p{Script=Hiragana}ー]+$/u;
const NOT_HIRAGANA = /[^\p{Script=Hiragana}ー]/u;
const HYPHENS = "-‐‒–";

const segmenters = new Map<string, Intl.Segmenter>();

function segmenter(locale: string, granularity: "grapheme" | "word"): Intl.Segmenter {
  const key = `${locale}:${granularity}`;
  let instance = segmenters.get(key);
  if (!instance) {
    instance = new Intl.Segmenter(locale, { granularity });
    segmenters.set(key, instance);
  }
  return instance;
}

export function segmentRuns(texts: readonly string[], locale: string): Cluster[] {
  const graphemes = segmenter(locale, "grapheme");
  const clusters: Cluster[] = [];
  texts.forEach((text, runIndex) => {
    for (const { segment, index } of graphemes.segment(text)) {
      clusters.push({
        text: segment,
        runIndex,
        start: index,
        end: index + segment.length,
        kind: NEWLINE.test(segment) ? "newline" : BREAK_SPACE.test(segment) ? "space" : "char",
      });
    }
  });
  return clusters;
}

export interface BreakOptions {
  lineBreak: LineBreak;
  locale: string;
  kinsoku: KinsokuRules | null;
}

/** Returns, for each cluster, whether a line may break before it. */
export function computeBreaks(clusters: readonly Cluster[], options: BreakOptions): Uint8Array {
  const breaks = new Uint8Array(clusters.length);
  const phraseStarts = options.lineBreak === "phrase" ? findPhraseStarts(clusters, options.locale) : null;
  const { kinsoku } = options;

  for (let i = 1; i < clusters.length; i++) {
    const prev = clusters[i - 1]!;
    const cur = clusters[i]!;
    if (prev.kind === "newline" || cur.kind === "newline" || cur.kind === "space") continue;

    if (prev.kind === "space") {
      breaks[i] = BREAK_PREFERRED;
    } else if (CJK.test(prev.text) || CJK.test(cur.text)) {
      breaks[i] = !phraseStarts || phraseStarts.has(i) ? BREAK_PREFERRED : BREAK_FALLBACK;
    } else if (HYPHENS.includes(prev.text)) {
      breaks[i] = BREAK_PREFERRED;
    }

    if (breaks[i] && kinsoku && prohibited(prev.text, cur.text, kinsoku)) breaks[i] = BREAK_NONE;
  }
  return breaks;
}

function prohibited(prev: string, cur: string, rules: KinsokuRules): boolean {
  if (rules.lineStart.includes(cur) || rules.lineEnd.includes(prev)) return true;
  return prev === cur && rules.inseparable.includes(cur);
}

/**
 * Approximates Japanese phrases (文節) from word segments: hiragana-only words
 * (particles, auxiliaries, okurigana) attach to a preceding phrase that contains
 * kanji, katakana or latin text.
 */
function findPhraseStarts(clusters: readonly Cluster[], locale: string): Set<number> {
  const text = clusters.map((cluster) => cluster.text).join("");
  const clusterAt = new Int32Array(text.length + 1).fill(-1);
  let offset = 0;
  clusters.forEach((cluster, index) => {
    clusterAt[offset] = index;
    offset += cluster.text.length;
  });

  const starts = new Set<number>();
  let phrase = "";
  for (const { segment, index } of segmenter(locale, "word").segment(text)) {
    const attaches =
      phrase !== "" &&
      !/^[\p{Ps}\p{Pi}]/u.test(segment) &&
      (!/\p{L}|\p{N}/u.test(segment) || (HIRAGANA_ONLY.test(segment) && NOT_HIRAGANA.test(phrase)));
    const endsPhrase = /[\p{P}\p{Z}]$/u.test(phrase) && !/^[\p{Pe}\p{Pf}\p{Po}]/u.test(segment);
    if (attaches && !endsPhrase) {
      phrase += segment;
    } else {
      const cluster = clusterAt[index]!;
      if (cluster >= 0) starts.add(cluster);
      phrase = segment;
    }
  }
  return starts;
}
