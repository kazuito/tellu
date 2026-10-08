import { mergeOverrides } from "./style/merge";
import type { RunObject, StyleOverride } from "./style/types";

const TAG = /<(\/?)([A-Za-z][\w-]*)\s*(\/?)>/g;
const ENTITIES: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'" };

/**
 * Parses `<tag>…</tag>` markup into runs. Tags nest; inner tag styles win.
 * `<br/>` inserts a line break. `&lt;`, `&gt;` and `&amp;` escape markup characters.
 *
 * @example parseMarkup("今日は<em>最高</em>の日", { em: { fontSize: 96, layers: { 2: { paint: "red" } } } })
 */
export function parseMarkup(markup: string, tags: Readonly<Record<string, StyleOverride>> = {}): RunObject[] {
  const runs: RunObject[] = [];
  const stack: string[] = [];
  let cursor = 0;

  const push = (raw: string) => {
    const text = raw.replace(/&(?:lt|gt|amp|quot|#39);/g, (entity) => ENTITIES[entity]!);
    if (!text) return;
    const style = stack.reduce<StyleOverride | undefined>((acc, tag) => mergeOverrides(acc, tags[tag]), undefined);
    runs.push({ text, ...(style && { style }), ...(stack.length > 0 && { tags: [...stack] }) });
  };

  for (const match of markup.matchAll(TAG)) {
    const [whole, closing, name, selfClosing] = match as unknown as [string, string, string, string];
    push(markup.slice(cursor, match.index));
    cursor = match.index + whole.length;

    if (name === "br") {
      push("\n");
    } else if (closing) {
      const open = stack.lastIndexOf(name);
      if (open === -1) throw new Error(`tixi: unexpected closing tag </${name}>`);
      stack.length = open;
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  push(markup.slice(cursor));

  if (stack.length > 0) throw new Error(`tixi: unclosed tag <${stack.at(-1)}>`);
  return runs;
}
