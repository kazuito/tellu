import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react/index.ts",
    remotion: "src/remotion/index.ts",
  },
  format: ["esm"],
  platform: "browser",
  dts: true,
  exports: {
    // Workspace consumers that enable this condition use the TypeScript source directly.
    devExports: "tixi-source",
  },
});
