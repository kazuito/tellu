import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { extractDemos } from "../demos/extract";
import type { PlaygroundPreset } from "../theme/playground/presets";

const PRESETS = "virtual:tellu-playground-presets";
const TYPES = "virtual:tellu-playground-types";
/** Waits for tsdown to finish rewriting `dist`, which it empties first, before reloading the types. */
const DIST_SETTLE_MS = 300;

const distDir = (root: string) => join(root, "../packages/tellu/dist");

/** Example pages whose demos become TypeScript presets, in sidebar order. */
const PRESET_PAGES = ["examples/index.md", "examples/variety.md", "examples/broadcast.md", "examples/social.md"];

function pagePresets(root: string, page: string): PlaygroundPreset[] {
  const markdown = readFileSync(join(root, page), "utf8");
  const lines = markdown.split(/\r?\n/);
  const group = /^# (.+)$/m.exec(markdown)?.[1] ?? page;
  return extractDemos(markdown).map((demo, index) => {
    const heading = lines
      .slice(0, demo.line - 1)
      .findLast((line) => line.startsWith("## "))
      ?.slice(3);
    return {
      id: `${page.replace(/\.md$/, "")}#${index}`,
      group,
      label: heading ?? "Overview",
      mode: "ts",
      code: `${demo.code}\n`,
      backdrop: demo.backdrop,
      loop: demo.loop,
      still: demo.still,
    };
  });
}

/**
 * The declarations the editor type-checks against, keyed by the path the TypeScript worker resolves:
 * the built tellu, React and csstype. pixi.js is declared as `any` to keep the bundle small.
 */
function editorTypes(root: string, watch: (file: string) => void): Record<string, string> {
  const require = createRequire(join(root, "package.json"));
  const files: Record<string, string> = {};
  const add = (dir: string, names: string[], target: string) => {
    for (const name of names) {
      watch(join(dir, name));
      files[`file:///node_modules/${target}/${name}`] = readFileSync(join(dir, name), "utf8");
    }
  };

  const dist = distDir(root);
  for (const name of readdirSync(dist).filter((name) => name.endsWith(".d.ts"))) {
    files[`file:///node_modules/tellu/dist/${name}`] = readFileSync(join(dist, name), "utf8");
  }
  files["file:///node_modules/tellu/index.d.ts"] = 'export * from "./dist/index.js";\n';
  files["file:///node_modules/tellu/react.d.ts"] = 'export * from "./dist/react.js";\n';

  const react = dirname(require.resolve("@types/react/package.json"));
  add(react, ["index.d.ts", "global.d.ts", "jsx-runtime.d.ts"], "@types/react");
  const csstype = dirname(createRequire(join(react, "package.json")).resolve("csstype/package.json"));
  add(csstype, ["index.d.ts"], "csstype");

  files["file:///pixi.d.ts"] = 'declare module "pixi.js";\n';
  return files;
}

/** Serves the playground's presets and editor types as virtual modules. */
export function playgroundPlugin(root: string): Plugin {
  return {
    name: "tellu-playground",
    configureServer(server) {
      // The whole directory, not each file: chunk names change between builds, and a load during a rebuild sees none.
      const dist = distDir(root);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onDistChange = (file: string) => {
        if (dirname(file) !== dist || !file.endsWith(".d.ts")) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const module = server.moduleGraph.getModuleById(`\0${TYPES}`);
          if (!module) return;
          server.moduleGraph.invalidateModule(module);
          server.ws.send({ type: "full-reload" });
        }, DIST_SETTLE_MS);
      };
      server.watcher.add(dist);
      server.watcher.on("add", onDistChange).on("change", onDistChange).on("unlink", onDistChange);
    },
    resolveId(id) {
      if (id === PRESETS || id === TYPES) return `\0${id}`;
      return undefined;
    },
    load(id) {
      if (id === `\0${PRESETS}`) {
        for (const page of PRESET_PAGES) this.addWatchFile(join(root, page));
        const presets = PRESET_PAGES.flatMap((page) => pagePresets(root, page));
        return `export default ${JSON.stringify(presets)};\n`;
      }
      if (id === `\0${TYPES}`) {
        return `export default ${JSON.stringify(editorTypes(root, (file) => this.addWatchFile(file)))};\n`;
      }
      return undefined;
    },
  };
}
