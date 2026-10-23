import { AbsoluteFill, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, shadow, stroke } from "tellu";
import { Text } from "tellu/remotion";
import { ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const GAME_STREAM_DURATION = 180;

const Setup = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text="ここで まさかの…"
      textStyle={{
        fontFamily: FONTS.pop,
        fontWeight: 400,
        fontSize: 72,
        layers: [stroke(14, "#000000"), stroke(7, "#ffffff"), fill("#222222")],
      }}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 900 }}
      glyphTransform={(glyph) => ({ opacity: ramp(frame, glyph.visibleIndex * 3, 4) })}
    />
  );
};

const Reaction = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 7, stiffness: 240 } });
  const shake = Math.max(0, 1 - frame / 20) * 16;
  return (
    <Text
      text="神回避！！"
      textStyle={{
        fontFamily: FONTS.brush,
        fontWeight: 400,
        fontSize: 200,
        letterSpacing: 6,
        layers: [
          shadow({ offset: [0, 14], blur: 10, stroke: 34, color: "rgba(0,0,0,0.5)" }),
          stroke(34, "#111111"),
          stroke(20, "#ffffff"),
          fill(
            linearGradient(["#ff5f6d", "#ffc371", "#fff95b", "#7cff6b", "#4facfe", "#b56cff"], {
              angle: 90,
              scope: "line",
            }),
          ),
        ],
      }}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 560, scale: String(0.4 + 0.6 * slam) }}
      glyphTransform={(glyph) => ({
        x: (random(`gx${glyph.index}-${frame}`) - 0.5) * shake,
        y: (random(`gy${glyph.index}-${frame}`) - 0.5) * shake + Math.sin(frame / 5 + glyph.index) * 6,
        rotation: (random(`gr${glyph.index}`) - 0.5) * 14,
      })}
    />
  );
};

export const GameStream = () => (
  <AbsoluteFill>
    <Background from="#0f2027" to="#203a43" />
    <Sequence from={10} durationInFrames={50} layout="none">
      <Setup />
    </Sequence>
    <Sequence from={60} durationInFrames={110} layout="none">
      <Reaction />
    </Sequence>
  </AbsoluteFill>
);
