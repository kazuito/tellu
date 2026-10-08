import { fill, glow, linearGradient, shadow, stroke, type TextNodeProps } from "tixi";

const SCENE = 80;

const scenes: Omit<TextNodeProps, "glyphTransform">[] = [
  {
    text: "テロップを、\nコードで。",
    align: "center",
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 92,
      lineHeight: 1.25,
      layers: [
        shadow({ color: "rgba(0,0,0,0.4)", offset: [8, 10], blur: 6, stroke: 24 }),
        stroke(24, "#14206b"),
        stroke(13, "#ffffff"),
        fill(linearGradient(["#fffbd1", "#ffe14d", "#ff9d00"])),
      ],
    },
  },
  {
    text: "縁取り\n何重でも",
    align: "center",
    style: {
      fontFamily: "Zen Maru Gothic",
      fontWeight: 900,
      fontSize: 100,
      lineHeight: 1.2,
      layers: [
        glow({ color: "#ff8fd3", stroke: 22, blur: 18 }),
        stroke(22, "#ffffff"),
        stroke(14, "#ff5fae"),
        stroke(6, "#ffffff"),
        fill("#ff5fae"),
      ],
    },
  },
  {
    text: "CAPTIONS\nCSS CAN'T",
    align: "center",
    style: {
      fontFamily: "Montserrat",
      fontWeight: 900,
      fontSize: 84,
      lineHeight: 1.1,
      letterSpacing: 2,
      layers: [
        glow({ color: "#00e5ff", stroke: 8, blur: 20, blendMode: "add" }),
        stroke(14, "#0b132b"),
        fill(linearGradient(["#5bc0eb", "#c77dff"], { angle: 90, scope: "block" })),
      ],
    },
  },
];

export const heroLoop = SCENE * scenes.length;

export function heroCaption(frame: number): TextNodeProps {
  const scene = scenes[Math.floor(frame / SCENE) % scenes.length]!;
  const local = frame % SCENE;
  const fadeOut = Math.min(1, Math.max(0, (SCENE - local) / 8));
  return {
    ...scene,
    glyphTransform: (glyph) => {
      const t = Math.min(1, Math.max(0, (local - glyph.visibleIndex * 1.5) / 8));
      if (t === 0) return { visible: false };
      const settle = 1 - (1 - t) ** 3;
      return {
        scale: 1.8 - 0.8 * settle,
        rotation: (1 - settle) * (glyph.index % 2 ? 14 : -14),
        opacity: Math.min(t * 2, fadeOut),
      };
    },
  };
}
