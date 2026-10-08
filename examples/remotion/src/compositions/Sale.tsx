import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, parseMarkup, shadow, stroke, type TextStyle } from "tixi";
import { Text } from "tixi/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const SALE_DURATION = 240;

const STAR = Array.from({ length: 48 }, (_, i) => {
  const radius = i % 2 === 0 ? 50 : 41;
  const angle = (i / 48) * Math.PI * 2;
  return `${50 + radius * Math.cos(angle)}% ${50 + radius * Math.sin(angle)}%`;
}).join(",");

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

const Ribbon = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Text
      text="期間限定"
      textStyle={{
        fontFamily: FONTS.heavy,
        fontWeight: 400,
        fontSize: 64,
        letterSpacing: { em: 0.1 },
        layers: [fill("#ffffff")],
      }}
      background={{
        paint: linearGradient(["#ff1f4b", "#c40000"], { scope: "block" }),
        padding: [40, 16],
        stroke: { width: 5, paint: "#ffe14d" },
      }}
      style={{
        position: "absolute",
        left: 110,
        top: 80,
        rotate: "-8deg",
        scale: String(spring({ frame, fps, config: { damping: 9 } })),
      }}
    />
  );
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
        left: 800,
        top: 580,
        scale: String(2.4 - 1.4 * slam),
        opacity: Math.min(1, slam * 3),
      }}
    />
  );
};

const Burst = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 1660,
        top: 540,
        width: 340,
        height: 340,
        translate: "-50% -50%",
        scale: String(pop),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `polygon(${STAR})`,
          background: "#e60012",
          rotate: `${frame * 0.8}deg`,
        }}
      />
      <Text
        text={parseMarkup("<n>50</n>%<br/>OFF", { n: { fontSize: 120 } })}
        textStyle={{
          fontFamily: FONTS.latin,
          fontWeight: 900,
          fontSize: 72,
          lineHeight: 0.95,
          layers: [stroke(6, "#8a0000"), fill("#ffffff")],
        }}
        align="center"
        anchor="center"
        style={{ position: "absolute", left: "50%", top: "50%", rotate: "8deg" }}
      />
    </div>
  );
};

const CallNow = () => {
  const frame = useCurrentFrame();
  const enter = ramp(frame, 0, 12, easeOut);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 820,
        height: 170,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        background: "linear-gradient(#ffffff, #ffeec2)",
        borderTop: "6px solid #e60012",
        borderBottom: "6px solid #e60012",
        translate: `0 ${(1 - enter) * 300}px`,
      }}
    >
      <Text
        text={"今すぐ\nお電話を！"}
        textStyle={{
          fontFamily: FONTS.gothic,
          fontWeight: 900,
          fontSize: 40,
          lineHeight: 1.15,
          layers: [fill("#e60012")],
        }}
        glyphTransform={() => ({ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0.4 })}
      />
      <Text
        text={parseMarkup("<s>フリーダイヤル</s>0120-000-000", {
          s: { fontFamily: FONTS.gothic, fontWeight: 900, fontSize: 40, baselineShift: 10, layers: [fill("#00843d")] },
        })}
        textStyle={{
          fontFamily: FONTS.heavy,
          fontWeight: 400,
          fontSize: 110,
          letterSpacing: { em: 0.02 },
          layers: [fill("#00843d")],
        }}
      />
    </div>
  );
};

const Disclaimer = () => (
  <Text
    text="※画像はイメージです。※お一人様3点まで。※送料は別途かかります。"
    textStyle={{
      fontFamily: FONTS.gothic,
      fontWeight: 500,
      fontSize: 26,
      layers: [stroke(4, "rgba(0,0,0,0.6)"), fill("#ffffff")],
    }}
    style={{ position: "absolute", left: 40, top: 1030 }}
  />
);

export const Sale = () => (
  <AbsoluteFill>
    <Background from="#f7971e" to="#ffd200" />
    <Ribbon />
    <Product />
    <Sequence from={20} layout="none">
      <OldPrice />
    </Sequence>
    <Sequence from={55} layout="none">
      <Price />
    </Sequence>
    <Sequence from={75} layout="none">
      <Burst />
    </Sequence>
    <Sequence from={100} layout="none">
      <CallNow />
    </Sequence>
    <Disclaimer />
  </AbsoluteFill>
);
