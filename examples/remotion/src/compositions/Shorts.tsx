import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, shadow, stroke, type TextStyle } from "tellu";
import { Text } from "tellu/remotion";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

const WORD_FRAMES = 11;
const FIRST_WORD = 20;

const PAGES = [
  ["CAPTIONS", "THAT", "POP"],
  ["KEEP", "PEOPLE", "WATCHING"],
  ["UNTIL", "THE", "VERY", "END."],
  ["TRY", "IT", "TODAY!"],
];
const PAGE_STARTS = PAGES.map((_, index) => FIRST_WORD + PAGES.slice(0, index).flat().length * WORD_FRAMES);
const WORD_COUNT = PAGES.flat().length;

export const SHORTS_DURATION = FIRST_WORD + WORD_COUNT * WORD_FRAMES + 40;

const caption: Partial<TextStyle> = {
  fontFamily: FONTS.latin,
  fontWeight: 900,
  fontSize: 88,
  layers: [shadow({ offset: [0, 10], blur: 0, stroke: 16, color: "#000000" }), stroke(16, "#000000"), fill("#ffffff")],
};

const activeCaption: Partial<TextStyle> = {
  ...caption,
  fontSize: 100,
  layers: [shadow({ offset: [0, 12], blur: 0, stroke: 18, color: "#000000" }), stroke(18, "#000000"), fill("#ffe600")],
};

const Page = ({ words, firstIndex }: { words: string[]; firstIndex: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = Math.floor(frame / WORD_FRAMES);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1180,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px 36px",
      }}
    >
      {words.map((word, index) => {
        const isActive = index === active;
        const pop = spring({ frame: frame - index * WORD_FRAMES, fps, config: { damping: 11, stiffness: 220 } });
        return (
          <Text
            key={firstIndex + index}
            text={word}
            textStyle={isActive ? activeCaption : caption}
            style={{
              opacity: index <= active ? 1 : 0,
              scale: String(0.7 + 0.3 * pop),
              rotate: isActive ? "-3deg" : "0deg",
              translate: `0 ${isActive ? -6 : 0}px`,
            }}
          />
        );
      })}
    </div>
  );
};

export const Shorts = () => {
  const frame = useCurrentFrame();
  const progress = frame / SHORTS_DURATION;
  return (
    <AbsoluteFill>
      <Background from="#0f0c29" to="#c0392b" />
      {PAGES.map((words, index) => (
        <Sequence
          key={index}
          from={PAGE_STARTS[index]}
          durationInFrames={(PAGE_STARTS[index + 1] ?? SHORTS_DURATION) - PAGE_STARTS[index]!}
          layout="none"
        >
          <Page words={words} firstIndex={PAGE_STARTS[index]!} />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 10,
          width: `${progress * 100}%`,
          background: "#ffe600",
        }}
      />
    </AbsoluteFill>
  );
};
