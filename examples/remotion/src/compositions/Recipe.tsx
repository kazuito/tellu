import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, parseMarkup, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const RECIPE_DURATION = 240;

const STEP_FRAME = 90;

const INGREDIENTS = ["卵 … 3個", "牛乳 … 大さじ2", "バター … 10g", "ケチャップライス … 300g"];

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

const Ingredients = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 1380, top: 110 }}>
      <Text
        text="材料（2人分）"
        textStyle={{ fontFamily: FONTS.rounded, fontWeight: 900, fontSize: 44, layers: [fill("#ffffff")] }}
        background={{ paint: "#a0522d", padding: [24, 10], radius: 999 }}
        style={{ display: "block", marginBottom: 30, opacity: ramp(frame, 0, 8) }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 26 }}>
        {INGREDIENTS.map((line, index) => {
          const t = ramp(frame, 6 + index * 8, 10, easeOut);
          return (
            <Text
              key={line}
              text={line}
              textStyle={{ fontFamily: FONTS.rounded, fontWeight: 900, fontSize: 40, layers: [fill("#5a3a1a")] }}
              background={{ paint: "rgba(255,255,255,0.88)", padding: [20, 6], radius: 8 }}
              style={{ opacity: t, translate: `${(1 - t) * 60}px 0` }}
            />
          );
        })}
      </div>
    </div>
  );
};

const Step = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        top: 860,
        display: "flex",
        alignItems: "center",
        gap: 60,
        translate: `0 ${(1 - enter) * 260}px`,
      }}
    >
      <Text
        text={parseMarkup("STEP<br/><n>2</n>", { n: { fontSize: 72 } })}
        textStyle={{
          fontFamily: FONTS.latin,
          fontWeight: 900,
          fontSize: 30,
          lineHeight: 0.95,
          layers: [fill("#ffffff")],
        }}
        align="center"
        background={{ paint: "#e8590c", padding: [26, 22], radius: 999, stroke: { width: 6, paint: "#ffffff" } }}
      />
      <Text
        text={parseMarkup("バターを溶かし、卵液を<mk>一気に</mk>流し込む", {
          mk: { layers: { marker: { visible: true } } },
        })}
        textStyle={step}
        glyphTransform={(glyph) => {
          const t = ramp(frame, 6 + glyph.visibleIndex * 1.2, 6, easeOut);
          return { opacity: t, y: (1 - t) * 20 };
        }}
      />
    </div>
  );
};

const Point = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 9 } });
  return (
    <Text
      text={parseMarkup("<p>POINT!</p> 火は中火のまま", { p: { fontFamily: FONTS.latin, layers: [fill("#fff3bf")] } })}
      textStyle={{ fontFamily: FONTS.rounded, fontWeight: 900, fontSize: 46, layers: [fill("#ffffff")] }}
      background={{ paint: "#2f9e44", padding: [30, 14], radius: 999 }}
      anchor="bottom"
      style={{
        position: "absolute",
        left: 1000,
        top: 780,
        rotate: "-4deg",
        scale: String(pop),
        translate: `-50% calc(-100% + ${Math.sin(frame / 8) * 6}px)`,
      }}
    />
  );
};

export const Recipe = () => (
  <AbsoluteFill>
    <Background from="#f6d365" to="#fda085" />
    <Title />
    <Sequence from={30} layout="none">
      <Ingredients />
    </Sequence>
    <Sequence from={STEP_FRAME} layout="none">
      <Step />
    </Sequence>
    <Sequence from={STEP_FRAME + 50} layout="none">
      <Point />
    </Sequence>
  </AbsoluteFill>
);
