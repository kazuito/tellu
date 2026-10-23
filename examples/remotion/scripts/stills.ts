import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { type ChromiumOptions, openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// Renders representative frames of each composition into out/stills for a quick visual check.
//
//   bun run stills [Name …]             render into out/stills
//   bun run stills --baseline [Name …]  render into out/stills-baseline
//   bun run stills --diff [Name …]      render into out/stills and compare against the baseline;
//                                       differing pixels go to out/stills-diff, and the exit code is 1
const frames: Record<string, number[]> = {
  Variety: [8, 40, 100, 150],
  Subtitles: [40, 110, 200, 300],
  Quiz: [20, 150, 270],
  Recipe: [40, 120, 200],
  Sale: [30, 70, 140],
  GameStream: [30, 80, 150],
  Documentary: [30, 120],
  Shorts: [35, 70, 120, 170],
};

const root = path.resolve(import.meta.dir, "..");
const out = path.join(root, "out");
const args = process.argv.slice(2);
const mode = args.includes("--baseline") ? "baseline" : args.includes("--diff") ? "diff" : "render";
const only = args.filter((arg) => !arg.startsWith("--"));
const unknown = only.filter((name) => !(name in frames));
if (unknown.length > 0) throw new Error(`Unknown composition: ${unknown.join(", ")}`);

const outDir = path.join(out, mode === "baseline" ? "stills-baseline" : "stills");
const baselineDir = path.join(out, "stills-baseline");
const diffDir = path.join(out, "stills-diff");
if (mode === "diff" && !existsSync(baselineDir)) {
  throw new Error("No baseline yet. Run `bun run stills --baseline` on the version to compare against.");
}

// PixiJS needs WebGL in headless Chrome.
const chromiumOptions: ChromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions });

const stills: string[] = [];
try {
  await mkdir(outDir, { recursive: true });
  for (const [id, list] of Object.entries(frames)) {
    if (only.length > 0 && !only.includes(id)) continue;
    const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions });
    for (const frame of list) {
      const name = `${id}-${frame}.png`;
      await renderStill({
        serveUrl,
        composition,
        frame,
        output: path.join(outDir, name),
        puppeteerInstance: browser,
        chromiumOptions,
        overwrite: true,
      });
      stills.push(name);
      console.log(`rendered ${path.relative(root, path.join(outDir, name))}`);
    }
  }
} finally {
  await browser.close({ silent: true });
}

if (mode === "diff") {
  await rm(diffDir, { recursive: true, force: true });
  await mkdir(diffDir, { recursive: true });
  let failed = 0;
  for (const name of stills) {
    const baselinePath = path.join(baselineDir, name);
    if (!existsSync(baselinePath)) {
      console.log(`  new      ${name} (no baseline)`);
      continue;
    }
    const before = PNG.sync.read(await readFile(baselinePath));
    const after = PNG.sync.read(await readFile(path.join(outDir, name)));
    if (before.width !== after.width || before.height !== after.height) {
      console.log(`✗ size     ${name}: ${before.width}×${before.height} → ${after.width}×${after.height}`);
      failed++;
      continue;
    }
    const diff = new PNG({ width: after.width, height: after.height });
    const pixels = pixelmatch(before.data, after.data, diff.data, after.width, after.height);
    if (pixels === 0) {
      console.log(`  same     ${name}`);
      continue;
    }
    const share = ((pixels / (after.width * after.height)) * 100).toFixed(3);
    console.log(`✗ differs  ${name}: ${pixels} px (${share}%)`);
    await writeFile(path.join(diffDir, name), PNG.sync.write(diff));
    failed++;
  }
  console.log(failed > 0 ? `\n${failed} of ${stills.length} stills differ, see out/stills-diff` : "\nNo differences");
  if (failed > 0) process.exitCode = 1;
}
