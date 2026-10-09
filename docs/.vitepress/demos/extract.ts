export interface DemoOptions {
  /** The default export is a record of labelled props, drawn side by side. */
  compare: boolean;
  backdrop: string | undefined;
  /** Frames (30 fps) before an animated demo starts over. */
  loop: number | undefined;
  /** Frame an animated demo shows while paused, e.g. for `prefers-reduced-motion`. */
  still: number | undefined;
}

export interface DemoBlock extends DemoOptions {
  code: string;
  /** 1-based line of the first code line in the Markdown file. */
  line: number;
  /** 1-based line of the closing fence. */
  endLine: number;
  indent: string;
}

const FENCE_OPEN = /^( {0,3})(`{3,}|~{3,})(.*)$/;

/** Parses the info string of a fence, e.g. `ts demo compare backdrop=night loop=90`. */
export function parseDemoInfo(info: string): DemoOptions | undefined {
  const [lang, ...words] = info.trim().split(/\s+/);
  if (lang !== "ts" || !words.includes("demo")) return undefined;
  const attrs = new Map(
    words.filter((word) => word.includes("=")).map((word) => word.split("=", 2) as [string, string]),
  );
  const number = (key: string) => (attrs.has(key) ? Number(attrs.get(key)) : undefined);
  return {
    compare: words.includes("compare"),
    backdrop: attrs.get("backdrop"),
    loop: number("loop"),
    still: number("still"),
  };
}

/** Every demo fence of a Markdown page, in document order (the order markdown-it renders them). */
export function extractDemos(markdown: string): DemoBlock[] {
  const lines = markdown.split(/\r?\n/);
  const demos: DemoBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE_OPEN.exec(lines[i]!);
    if (!open) continue;
    const [, indent, marker, info] = open as unknown as [string, string, string, string];
    const close = new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}\\s*$`);
    let end = i + 1;
    while (end < lines.length && !close.test(lines[end]!)) end++;
    const options = parseDemoInfo(info);
    if (options) {
      const body = lines.slice(i + 1, end).map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line));
      demos.push({ ...options, code: body.join("\n"), line: i + 2, endLine: end + 1, indent });
    }
    i = end;
  }
  return demos;
}
