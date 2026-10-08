import { Application, NoiseFilter } from "pixi.js";
import {
  createCanvasTelop,
  type DrawResult,
  fill,
  type GlyphContext,
  type GlyphTransform,
  glow,
  linearGradient,
  loadFonts,
  type PatternPaint,
  parseMarkup,
  radialGradient,
  shadow,
  stroke,
  TelopNode,
  type TelopProps,
  type TelopStyle,
} from "tixi";

const root = document.getElementById("root")!;

function section(title: string): HTMLDivElement {
  const heading = document.createElement("h2");
  heading.textContent = title;
  const stage = document.createElement("div");
  stage.className = "stage";
  root.append(heading, stage);
  return stage;
}

function setCssSize(canvas: HTMLCanvasElement, { width, height }: DrawResult) {
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

async function drawInto(parent: HTMLElement, props: TelopProps) {
  const canvas = document.createElement("canvas");
  parent.append(canvas);
  const telop = await createCanvasTelop(canvas, props);
  setCssSize(canvas, telop.lastDraw);
  return { telop, canvas };
}

async function demo(title: string, props: TelopProps) {
  return drawInto(section(title), props);
}

async function compare(title: string, variants: Record<string, TelopProps>) {
  const stage = section(title);
  stage.classList.add("row");
  for (const [label, props] of Object.entries(variants)) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    figure.append(caption);
    stage.append(figure);
    await drawInto(figure, props);
  }
}

/** Draws every frame into the resting ink bounds grown by `margin`, so the canvas size stays fixed. */
async function animatedDemo(
  title: string,
  props: TelopProps,
  { x = 0, top = 0, bottom = 0 }: { x?: number; top?: number; bottom?: number },
  transform: (glyph: GlyphContext, time: number) => GlyphTransform | void,
) {
  const { telop, canvas } = await demo(title, props);
  const ink = telop.node.getInkBounds();
  const bounds = { x: ink.x - x, y: ink.y - top, width: ink.width + x * 2, height: ink.height + top + bottom };
  const draw = () => telop.renderer.draw(telop.node, canvas, { bounds });
  setCssSize(canvas, draw());
  const frame = (time: number) => {
    telop.node.update({ glyphTransform: (glyph) => transform(glyph, time) });
    draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBounce = (t: number) => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t - 1.5 / 2.75) ** 2 + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t - 2.25 / 2.75) ** 2 + 0.9375;
  return 7.5625 * (t - 2.625 / 2.75) ** 2 + 0.984375;
};
const hash = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

const variety: TelopProps = {
  text: "今日もいい天気ですね！",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 88,
    layers: [
      shadow({ color: "rgba(0,0,0,0.55)", offset: [8, 10], blur: 6, stroke: 22 }),
      stroke(22, "#1b2a7a"),
      stroke(12, "#ffffff"),
      fill(linearGradient(["#fff7a8", "#ffcf3d", "#ff8a00"], { angle: 180, scope: "line" })),
    ],
  },
};

const simple = (fontSize: number, outline = "#111"): Partial<TelopStyle> => ({
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize,
  layers: [stroke(Math.round(fontSize / 9), outline), fill("#ffffff")],
});

await demo("Multi-layer outline + shadow + gradient fill", variety);

await demo("Rich text via markup", {
  text: parseMarkup("今日は<em>最高</em>の<b>1日</b>だった", {
    em: {
      fontSize: 120,
      layers: { 3: { paint: linearGradient(["#ffd1e8", "#ff2e7e"], { scope: "glyph" }) }, 1: { paint: "#5a0026" } },
    },
    b: { fontFamily: "Dela Gothic One", fontWeight: 400, baselineShift: 6 },
  }),
  style: variety.style,
});

