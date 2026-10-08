import { AbsoluteFill, Easing, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { linearGradient } from "tixi";
import { Text } from "tixi/remotion";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";
import { note, punchline, variety } from "../styles";

export const VARIETY_DURATION = 180;

const CornerTitle = () => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 14], [-700, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <Text
      text="検証！PixiJSで本格テロップは作れるのか？"
      textStyle={{ fontFamily: FONTS.gothic, fontWeight: 900, fontSize: 52, layers: [{ paint: "#ffffff" }] }}
      maxWidth={760}
      wrap="none"
      overflow="shrink"
      background={{
        paint: linearGradient(["#ff3b30", "#ff9500"], { angle: 90, scope: "block" }),
        padding: [28, 14],
        radius: 10,
        stroke: { width: 4, paint: "#ffffff" },
      }}
      style={{ position: "absolute", left: 80, top: 70, translate: `${slide}px 0` }}
    />
  );
};

const PopIn = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <Text
      text="できた！！"
      textStyle={{ ...variety, fontSize: 200 }}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 500 }}
      glyphTransform={(glyph) => {
        const progress = spring({ frame: frame - glyph.visibleIndex * 4, fps, config: { damping: 9, stiffness: 160 } });
        return {
          scale: progress * exit,
          rotation: (1 - progress) * (glyph.index % 2 === 0 ? -40 : 40),
          y: (1 - progress) * -120,
          origin: [0.5, 1],
        };
      }}
    />
  );
};

const Punchline = () => {
  const frame = useCurrentFrame();
  const impact = interpolate(frame, [0, 6], [2.2, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });
  const shake = interpolate(frame, [0, 24], [18, 0], { extrapolateRight: "clamp" });
  return (
    <Text
      text="いや、縁取り何重やねん！"
      textStyle={punchline}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 560, scale: String(impact) }}
      glyphTransform={(glyph) => ({
        x: (random(`x${glyph.index}-${frame}`) - 0.5) * shake,
        y: (random(`y${glyph.index}-${frame}`) - 0.5) * shake,
        rotation: (random(`r${glyph.index}`) - 0.5) * 10,
      })}
    />
  );
};

const Note = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text="※文字はすべてPixiJSで描画しています"
      textStyle={note}
      anchor="bottom-right"
      style={{ position: "absolute", left: 1840, top: 1010 }}
      glyphTransform={(glyph) => {
        const t = frame - glyph.visibleIndex * 1.5;
        return {
          opacity: interpolate(t, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          y: Math.sin(t / 6) * 4,
        };
      }}
    />
  );
};

export const Variety = () => (
  <AbsoluteFill>
    <Background from="#ff7e5f" to="#feb47b" />
    <CornerTitle />
    <Sequence from={10} durationInFrames={85} layout="none">
      <PopIn />
    </Sequence>
    <Sequence from={95} layout="none">
      <Punchline />
    </Sequence>
    <Sequence from={40} layout="none">
      <Note />
    </Sequence>
  </AbsoluteFill>
);
