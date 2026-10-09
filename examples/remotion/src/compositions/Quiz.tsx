import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, parseMarkup, shadow, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const QUIZ_DURATION = 300;

const COUNTDOWN_START = 70;
const REVEAL = 220;

const CHOICES = ["Telephone Operator", "Television Opaque Projector", "Tele-Optical Lettering", "Title Overlay Panel"];
const ANSWER = 1;

const question: Partial<TextStyle> = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 72,
  layers: [stroke(10, "#0d1b4c"), fill("#ffffff")],
};

const choice: Partial<TextStyle> = {
  fontFamily: [FONTS.latin, FONTS.gothic],
  fontWeight: 900,
  fontSize: 52,
  layers: [fill("#ffffff")],
};

const Question = () => {
  const frame = useCurrentFrame();
  const open = ramp(frame, 0, 10, easeOut);
  return (
    <Text
      text={parseMarkup("<q>Q.3</q>　「テロップ」の語源になった英語は？", {
        q: {
          fontFamily: FONTS.latin,
          fontSize: 88,
          layers: { 1: { paint: linearGradient(["#fff6b7", "#ffd200", "#f7971e"]) } },
        },
      })}
      textStyle={question}
      maxWidth={1500}
      wrap="none"
      overflow="shrink"
      align="center"
      background={{
        paint: linearGradient(["#1e3c72", "#2a5298"], { scope: "block" }),
        padding: [48, 28],
        radius: 24,
        stroke: { width: 6, paint: "#ffffff" },
      }}
      anchor="top"
      style={{ position: "absolute", left: 960, top: 120, scale: `1 ${open}` }}
      glyphTransform={(glyph) => {
        const t = ramp(frame, 8 + glyph.visibleIndex * 1.2, 8, easeOut);
        return { opacity: t, y: (1 - t) * 30 };
      }}
    />
  );
};

const Choice = ({ index }: { index: number }) => {
  const frame = useCurrentFrame();
  const column = index % 2;
  const enter = ramp(frame, 30 + index * 6, 14, easeOut);
  const revealed = frame >= REVEAL;
  const correct = index === ANSWER;
  const highlight = revealed && correct;
  const bump = highlight ? Math.sin(ramp(frame, REVEAL, 12) * Math.PI) * 0.08 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: column === 0 ? 190 : 990,
        top: 450 + Math.floor(index / 2) * 190,
        width: 740,
        height: 140,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        paddingLeft: 44,
        borderRadius: 70,
        border: highlight ? "8px solid #ffffff" : "4px solid #8fb8ff",
        background: highlight ? "linear-gradient(90deg, #ff416c, #ff9f43)" : "linear-gradient(90deg, #16213e, #1f4287)",
        translate: `${(1 - enter) * (column === 0 ? -1300 : 1300)}px 0`,
        scale: String(1 + bump),
        opacity: revealed && !correct ? 0.35 : 1,
      }}
    >
      <Text
        text={parseMarkup(`<k>${"ABCD"[index]}</k>　${CHOICES[index]}`, {
          k: { fontSize: 64, layers: [fill(highlight ? "#ffffff" : "#ffd400")] },
        })}
        textStyle={choice}
        maxWidth={640}
        wrap="none"
        overflow="squeeze"
      />
    </div>
  );
};

const Timer = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = ramp(frame, COUNTDOWN_START, REVEAL - COUNTDOWN_START);
  const remaining = Math.ceil((1 - progress) * ((REVEAL - COUNTDOWN_START) / fps));
  const tick = 1 - Math.min(1, ((frame - COUNTDOWN_START) % fps) / 8);
  const visible = ramp(frame, COUNTDOWN_START - 10, 10) - ramp(frame, REVEAL, 8);
  return (
    <div
      style={{
        position: "absolute",
        left: 960,
        top: 920,
        width: 170,
        height: 170,
        translate: "-50% -50%",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        opacity: visible,
        background: `conic-gradient(#ffd400 ${(1 - progress) * 360}deg, rgba(255,255,255,0.15) 0)`,
      }}
    >
      <div
        style={{
          width: 138,
          height: 138,
          borderRadius: "50%",
          background: "#14123a",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Text
          text={String(remaining)}
          textStyle={{
            fontFamily: FONTS.latin,
            fontWeight: 900,
            fontSize: 84,
            layers: [fill(remaining <= 3 ? "#ff4d4d" : "#ffffff")],
          }}
          glyphTransform={() => ({ scale: 1 + tick * 0.3 })}
        />
      </div>
    </div>
  );
};

const Correct = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <Text
      text="正解！"
      textStyle={{
        fontFamily: FONTS.heavy,
        fontWeight: 400,
        fontSize: 120,
        layers: [
          shadow({ offset: [8, 10], blur: 6, stroke: 22, color: "rgba(0,0,0,0.4)" }),
          stroke(22, "#ffffff"),
          stroke(11, "#e60012"),
          fill(linearGradient(["#ff8a8a", "#e60012"])),
        ],
      }}
      anchor="center"
      style={{
        position: "absolute",
        left: 1640,
        top: 400,
        rotate: "-12deg",
        scale: String(3 - 2 * slam),
        opacity: Math.min(1, slam * 2),
      }}
    />
  );
};

const Explanation = () => {
  const frame = useCurrentFrame();
  return (
    <Text
      text={parseMarkup("<h>TEL</h>evision <h>OP</h>aque projector の略", {
        h: { layers: { 1: { paint: "#ffd400" } } },
      })}
      textStyle={{
        fontFamily: [FONTS.latin, FONTS.gothic],
        fontWeight: 900,
        fontSize: 56,
        layers: [stroke(10, "#14123a"), fill("#ffffff")],
      }}
      anchor="center"
      style={{ position: "absolute", left: 960, top: 900 }}
      glyphTransform={(glyph) => {
        const t = ramp(frame, glyph.visibleIndex * 0.8, 8, easeOut);
        return { opacity: t, scale: 0.6 + 0.4 * t };
      }}
    />
  );
};

export const Quiz = () => (
  <AbsoluteFill>
    <Background from="#2b1055" to="#7597de" />
    <Question />
    {CHOICES.map((_, index) => (
      <Choice key={index} index={index} />
    ))}
    <Timer />
    <Sequence from={REVEAL + 4} layout="none">
      <Correct />
    </Sequence>
    <Sequence from={REVEAL + 24} layout="none">
      <Explanation />
    </Sequence>
  </AbsoluteFill>
);
