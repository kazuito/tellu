import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, parseMarkup, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const RECIPE_DURATION = 240;

const STEP_FRAME = 90;

const step: Partial<TextStyle> = {
  fontFamily: FONTS.rounded,
  fontWeight: 900,
  fontSize: 68,
  layers: [{ id: "marker", paint: "#ffd43b", stroke: 34, visible: false }, stroke(12, "#ffffff"), fill("#5a3a1a")],
};

const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Text
      text={parseMarkup("<s>〜 かんたん15分 〜</s><br/>ふわとろオムライス", {
        s: { fontSize: 40, layers: [stroke(8, "#ffffff"), fill("#d2691e")] },
      })}
      textStyle={{
        fontFamily: FONTS.rounded,
        fontWeight: 900,
        fontSize: 104,
        lineHeight: 1.25,
        layers: [stroke(22, "#a0522d"), stroke(12, "#ffffff"), fill("#e8590c")],
      }}
      style={{ position: "absolute", left: 90, top: 70 }}
      glyphTransform={(glyph) => {
        const t = spring({ frame: frame - glyph.visibleIndex * 2, fps, config: { damping: 10 } });
        return { scale: t, rotation: (1 - t) * -30 };
      }}
    />
  );
};

const Step = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  return (
    <Text
      text={parseMarkup("バターを溶かし、卵液を<mk>一気に</mk>流し込む", {
        mk: { layers: { marker: { visible: true } } },
      })}
      textStyle={step}
      style={{ position: "absolute", left: 120, top: 880, translate: `0 ${(1 - enter) * 260}px` }}
      glyphTransform={(glyph) => {
        const t = ramp(frame, 6 + glyph.visibleIndex * 1.2, 6, easeOut);
        return { opacity: t, y: (1 - t) * 20 };
      }}
    />
  );
};

export const Recipe = () => (
  <AbsoluteFill>
    <Background from="#f6d365" to="#fda085" />
    <Title />
    <Sequence from={STEP_FRAME} layout="none">
      <Step />
    </Sequence>
  </AbsoluteFill>
);
