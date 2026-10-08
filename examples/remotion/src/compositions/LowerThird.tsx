import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { linearGradient } from "tixi";
import { Text } from "tixi/remotion";
import { Background } from "../components/Background";
import { lowerThirdName, lowerThirdTitle } from "../styles";

export const LOWER_THIRD_DURATION = 150;

export const LowerThird = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ease = Easing.out(Easing.cubic);
  const enter = (start: number) =>
    interpolate(frame, [start, start + 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    });
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <Background from="#141e30" to="#243b55" />
      <div style={{ position: "absolute", left: 120, top: 760, translate: `${-exit * 900}px 0` }}>
        <Text
          text="山田 太郎"
          textStyle={lowerThirdName}
          background={{
            paint: linearGradient(["#0052d4", "#4364f7", "#6fb1fc"], { angle: 90, scope: "block" }),
            padding: [44, 16],
            radius: 4,
          }}
          style={{ display: "block", translate: `${(enter(0) - 1) * 900}px 0` }}
          glyphTransform={(glyph) => {
            const t = interpolate(frame - 6 - glyph.visibleIndex * 2, [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            });
            return { opacity: t, x: (1 - t) * 40 };
          }}
        />
        <Text
          text="株式会社テロップ研究所 フロントエンドエンジニア / PixiJS 愛好家"
          textStyle={lowerThirdTitle}
          maxWidth={620}
          wrap="none"
          overflow="shrink"
          background={{ paint: "rgba(255,255,255,0.95)", padding: [44, 12], radius: 4 }}
          style={{ display: "block", marginTop: 30, translate: `${(enter(8) - 1) * 900}px 0` }}
        />
      </div>
    </AbsoluteFill>
  );
};
