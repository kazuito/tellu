import { $ } from "bun";

// Renders representative frames of each composition into out/stills for a quick visual check.
const frames: Record<string, number[]> = {
  Variety: [8, 40, 100, 150],
  Subtitles: [40, 110, 200, 300],
  LowerThird: [10, 60, 145],
};

for (const [composition, list] of Object.entries(frames)) {
  for (const frame of list) {
    await $`remotion still src/index.ts ${composition} out/stills/${composition}-${frame}.png --frame=${frame}`;
  }
}
