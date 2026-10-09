/**
 * Type-checks every ```ts demo fence against the library source, so examples break loudly when the API changes.
 * Errors are reported at their line in the Markdown file.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { extractDemos } from "../.vitepress/demos/extract";

const docs = join(import.meta.dir, "..");
const out = join(docs, ".vitepress/cache/snippets");

const DEMO_TYPES = `
import type { TextNodeProps as __Props } from "tellu";
type __Demo = __Props | ((frame: number) => __Props);
type __Compare = Readonly<Record<string, __Props>>;
export default __demo;
`;

const pages = readdirSync(docs, { recursive: true, encoding: "utf8" }).filter(
  (file) => file.endsWith(".md") && !/(^|\/)(node_modules|\.vitepress)\//.test(file),
);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const sources = new Map<string, { page: string; line: number }>();
const problems: string[] = [];
for (const page of pages) {
  extractDemos(readFileSync(join(docs, page), "utf8")).forEach((demo, index) => {
    if (!/^export default /m.test(demo.code)) {
      problems.push(`docs/${page}:${demo.line}: demo #${index} has no \`export default\``);
      return;
    }
    const file = join(out, `${page.replace(/[/\\]/g, "__").replace(/\.md$/, "")}__${index}.ts`);
    const type = demo.compare ? "__Compare" : "__Demo";
    writeFileSync(file, demo.code.replace(/^export default /m, `const __demo: ${type} = `) + DEMO_TYPES);
    sources.set(relative(docs, file), { page, line: demo.line });
  });
}

writeFileSync(
  join(out, "tsconfig.json"),
  JSON.stringify({
    extends: "../../../tsconfig.json",
    compilerOptions: { noUncheckedIndexedAccess: false },
    include: ["*.ts"],
    exclude: [],
  }),
);

const tsc = Bun.spawnSync(["bunx", "tsc", "-p", join(out, "tsconfig.json"), "--pretty", "false"], {
  cwd: docs,
  stdout: "pipe",
  stderr: "pipe",
});
const output = `${tsc.stdout.toString()}${tsc.stderr.toString()}`;
for (const line of output.split("\n").filter(Boolean)) {
  const match = /^(.+?)\((\d+),(\d+)\): (.*)$/.exec(line);
  const source = match && sources.get(relative(docs, join(docs, match[1]!)));
  problems.push(
    source ? `docs/${source.page}:${source.line + Number(match![2]) - 1}:${match![3]}: ${match![4]}` : line,
  );
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s) in documentation examples.`);
  process.exit(1);
}
console.log(`Checked ${sources.size} documentation examples.`);
