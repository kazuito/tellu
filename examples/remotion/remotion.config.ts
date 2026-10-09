import { Config } from "@remotion/cli/config";

// PixiJS needs WebGL in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");
