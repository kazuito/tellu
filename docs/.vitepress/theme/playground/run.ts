import type { ComponentType } from "react";
import { transform } from "sucrase";
import { type DemoExport, type DemoView, loadFontStylesheet, mountDemo } from "../demo/runtime";
import type { PlaygroundMode } from "./presets";

const MODULES: Record<string, () => Promise<unknown>> = {
  tellu: () => import("tellu"),
  "tellu/react": () => import("tellu/react"),
  react: () => import("react"),
  "react/jsx-runtime": () => import("react/jsx-runtime"),
  "pixi.js": () => import("pixi.js"),
};

const IMPORTABLE = Object.keys(MODULES)
  .filter((name) => !name.includes("jsx-runtime"))
  .map((name) => `"${name}"`)
  .join(", ");

/** Runs TypeScript (and JSX in React mode) as a CommonJS module whose imports are the playground's modules. */
async function evaluate(code: string, mode: PlaygroundMode): Promise<unknown> {
  const { code: js } = transform(code, {
    transforms: mode === "react" ? ["typescript", "jsx", "imports"] : ["typescript", "imports"],
    jsxRuntime: "automatic",
    production: true,
  });
  const specifiers = [...js.matchAll(/\brequire\((["'])(.+?)\1\)/g)].map((match) => match[2]!);
  const loaded = new Map<string, unknown>();
  for (const specifier of new Set(specifiers)) {
    const load = MODULES[specifier];
    if (!load) throw new Error(`Cannot import "${specifier}". The playground provides ${IMPORTABLE}.`);
    loaded.set(specifier, await load());
  }
  const module = { exports: {} as Record<string, unknown> };
  new Function("require", "exports", "module", js)(
    (specifier: string) => loaded.get(specifier),
    module.exports,
    module,
  );
  if (module.exports.default === undefined) {
    throw new Error(
      mode === "react"
        ? "Export the component to render: `export default function App() { … }`."
        : "Export the caption: `export default { text, style }`, a function of the frame, or a record to compare.",
    );
  }
  return module.exports.default;
}

async function mountReact(host: HTMLElement, App: ComponentType, onError: (error: unknown) => void): Promise<DemoView> {
  const [{ createElement }, { createRoot }, { flushSync }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("react-dom"),
  ]);
  const root = createRoot(host, { onUncaughtError: onError, onCaughtError: onError });
  flushSync(() => root.render(createElement(App)));
  return {
    animated: false,
    playing: false,
    setPlaying() {},
    destroy: () => root.unmount(),
  };
}

export interface RunOptions {
  mode: PlaygroundMode;
  loop?: number;
  still?: number;
  /** Errors the React tree throws after it mounted. */
  onError: (error: unknown) => void;
}

/** Mounts the code's default export into `host`: a caption (as in a docs demo) or a React component. */
export async function run(
  host: HTMLElement,
  code: string,
  { mode, loop, still, onError }: RunOptions,
): Promise<DemoView> {
  const [value] = await Promise.all([evaluate(code, mode), loadFontStylesheet()]);
  if (mode === "react") {
    if (typeof value !== "function") throw new Error("The default export must be a React component.");
    return mountReact(host, value as ComponentType, onError);
  }
  return mountDemo(host, value as DemoExport, { loop, still });
}
