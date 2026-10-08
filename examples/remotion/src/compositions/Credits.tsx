import { memo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { fill, glow, type TextStyle } from "tixi";
import { Text } from "tixi/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const CREDITS_DURATION = 330;

const ROLL_SPEED = 5;

const STAFF = [
  { role: "企画・構成", names: ["山田 太郎"] },
  { role: "テロップデザイン", names: ["佐藤 花子", "鈴木 一郎"] },
  { role: "モーション", names: ["高橋 美咲"] },
  { role: "レンダリング", names: ["PixiJS"] },
  { role: "動画編集", names: ["Remotion"] },
  { role: "フォント", names: ["Noto Sans JP", "Noto Serif JP", "Dela Gothic One", "Zen Maru Gothic", "Montserrat"] },
  { role: "音楽", names: ["テロップ・オーケストラ"] },
  { role: "制作", names: ["tixi project"] },
];

const role: Partial<TextStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 500,
  fontSize: 34,
  letterSpacing: { em: 0.2 },
  layers: [fill("#b9b4a8")],
};
const name: Partial<TextStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 900,
  fontSize: 52,
  lineHeight: 1.6,
  letterSpacing: { em: 0.08 },
  layers: [fill("#ffffff")],
};

const Roll = memo(() => (
  <div style={{ display: "flex", flexDirection: "column", gap: 90 }}>
    {STAFF.map((entry) => (
      <div key={entry.role} style={{ display: "flex", alignItems: "flex-start", gap: 70 }}>
        <Text text={entry.role} textStyle={role} maxWidth={760} align="right" style={{ marginTop: 18 }} />
        <Text text={entry.names.join("\n")} textStyle={name} />
      </div>
    ))}
  </div>
));

const ThankYou = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text="Thank you for watching"
      textStyle={{
        fontFamily: FONTS.serif,
        fontWeight: 900,
        fontSize: 84,
        letterSpacing: { em: 0.08 },
        layers: [glow({ color: "rgba(255,220,160,0.6)", stroke: 2, blur: 20 }), fill("#fff6e0")],
      }}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 540 }}
      glyphTransform={(glyph) => {
        const t = ramp(frame, glyph.visibleIndex * 1.5, 18, easeOut);
        return { opacity: t, y: (1 - t) * 16 };
      }}
    />
  );
};

export const Credits = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: 0.35 }}>
        <Background from="#000000" to="#1a1a2e" />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 1080 - frame * ROLL_SPEED, opacity: 1 - ramp(frame, 220, 30) }}>
        <Roll />
      </div>
      <Sequence from={250} layout="none">
        <ThankYou />
      </Sequence>
    </AbsoluteFill>
  );
};
