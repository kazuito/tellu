import { $ } from "bun";

// Renders representative frames of each composition into out/stills for a quick visual check.
const frames: Record<string, number[]> = {
  Variety: [8, 40, 100, 150],
  Subtitles: [40, 110, 200, 300],
  LowerThird: [10, 60, 145],
  News: [20, 100, 200],
  Quiz: [20, 150, 270],
  Recipe: [40, 120, 200],
  Sale: [30, 70, 180],
  GameStream: [80, 130, 200],
  Cinema: [40, 100, 160, 230],
  Documentary: [30, 150],
  Credits: [60, 200, 300],
  Shorts: [35, 70, 120, 170],
};

const only = process.argv.slice(2);
for (const [composition, list] of Object.entries(frames)) {
  if (only.length > 0 && !only.includes(composition)) continue;
  for (const frame of list) {
    await $`remotion still src/index.ts ${composition} out/stills/${composition}-${frame}.png --frame=${frame}`;
  }
}
