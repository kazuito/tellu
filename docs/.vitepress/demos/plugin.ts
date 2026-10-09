import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";
import type { MarkdownRenderer } from "vitepress";
import { extractDemos, parseDemoInfo } from "./extract";

const REGISTRY = "virtual:tellu-demos";
const RESOLVED_REGISTRY = `\0${REGISTRY}`;
/** A demo is served as a fake TypeScript file next to its page, so Vite transforms it and resolves its imports. */
const DEMO_ID = /^(.*\.md)\.demo-(\d+)\.ts$/;

const toPosix = (path: string) => path.split(sep).join("/");

function markdownFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".md") && !/(^|[/\\])(node_modules|\.vitepress)[/\\]/.test(file))
    .map((file) => join(root, file));
}

/** Demo key used by the registry and `<TelluDemo>`: the page path relative to the docs root, plus its index. */
export const demoKey = (relativePath: string, index: number) => `${toPosix(relativePath)}#${index}`;

/** Makes ```` ```ts demo ```` fences executable: each one becomes a module that `<TelluDemo>` imports. */
export function demoPlugin(root: string): Plugin {
  const pageDemos = new Map<string, string[]>();

  return {
    name: "tellu-demos",
    enforce: "pre",
    resolveId(id) {
      if (id === REGISTRY) return RESOLVED_REGISTRY;
      const match = DEMO_ID.exec(id);
      if (!match) return undefined;
      return id.startsWith(root) ? id : join(root, id);
    },
    load(id) {
      if (id === RESOLVED_REGISTRY) {
        const entries = markdownFiles(root).flatMap((file) => {
          const demos = extractDemos(readFileSync(file, "utf8"));
          pageDemos.set(
            file,
            demos.map((demo) => demo.code),
          );
          return demos.map(
            (_, index) =>
              `${JSON.stringify(demoKey(relative(root, file), index))}: () => import(${JSON.stringify(`${toPosix(file)}.demo-${index}.ts`)})`,
          );
        });
        return `export default {\n${entries.join(",\n")}\n};\n`;
      }
      const match = DEMO_ID.exec(id);
      if (!match) return undefined;
      const [, page, index] = match as unknown as [string, string, string];
      this.addWatchFile(page);
      const demo = extractDemos(readFileSync(page, "utf8"))[Number(index)];
      if (!demo) throw new Error(`tellu-demos: ${page} has no demo #${index}`);
      return demo.code;
    },
    configureServer(server) {
      const pagesChanged = (file: string) => {
        if (!file.endsWith(".md")) return;
        const registry = server.moduleGraph.getModuleById(RESOLVED_REGISTRY);
        if (registry) server.moduleGraph.invalidateModule(registry);
      };
      server.watcher.on("add", pagesChanged);
      server.watcher.on("unlink", pagesChanged);
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith(".md")) return;
      const next = extractDemos(readFileSync(file, "utf8")).map((demo) => demo.code);
      const previous = pageDemos.get(file) ?? [];
      if (next.length === previous.length && next.every((code, index) => code === previous[index])) return;
      pageDemos.set(file, next);
      for (const module of server.moduleGraph.idToModuleMap.values()) {
        if (module.id === RESOLVED_REGISTRY || module.id?.startsWith(`${toPosix(file)}.demo-`)) {
          server.moduleGraph.invalidateModule(module);
        }
      }
      server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}

/** Renders a demo fence as `<TelluDemo>` around the highlighted code. */
export function demoMarkdown(md: MarkdownRenderer): void {
  const fence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    const demo = parseDemoInfo(token.info);
    if (!demo) return fence(tokens, index, options, env, self);
    const demoIndex: number = env.telluDemoIndex ?? 0;
    env.telluDemoIndex = demoIndex + 1;
    token.info = "ts";
    const attrs = [
      `id="${md.utils.escapeHtml(demoKey(env.relativePath, demoIndex))}"`,
      demo.compare ? "compare" : "",
      demo.backdrop ? `backdrop="${md.utils.escapeHtml(demo.backdrop)}"` : "",
      demo.loop !== undefined ? `:loop="${demo.loop}"` : "",
      demo.still !== undefined ? `:still="${demo.still}"` : "",
    ].filter(Boolean);
    return `<TelluDemo ${attrs.join(" ")}>${fence(tokens, index, options, env, self)}</TelluDemo>\n`;
  };
}
