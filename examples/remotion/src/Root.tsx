import type { ReactNode } from "react";
import { Composition, Series } from "remotion";
import { LOWER_THIRD_DURATION, LowerThird } from "./compositions/LowerThird";
import { Subtitles, SUBTITLES_DURATION } from "./compositions/Subtitles";
import { Variety, VARIETY_DURATION } from "./compositions/Variety";
import { FontGate } from "./fonts";

const withFonts = (Component: () => ReactNode) => () => (
  <FontGate>
    <Component />
  </FontGate>
);

const Showcase = () => (
  <Series>
    <Series.Sequence durationInFrames={VARIETY_DURATION}>
      <Variety />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SUBTITLES_DURATION}>
      <Subtitles />
    </Series.Sequence>
    <Series.Sequence durationInFrames={LOWER_THIRD_DURATION}>
      <LowerThird />
    </Series.Sequence>
  </Series>
);

const video = { fps: 30, width: 1920, height: 1080 };

export const Root = () => (
  <>
    <Composition
      id="Showcase"
      component={withFonts(Showcase)}
      durationInFrames={VARIETY_DURATION + SUBTITLES_DURATION + LOWER_THIRD_DURATION}
      {...video}
    />
    <Composition id="Variety" component={withFonts(Variety)} durationInFrames={VARIETY_DURATION} {...video} />
    <Composition id="Subtitles" component={withFonts(Subtitles)} durationInFrames={SUBTITLES_DURATION} {...video} />
    <Composition id="LowerThird" component={withFonts(LowerThird)} durationInFrames={LOWER_THIRD_DURATION} {...video} />
  </>
);
