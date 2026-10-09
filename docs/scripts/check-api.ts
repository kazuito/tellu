/**
 * Fails when a public export of `tellu`, `tellu/react` or `tellu/remotion` has no entry in the API reference.
 * Core exports need a heading in docs/api; the React and Remotion entries need a mention on their own page.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const docs = join(import.meta.dir, "..");
const src = join(docs, "../packages/tellu/src");
const api = join(docs, "api");

function exportedNames(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const names: string[] = [];
  for (const [, list] of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of list!.split(",")) {
      const name = item
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .at(-1);
      if (name) names.push(name);
    }
  }
  for (const [, from] of source.matchAll(/export\s+(?:type\s+)?\*\s+from\s+"([^"]+)"/g)) {
    names.push(...exportedNames(join(dirname(file), `${from}.ts`)));
  }
  for (const [, name] of source.matchAll(
    /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:interface|type|const|let|function|class|enum)\s+(\w+)/gm,
  )) {
    names.push(name!);
  }
  return [...new Set(names)];
}

const read = (page: string) => readFileSync(join(api, page), "utf8");
const headings = readdirSync(api)
  .filter((page) => page.endsWith(".md"))
  .flatMap((page) => read(page).split("\n"))
  .filter((line) => /^#{2,4}\s/.test(line))
  .join("\n");
const mentions = (text: string, name: string) => new RegExp(`\`${name}(?:\\(|<|\`)`).test(text);

const missing = [
  ...exportedNames(join(src, "index.ts"))
    .filter((name) => !mentions(headings, name))
    .map((name) => `tellu: ${name} (add a heading in docs/api)`),
  ...exportedNames(join(src, "react/index.ts"))
    .filter((name) => !mentions(read("react.md"), name))
    .map((name) => `tellu/react: ${name} (document it in docs/api/react.md)`),
  ...exportedNames(join(src, "remotion/index.ts"))
    .filter((name) => !mentions(read("remotion.md"), name))
    .map((name) => `tellu/remotion: ${name} (document it in docs/api/remotion.md)`),
];

if (missing.length > 0) {
  console.error(`Undocumented exports:\n${missing.map((line) => `  ${line}`).join("\n")}`);
  process.exit(1);
}
console.log("Every public export is documented.");