await demo("Mixed fonts, letterSpacing in em, baselineShift", {
  text: parseMarkup("<tag>【速報】</tag>新商品<big>ついに</big>発売<note>※個人の感想です</note>", {
    tag: { fontFamily: "Dela Gothic One", fontWeight: 400, layers: { 1: { paint: "#ffe600" } } },
    big: { fontSize: 96, letterSpacing: { em: 0.08 }, layers: { 1: { paint: "#ff3b30" } } },
    note: { fontSize: 24, fontWeight: 400, baselineShift: { em: 1.6 }, layers: [stroke(4, "#111"), fill("#ffffff")] },
  }),
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 64, layers: [stroke(10, "#111"), fill("#ffffff")] },
});

await demo("Wrap with kinsoku, centered, plate (座布団)", {
  text: "長いテロップは幅に合わせて自動で折り返されます。「かぎかっこ」や句読点、行頭の小書き文字にも配慮しています。",
  maxWidth: 760,
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 44,
    lineHeight: 1.45,
    layers: [stroke(7, "#003049"), fill("#ffffff")],
  },
  background: { paint: "rgba(0, 20, 40, 0.72)", padding: [28, 14], radius: 14, mode: "block" },
});

await demo("Per-line plates with a stroke, <br/> in markup", {
  text: parseMarkup("<small>番組からのお知らせ</small><br/>今夜9時から特別番組を放送します", {
    small: { fontSize: 26, fontWeight: 400, layers: [fill("#cfe3ff")] },
  }),
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 48, lineHeight: 1.7, layers: [fill("#ffffff")] },
  background: {
    paint: linearGradient(["#0b3d91", "#1e88e5"], { angle: 90 }),
    padding: [22, 6],
    radius: 6,
    mode: "line",
    stroke: { width: 3, paint: "#ffffff" },
  },
});

const paragraph = "字幕は読みやすさが大切です。Telop text should stay readable at a glance.";
await compare(
  "align (maxWidth 360)",
  Object.fromEntries(
    (["left", "center", "right", "justify"] as const).map((align) => [
      align,
      {
        text: paragraph,
        maxWidth: 360,
        align,
        style: { ...simple(30), lineHeight: 1.4 },
        background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
      },
    ]),
  ),
);

const kinsokuText = "「さあ、始めましょう。」ちょっと待って……まだ準備中です！";
await compare("kinsoku on / off (maxWidth 300)", {
  "kinsoku: true": {
    text: kinsokuText,
    maxWidth: 300,
    style: simple(36),
    background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
  },
  "kinsoku: false": {
    text: kinsokuText,
    maxWidth: 300,
    kinsoku: false,
    style: simple(36),
    background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
  },
});

await demo("Phrase line breaking (文節改行)", {
  text: "日本語の文章を文節単位で折り返すと読みやすくなります",
  maxWidth: 520,
  lineBreak: "phrase",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 44, layers: [stroke(6, "#222"), fill("#fff")] },
});

await compare("kerning on / off", {
  "kerning: true": { text: "AVATAR WAVE Typography", style: simple(64) },
  "kerning: false": { text: "AVATAR WAVE Typography", style: { ...simple(64), kerning: false } },
});

const scaledStyle: Partial<TelopStyle> = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 80,
  letterSpacing: 4,
  layers: [stroke(16, "#2a0845"), stroke(8, "#f9d423"), fill("#ffffff")],
};
await compare("長体 / 平体 keep outlines uniform", {
  "scaleX: 0.7": { text: "長体 ABC", style: { ...scaledStyle, scaleX: 0.7 } },
  "scaleX: 1": { text: "正体 ABC", style: scaledStyle },
  "scaleX: 1.3": { text: "平体 ABC", style: { ...scaledStyle, scaleX: 1.3 } },
  "scaleY: 0.75": { text: "平体 ABC", style: { ...scaledStyle, scaleY: 0.75 } },
});

await demo("Inside / center strokes, radial gradient, glow", {
  text: [
    { text: "INSIDE ", style: { layers: [fill("#0d1b2a"), stroke(6, "#4cc9f0", { strokePosition: "inside" })] } },
    { text: "CENTER ", style: { layers: [stroke(4, "#f72585", { strokePosition: "center" })] } },
    {
      text: "GLOW",
      style: {
        layers: [
          glow({ color: "#00f5d4", stroke: 6, blur: 14 }),
          fill(radialGradient(["#ffffff", "#00f5d4"], { scope: "glyph" })),
        ],
      },
    },
  ],
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 80 },
});

