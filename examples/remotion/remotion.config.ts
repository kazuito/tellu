import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./webpack-override";

// PixiJS needs WebGL in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");

Config.overrideWebpackConfig(webpackOverride);
