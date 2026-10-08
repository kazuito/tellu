import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, glow, linearGradient, shadow, type TelopStyle } from "tixi";
import { Telop } from "tixi/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const CINEMA_DURATION = 270;

const LETTERBOX = 140;

const CUES = [
  { text: "－本当に行くのか？\n－ああ　夜が明ける前に", start: 125, end: 185 },
  { text: "この街の灯りを\n最後に見ておきたいんだ", start: 192, end: 262 },
];

const chapterTitle: Partial<TelopStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 900,
  fontSize: 128,
  letterSpacing: { em: 0.12 },
  layers: [
    glow({ color: "rgba(255,196,120,0.55)", stroke: 4, blur: 22 }),
    fill(linearGradient(["#fff4d6", "#e8b96a", "#a8742c"])),
  ],
};

const filmSubtitle: Partial<TelopStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 500,
  fontSize: 50,
  lineHeight: 1.5,
  letterSpacing: { em: 0.04 },
  layers: [shadow({ offset: [0, 2], blur: 4, stroke: 3, color: "rgba(0,0,0,0.85)" }), fill("#f4f1ea")],
};

const TitleCard = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeOut = 1 - ramp(frame, durationInFrames - 15, 15);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, opacity: fadeOut }}>
      <Telop
        text="第三章"
        textStyle={{ ...chapterTitle, fontSize: 44, letterSpacing: { em: 0.6 } }}
        glyphTransform={() => ({ opacity: ramp(frame, 0, 20) })}
      />
      <Telop
        text="夜明けの約束"
        textStyle={chapterTitle}
        glyphTransform={(glyph) => {
          const t = ramp(frame, 10, 50, easeOut);
          return { opacity: t, x: (glyph.indexInLine - (glyph.lineLength - 1) / 2) * (1 - t) * 40 };
        }}
      />
      <Telop
        text="CHAPTER III — A PROMISE AT DAWN"
        textStyle={{
          fontFamily: FONTS.serif,
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: { em: 0.45 },
          layers: [fill("#cbb994")],
        }}
        glyphTransform={() => ({ opacity: ramp(frame, 40, 20) })}
      />
    </AbsoluteFill>
  );
};

const Cue = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 3, durationInFrames - 3, durationInFrames], [0, 1, 1, 0]);
  return (
    <Telop
      text={text}
      textStyle={filmSubtitle}
      anchor="bottom"
      style={{ position: "absolute", left: 960, top: 1080 - LETTERBOX - 36, opacity }}
    />
  );
};

export const Cinema = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill
        style={{ filter: `brightness(${interpolate(frame, [0, 120], [0.35, 0.8], { extrapolateRight: "clamp" })})` }}
      >
        <Background from="#1b1c3a" to="#c47a52" />
      </AbsoluteFill>
      <Sequence durationInFrames={118} layout="none">
        <TitleCard />
      </Sequence>
      {CUES.map((cue) => (
        <Sequence key={cue.start} from={cue.start} durationInFrames={cue.end - cue.start} layout="none">
          <Cue text={cue.text} />
        </Sequence>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: LETTERBOX, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: LETTERBOX, background: "#000" }} />
    </AbsoluteFill>
  );
};
