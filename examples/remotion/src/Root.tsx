import type { ReactNode } from "react";
import { Composition, Series } from "remotion";
import { CINEMA_DURATION, Cinema } from "./compositions/Cinema";
import { CREDITS_DURATION, Credits } from "./compositions/Credits";
import { GAME_STREAM_DURATION, GameStream } from "./compositions/GameStream";
import { LOWER_THIRD_DURATION, LowerThird } from "./compositions/LowerThird";
import { NEWS_DURATION, News } from "./compositions/News";
import { QUIZ_DURATION, Quiz } from "./compositions/Quiz";
import { RECIPE_DURATION, Recipe } from "./compositions/Recipe";
import { SALE_DURATION, Sale } from "./compositions/Sale";
import { SHORTS_DURATION, Shorts } from "./compositions/Shorts";
import { SUBTITLES_DURATION, Subtitles } from "./compositions/Subtitles";
import { VARIETY_DURATION, Variety } from "./compositions/Variety";
import { FontGate } from "./fonts";

const withFonts = (Component: () => ReactNode) => () => (
  <FontGate>
    <Component />
  </FontGate>
);

const SCENES = [
  { id: "Variety", component: Variety, durationInFrames: VARIETY_DURATION },
  { id: "Subtitles", component: Subtitles, durationInFrames: SUBTITLES_DURATION },
  { id: "LowerThird", component: LowerThird, durationInFrames: LOWER_THIRD_DURATION },
  { id: "News", component: News, durationInFrames: NEWS_DURATION },
  { id: "Quiz", component: Quiz, durationInFrames: QUIZ_DURATION },
  { id: "Recipe", component: Recipe, durationInFrames: RECIPE_DURATION },
  { id: "Sale", component: Sale, durationInFrames: SALE_DURATION },
  { id: "GameStream", component: GameStream, durationInFrames: GAME_STREAM_DURATION },
  { id: "Cinema", component: Cinema, durationInFrames: CINEMA_DURATION },
  { id: "Credits", component: Credits, durationInFrames: CREDITS_DURATION },
];

const Showcase = () => (
  <Series>
    {SCENES.map(({ id, component: Scene, durationInFrames }) => (
      <Series.Sequence key={id} durationInFrames={durationInFrames}>
        <Scene />
      </Series.Sequence>
    ))}
  </Series>
);

const video = { fps: 30, width: 1920, height: 1080 };

export const Root = () => (
  <>
    <Composition
      id="Showcase"
      component={withFonts(Showcase)}
      durationInFrames={SCENES.reduce((sum, scene) => sum + scene.durationInFrames, 0)}
      {...video}
    />
    {SCENES.map(({ id, component, durationInFrames }) => (
      <Composition key={id} id={id} component={withFonts(component)} durationInFrames={durationInFrames} {...video} />
    ))}
    <Composition
      id="Shorts"
      component={withFonts(Shorts)}
      durationInFrames={SHORTS_DURATION}
      {...video}
      width={1080}
      height={1920}
    />
  </>
);
