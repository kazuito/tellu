import { Config } from "@remotion/cli/config";

// PixiJS needs WebGL in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");

// Resolve the workspace `tixi` package to its TypeScript source (see `devExports` in its tsdown config).
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    conditionNames: ["tixi-source", "..."],
  },
}));
