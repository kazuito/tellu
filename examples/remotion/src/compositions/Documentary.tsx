import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fill, glow, linearGradient, parseMarkup, shadow, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const DOCUMENTARY_DURATION = 240;

const title: Partial<TextStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 900,
  fontSize: 112,
  letterSpacing: { em: 0.08 },
  layers: [
    shadow({ color: "rgba(0,0,0,0.6)", offset: [6, 8], blur: 10, stroke: 10 }),
    stroke(10, "#1a0f08"),
    fill(linearGradient(["#ffffff", "#f3dfb4"], { angle: 180, scope: "line" })),
  ],
};

const episode: Partial<TextStyle> = {
  fontFamily: FONTS.serif,
  fontWeight: 900,
  fontSize: 52,
  letterSpacing: { em: 0.1 },
  layers: [stroke(8, "#7a1010"), fill("#ffffff")],
};

const narration: Partial<TextStyle> = {
  fontFamily: FONTS.gothic,
  fontWeight: 500,
  fontSize: 46,
  lineHeight: 1.7,
  letterSpacing: { em: 0.05 },
  layers: [glow({ color: "rgba(0,0,0,0.8)", stroke: 4, blur: 6 }), fill("#ffffff")],
};

/** Glyphs fade and slide in down the column, one after another. */
const reveal = (frame: number, start: number, step: number) => (glyph: { visibleIndex: number }) => {
  const t = ramp(frame, start + glyph.visibleIndex * step, 14, easeOut);
  return { opacity: t, y: (1 - t) * -24 };
};

export const Documentary = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [DOCUMENTARY_DURATION - 20, DOCUMENTARY_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ filter: "brightness(0.55) saturate(0.7)" }}>
        <Background from="#2a1a12" to="#8a6a48" />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Text
          text="第12話"
          writingMode="vertical-rl"
          textStyle={episode}
          background={{ paint: "#b3161b", radius: 4 }}
          style={{ position: "absolute", left: 1700, top: 120 }}
          glyphTransform={() => ({ opacity: ramp(frame, 0, 12) })}
        />
        <Text
          text={"京都・路地裏の\n小さな名店"}
          writingMode="vertical-rl"
          textStyle={title}
          style={{ position: "absolute", left: 1400, top: 120 }}
          glyphTransform={reveal(frame, 10, 3)}
        />
        <Text
          text={parseMarkup("創業<tcy>1952</tcy>年。\n三代目店主が守る\nちょっと不思議な\n「おばんざい」の味とは——", {
            tcy: { textCombineUpright: "all" },
          })}
          writingMode="vertical-rl"
          maxHeight={680}
          textStyle={narration}
          anchor="bottom-left"
          style={{ position: "absolute", left: 140, top: 960 }}
          glyphTransform={reveal(frame, 70, 1.5)}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
