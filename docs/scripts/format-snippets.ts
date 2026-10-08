/**
 * Formats every ```ts demo fence with Biome at a width that fits the docs' code column.
 * `--check` only reports fences that would change.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractDemos } from "../.vitepress/demos/extract";

const LINE_WIDTH = 80;
const docs = join(import.meta.dir, "..");
const check = process.argv.includes("--check");

const pages = readdirSync(docs, { recursive: true, encoding: "utf8" }).filter(
  (file) => file.endsWith(".md") && !/(^|\/)(node_modules|\.vitepress)\//.test(file),
);

function format(code: string): string {
  const biome = Bun.spawnSync(["bunx", "biome", "format", `--line-width=${LINE_WIDTH}`, "--stdin-file-path=demo.ts"], {
    cwd: docs,
    stdin: Buffer.from(code),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (biome.exitCode !== 0) throw new Error(biome.stderr.toString());
  return biome.stdout.toString().replace(/\n$/, "");
}

const changed: string[] = [];
for (const page of pages) {
  const file = join(docs, page);
  const lines = readFileSync(file, "utf8").split("\n");
  const demos = extractDemos(lines.join("\n"));
  for (const demo of demos.toReversed()) {
    const formatted = format(demo.code);
    if (formatted === demo.code) continue;
    changed.push(`docs/${page}:${demo.line}`);
    const body = formatted.split("\n").map((line) => (line ? demo.indent + line : line));
    lines.splice(demo.line - 1, demo.endLine - demo.line, ...body);
  }
  if (!check) writeFileSync(file, lines.join("\n"));
}

if (check && changed.length > 0) {
  console.error(`Unformatted documentation examples (run \`bun run docs:format\`):\n  ${changed.join("\n  ")}`);
  process.exit(1);
}
console.log(check ? "Documentation examples are formatted." : `Formatted ${changed.length} documentation example(s).`);
