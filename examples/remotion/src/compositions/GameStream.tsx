import { useMemo } from "react";
import { AbsoluteFill, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, shadow, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const GAME_STREAM_DURATION = 240;

const COMMENT_FRAMES = 120;

interface Comment {
  text: string;
  start: number;
  row: number;
  color?: string;
  big?: boolean;
}

const COMMENTS: Comment[] = [
  { text: "わこつ", start: 0, row: 1 },
  { text: "きたあああ", start: 8, row: 4 },
  { text: "この縁取りどうなってんの", start: 18, row: 7 },
  { text: "初見です", start: 26, row: 2, color: "#7fdbff" },
  { text: "ここ難所", start: 40, row: 9 },
  { text: "wwwwwwww", start: 52, row: 5 },
  { text: "いけるか？", start: 60, row: 3 },
  { text: "がんばれー", start: 68, row: 0, color: "#ffdc00" },
  { text: "!?", start: 88, row: 6, color: "#ff4136" },
  { text: "うおおおおおおお", start: 112, row: 4, big: true },
  { text: "神回避", start: 116, row: 1, color: "#ffdc00" },
  { text: "うますぎ", start: 120, row: 8 },
  { text: "8888888888", start: 124, row: 6, color: "#2ecc40" },
  { text: "今の何！？", start: 130, row: 2 },
  { text: "クリップ確定", start: 138, row: 0, color: "#f012be" },
  { text: "人間やめてる", start: 150, row: 7 },
  { text: "wwwwwwwwwwwwwww", start: 158, row: 9 },
  { text: "GG", start: 170, row: 3, color: "#7fdbff" },
];

const nico: Partial<TextStyle> = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 52,
  layers: [stroke(4, "rgba(0,0,0,0.8)"), fill("#ffffff")],
};

const FlowingComment = ({ comment }: { comment: Comment }) => {
  const frame = useCurrentFrame();
  const progress = frame / COMMENT_FRAMES;
  const label = useMemo(
    () => (
      <Text
        text={comment.text}
        textStyle={{
          ...nico,
          fontSize: comment.big ? 120 : 52,
          layers: [stroke(comment.big ? 7 : 4, "rgba(0,0,0,0.8)"), fill(comment.color ?? "#ffffff")],
        }}
      />
    ),
    [comment],
  );
  return (
    <div
      style={{
        position: "absolute",
        left: (1 - progress) * 1920,
        top: 40 + comment.row * 76,
        translate: `${-progress * 100}% 0`,
        opacity: 0.92,
      }}
    >
      {label}
    </div>
  );
};

const StreamTitle = () => (
  <Text
    text="【実況】テロップで遊ぶ　#12"
    textStyle={{ fontFamily: FONTS.gothic, fontWeight: 900, fontSize: 32, layers: [fill("#ffffff")] }}
    background={{ paint: "rgba(145,70,255,0.9)", padding: [20, 10], radius: 8 }}
    style={{ position: "absolute", left: 40, top: 1010 }}
  />
);

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
    <Sequence from={60} durationInFrames={50} layout="none">
      <Setup />
    </Sequence>
    <Sequence from={110} durationInFrames={110} layout="none">
      <Reaction />
    </Sequence>
    {COMMENTS.map((comment) => (
      <Sequence key={comment.start} from={comment.start} durationInFrames={COMMENT_FRAMES} layout="none">
        <FlowingComment comment={comment} />
      </Sequence>
    ))}
    <StreamTitle />
  </AbsoluteFill>
);
