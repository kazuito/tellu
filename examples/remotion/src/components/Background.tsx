import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 137) % 100,
  size: 80 + ((i * 53) % 220),
  speed: 0.6 + ((i * 29) % 10) / 10,
  hue: (i * 47) % 360,
}));

/** Stand-in for footage: an animated gradient with drifting bubbles. */
export const Background = ({ from = "#1d2b64", to = "#f8cdda" }: { from?: string; to?: string }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 300], [120, 200]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})`, overflow: "hidden" }}>
      {BUBBLES.map((bubble, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${bubble.x}%`,
            top: `${110 - ((frame * bubble.speed + i * 40) % 140)}%`,
            width: bubble.size,
            height: bubble.size,
            borderRadius: "50%",
            background: `hsla(${bubble.hue}, 90%, 75%, 0.18)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
