import type { WebpackOverrideFn } from "@remotion/bundler";

// Resolve the workspace `tellu` package to its TypeScript source (see `devExports` in its tsdown config).
export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    conditionNames: ["tellu-source", "..."],
  },
});
