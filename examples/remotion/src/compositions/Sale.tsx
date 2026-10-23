import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, parseMarkup, shadow, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const SALE_DURATION = 150;

const price: Partial<TextStyle> = {
  fontFamily: FONTS.heavy,
  fontWeight: 400,
  fontSize: 230,
  layers: [
    shadow({ offset: [10, 14], blur: 4, stroke: 34, color: "rgba(90,0,0,0.45)" }),
    stroke(34, "#ffffff"),
    stroke(18, "#c40000"),
    fill(linearGradient(["#fffbe0", "#ffd200", "#ff8c00"], { scope: "line" })),
  ],
};

const Product = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text={parseMarkup("ふわもち枕<sub> PREMIUM</sub>", {
        sub: {
          fontFamily: FONTS.latin,
          fontSize: 52,
          letterSpacing: { em: 0.12 },
          baselineShift: 8,
          layers: [stroke(8, "#ffffff"), fill("#c2410c")],
        },
      })}
      textStyle={{
        fontFamily: FONTS.rounded,
        fontWeight: 900,
        fontSize: 96,
        layers: [stroke(10, "#ffffff"), fill("#7a3e00")],
      }}
      anchor="top"
      style={{ position: "absolute", left: 960, top: 110 }}
      glyphTransform={(glyph) => {
        const t = ramp(frame, 6 + glyph.visibleIndex * 1.5, 10, easeOut);
        return { opacity: t, y: (1 - t) * -40 };
      }}
    />
  );
};

const OldPrice = () => {
  const frame = useCurrentFrame();
  const strike = ramp(frame, 25, 10, easeOut);
  return (
    <div style={{ position: "absolute", left: 960, top: 300, translate: "-50% 0", opacity: ramp(frame, 0, 8) }}>
      <Text
        text="通常価格 ¥19,800"
        textStyle={{
          fontFamily: FONTS.gothic,
          fontWeight: 900,
          fontSize: 56,
          layers: [stroke(8, "#ffffff"), fill("#5a3a1a")],
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -10,
          top: "52%",
          height: 8,
          width: `calc(${strike * 100}% + 20px)`,
          background: "#e60012",
          borderRadius: 4,
          rotate: "-4deg",
          transformOrigin: "left center",
        }}
      />
    </div>
  );
};

const Price = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
  return (
    <Text
      text={parseMarkup("<y>¥</y>9,800<t>(税込)</t>", {
        y: { fontSize: 140 },
        t: {
          fontFamily: FONTS.gothic,
          fontWeight: 900,
          fontSize: 52,
          layers: [stroke(10, "#ffffff"), fill("#c40000")],
        },
      })}
      textStyle={price}
      anchor="center"
      style={{
        position: "absolute",
        left: 960,
        top: 620,
        scale: String(2.4 - 1.4 * slam),
        opacity: Math.min(1, slam * 3),
      }}
    />
  );
};

export const Sale = () => (
  <AbsoluteFill>
    <Background from="#f7971e" to="#ffd200" />
    <Product />
    <Sequence from={20} layout="none">
      <OldPrice />
    </Sequence>
    <Sequence from={55} layout="none">
      <Price />
    </Sequence>
  </AbsoluteFill>
);
