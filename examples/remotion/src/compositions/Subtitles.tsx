import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, shadow, stroke } from "tixi";
import { Telop } from "tixi/remotion";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";
import { speakerColors, subtitle } from "../styles";

type Speaker = keyof typeof speakerColors;

interface Line {
  speaker: Speaker;
  name: string;
  text: string;
  /** Seconds. */
  start: number;
  end: number;
}

export const SCRIPT: Line[] = [
  { speaker: "A", name: "ずんだ", text: "テロップって、CSSだけだと限界あるよね", start: 0.2, end: 2.6 },
  { speaker: "B", name: "めたん", text: "縁取りを何重にも重ねたり、ぼかした影を付けたり", start: 2.8, end: 5.4 },
  { speaker: "A", name: "ずんだ", text: "それ全部、tixiならレイヤーを並べるだけ！", start: 5.6, end: 8.0 },
  {
    speaker: "B",
    name: "めたん",
    text: "カラオケ風のワイプも、テロップを重ねて切り抜くだけです",
    start: 8.2,
    end: 11.0,
  },
];

export const SUBTITLES_DURATION = Math.ceil(11.4 * 30);

/** Two identical telops; the colored copy is revealed left to right with clip-path. */
const KaraokeLine = ({ line }: { line: Line }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [6, durationInFrames - 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 5, durationInFrames - 5, durationInFrames], [0, 1, 1, 0]);
  const lift = interpolate(frame, [0, 8], [20, 0], { extrapolateRight: "clamp" });
  const color = speakerColors[line.speaker];

  return (
    <div style={{ position: "absolute", left: 960, top: 1000, translate: `-50% calc(-100% + ${lift}px)`, opacity }}>
      <Telop
        text={line.name}
        textStyle={{ fontFamily: FONTS.gothic, fontWeight: 900, fontSize: 34, layers: [fill("#111111")] }}
        background={{ paint: color, padding: [18, 6], radius: 999 }}
        style={{ display: "block", marginBottom: 22, marginLeft: 8 }}
      />
      <div style={{ position: "relative" }}>
        <Telop text={line.text} textStyle={subtitle} />
        <Telop
          text={line.text}
          textStyle={{
            ...subtitle,
            layers: [
              shadow({ offset: [0, 4], blur: 6, stroke: 10, color: "rgba(0,0,0,0.6)" }),
              stroke(10, "#000000"),
              fill(color),
            ],
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            clipPath: `inset(-60px ${progress >= 1 ? "-60px" : `${(1 - progress) * 100}%`} -60px -60px)`,
          }}
        />
      </div>
    </div>
  );
};

export const Subtitles = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background from="#0f2027" to="#2c5364" />
      {SCRIPT.map((line, index) => (
        <Sequence
          key={index}
          from={Math.round(line.start * fps)}
          durationInFrames={Math.round((line.end - line.start) * fps)}
          layout="none"
        >
          <KaraokeLine line={line} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