const stripes = document.createElement("canvas");
stripes.width = stripes.height = 24;
{
  const ctx = stripes.getContext("2d")!;
  ctx.fillStyle = "#ffcf3d";
  ctx.fillRect(0, 0, 24, 24);
  ctx.strokeStyle = "#ff5d8f";
  ctx.lineWidth = 8;
  for (const offset of [-24, 0, 24]) {
    ctx.beginPath();
    ctx.moveTo(offset, 24);
    ctx.lineTo(offset + 24, 0);
    ctx.stroke();
  }
}
const stripePaint: PatternPaint = { type: "pattern", source: stripes, scope: "block" };

await demo("Pattern paint (canvas source, block scope)", {
  text: "ストライプ柄 PATTERN",
  style: {
    fontFamily: "RocknRoll One",
    fontWeight: 400,
    fontSize: 88,
    layers: [
      shadow({ offset: [6, 6], blur: 0, stroke: 14, color: "#3d0b37" }),
      stroke(14, "#3d0b37"),
      fill(stripePaint),
    ],
  },
});

await demo("Additive neon (blendMode: add) on a plate", {
  text: "OPEN 24H 営業中",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 80,
    layers: [
      glow({ color: "#ff00b3", stroke: 10, blur: 24, blendMode: "add" }),
      glow({ color: "#7a5cff", stroke: 4, blur: 8, blendMode: "add" }),
      stroke(3, "#ffb3ec"),
      fill("#ffffff"),
    ],
  },
  background: { paint: "#120a1f", padding: [40, 24], radius: 18 },
});

await demo("PixiJS filters on a layer (NoiseFilter)", {
  text: "ざらざら質感テロップ",
  style: {
    fontFamily: "Reggae One",
    fontWeight: 400,
    fontSize: 84,
    layers: [
      shadow({ color: "#000", offset: [5, 7], blur: 2, stroke: 12 }),
      stroke(12, "#5b2c06"),
      fill("#f4e3c1", { filters: [new NoiseFilter({ noise: 0.45, seed: 0.37 })] }),
    ],
  },
});

await demo("Static glyphTransform (ガタガタ文字)", {
  text: "ガタガタ並ぶ元気な文字！",
  style: {
    fontFamily: "RocknRoll One",
    fontWeight: 400,
    fontSize: 72,
    letterSpacing: 6,
    layers: [
      stroke(14, "#0a3d62"),
      stroke(7, "#ffffff"),
      fill(linearGradient(["#38ef7d", "#11998e"], { scope: "glyph" })),
    ],
  },
  glyphTransform: (glyph) => ({ rotation: glyph.index % 2 ? 7 : -6, y: glyph.index % 2 ? 6 : -6 }),
});

await demo("overflow: shrink (maxWidth 600, wrap none)", {
  text: "とても長いタイトルでも一行に収まるように縮小",
  maxWidth: 600,
  wrap: "none",
  overflow: "shrink",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(8, "#000"), fill("#fff")] },
  background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
});

await demo("overflow: shrink + maxLines: 2 (maxWidth 640)", {
  text: "長い説明文でも二行以内に収まるように、フォントサイズを自動で小さくして調整します",
  maxWidth: 640,
  maxLines: 2,
  overflow: "shrink",
  align: "center",
  style: simple(64),
  background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
});

await demo("overflow: squeeze (長体で収める)", {
  text: "とても長いタイトルでも一行に収まるように長体",
  maxWidth: 600,
  wrap: "none",
  overflow: "squeeze",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(8, "#000"), fill("#fff")] },
  background: { paint: "rgba(255,255,255,0.08)", padding: 0 },
});

