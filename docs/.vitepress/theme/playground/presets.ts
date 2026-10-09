import examplePresets from "virtual:tellu-playground-presets";
import animated from "./presets/animated.tsx?raw";
import hello from "./presets/hello.tsx?raw";
import liveInput from "./presets/live-input.tsx?raw";
import lowerThird from "./presets/lower-third.tsx?raw";

export type PlaygroundMode = "ts" | "react";

export interface PlaygroundPreset {
  id: string;
  group: string;
  label: string;
  mode: PlaygroundMode;
  code: string;
  backdrop?: string;
  /** Frames (30 fps) before an animated caption starts over. */
  loop?: number;
  still?: number;
}

const react = (id: string, label: string, code: string, backdrop?: string): PlaygroundPreset => ({
  id: `react/${id}`,
  group: "React",
  label,
  mode: "react",
  code,
  backdrop,
});

/** TypeScript presets are the demos of the Examples pages; React presets live in `./presets`. */
export const presets: readonly PlaygroundPreset[] = [
  ...examplePresets,
  react("hello", "Hello, <Text>", hello),
  react("live-input", "Live input", liveInput),
  react("animated", "Animation hook", animated, "studio"),
  react("lower-third", "Lower third", lowerThird, "street"),
];
