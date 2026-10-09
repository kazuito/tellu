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

declare module "*.css";