await animatedDemo(
  "glyphTransform (animated)",
  {
    text: "ぴょんぴょん跳ねる文字",
    style: {
      fontFamily: "Zen Maru Gothic",
      fontWeight: 900,
      fontSize: 80,
      layers: [shadow({ offset: [0, 8], blur: 4, stroke: 10 }), stroke(10, "#7b2cbf"), fill("#ffffff")],
    },
  },
  { x: 12, top: 40 },
  (glyph, time) => {
    const phase = time / 180 - glyph.index * 0.6;
    return {
      y: Math.min(0, Math.sin(phase) * 28),
      rotation: Math.sin(phase) * 6,
      scale: 1 + Math.max(0, Math.sin(phase)) * 0.12,
    };
  },
);

await animatedDemo(
  "Typewriter pop-in (visibleIndex)",
  {
    text: "テロップが一文字ずつ\nポンッと出てきます。",
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 60,
      lineHeight: 1.35,
      layers: [stroke(12, "#e63946"), stroke(6, "#ffffff"), fill("#1d3557")],
    },
  },
  { x: 24, top: 24, bottom: 24 },
  (glyph, time) => {
    if (glyph.isWhitespace) return;
    const step = ((time / 70) % (glyph.visibleCount + 25)) - glyph.visibleIndex;
    if (step < 0) return { visible: false };
    const t = clamp01(step / 4);
    return { scale: 1 + 0.6 * (1 - easeOutCubic(t)), opacity: t };
  },
);

await animatedDemo(
  "Staggered bounce drop-in",
  {
    text: "ドロップイン！",
    style: {
      fontFamily: "Dela Gothic One",
      fontWeight: 400,
      fontSize: 96,
      layers: [
        shadow({ offset: [0, 10], blur: 6, stroke: 16 }),
        stroke(16, "#003049"),
        fill(linearGradient(["#fcbf49", "#f77f00"])),
      ],
    },
  },
  { x: 12, top: 100 },
  (glyph, time) => {
    const cycle = 3000;
    const local = time % cycle;
    const t = clamp01((local - glyph.index * 90) / 600);
    const fadeOut = clamp01((cycle - local) / 250);
    return { y: -(1 - easeOutBounce(t)) * 100, opacity: Math.min(clamp01(t * 4), fadeOut) };
  },
);

await animatedDemo(
  "Tag-driven shake (glyph.tags)",
  {
    text: parseMarkup("突然の<shake>ドッキリ</shake>に<shake>大パニック</shake>！", {
      shake: { fontFamily: "Reggae One", fontWeight: 400, fontSize: 84, layers: { 2: { paint: "#ff3b30" } } },
    }),
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 64,
      layers: [stroke(12, "#111"), stroke(6, "#ffffff"), fill("#111")],
    },
  },
  { x: 12, top: 12, bottom: 12 },
  (glyph, time) => {
    if (!glyph.tags.includes("shake")) return;
    const tick = Math.floor(time / 50);
    const seed = glyph.index * 31 + tick * 7;
    return { x: hash(seed) * 4, y: hash(seed + 1) * 4, rotation: hash(seed + 2) * 6 };
  },
);

{
  const stage = section("TelopNode inside a PixiJS Application");
  const app = new Application();
  await app.init({ width: 900, height: 200, background: "#1d3557", resolution: devicePixelRatio, autoDensity: true });
  stage.append(app.canvas);
  const props: TelopProps = {
    text: "Pixiシーンに直接配置",
    style: {
      fontFamily: "Noto Sans JP",
      fontWeight: 900,
      fontSize: 72,
      layers: [stroke(10, "#e63946"), fill("#f1faee")],
    },
  };
  await loadFonts(props);
  const node = new TelopNode(props);
  node.position.set((900 - node.layout.width) / 2, (200 - node.layout.height) / 2);
  app.stage.addChild(node);
  app.ticker.add(({ lastTime }) => {
    node.update({
      glyphTransform: (glyph) => ({ opacity: 0.4 + 0.6 * Math.abs(Math.sin(lastTime / 400 - glyph.index * 0.4)) }),
    });
  });
}

document.body.dataset.ready = "true";
