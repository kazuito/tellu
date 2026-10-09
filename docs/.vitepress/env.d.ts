/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent;
  export default component;
}

declare module "virtual:tellu-demos" {
  import type { DemoExport } from "./theme/demo/runtime";

  const demos: Record<string, () => Promise<{ default: DemoExport }>>;
  export default demos;
}

declare module "virtual:tellu-playground-presets" {
  import type { PlaygroundPreset } from "./theme/playground/presets";

  const presets: PlaygroundPreset[];
  export default presets;
}

declare module "virtual:tellu-playground-types" {
  /** Declaration file contents keyed by the `file:///` path the editor resolves them at. */
  const types: Record<string, string>;
  export default types;
}

declare module "*.css";
