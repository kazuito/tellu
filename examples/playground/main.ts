import { Application } from "pixi.js";
import {
  createCanvasTelop,
  fill,
  glow,
  linearGradient,
  loadFonts,
  parseMarkup,
  radialGradient,
  shadow,
  stroke,
  TelopNode,
  type TelopProps,
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

async function demo(title: string, props: TelopProps) {
  const stage = section(title);
  const canvas = document.createElement("canvas");
  stage.append(canvas);
  const telop = await createCanvasTelop(canvas, props);
  const { resolution, width, height } = telop.lastDraw;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.dataset.resolution = String(resolution);
  return { telop, canvas };
}

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

await demo("Phrase line breaking (文節改行)", {
  text: "日本語の文章を文節単位で折り返すと読みやすくなります",
  maxWidth: 520,
  lineBreak: "phrase",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 44, layers: [stroke(6, "#222"), fill("#fff")] },
});

await demo("長体 (scaleX 0.7) keeps outlines uniform", {
  text: "長体テロップ ABC",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 96,
    scaleX: 0.7,
    letterSpacing: 4,
    layers: [stroke(16, "#2a0845"), stroke(8, "#f9d423"), fill("#ffffff")],
  },
});

await demo("Inside / center strokes, radial gradient, glow", {
  text: [
    { text: "INSIDE ", style: { layers: [fill("#0d1b2a"), stroke(6, "#4cc9f0", { strokePosition: "inside" })] } },
    { text: "CENTER ", style: { layers: [stroke(4, "#f72585", { strokePosition: "center" })] } },
    { text: "GLOW", style: { layers: [glow({ color: "#00f5d4", stroke: 6, blur: 14 }), fill(radialGradient(["#ffffff", "#00f5d4"], { scope: "glyph" }))] } },
  ],
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 80 },
});

await demo("overflow: shrink (maxWidth 600, wrap none)", {
  text: "とても長いタイトルでも一行に収まるように縮小",
  maxWidth: 600,
  wrap: "none",
  overflow: "shrink",
  style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(8, "#000"), fill("#fff")] },
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

const { telop: wave, canvas: waveCanvas } = await demo("glyphTransform (animated)", {
  text: "ぴょんぴょん跳ねる文字",
  style: {
    fontFamily: "Zen Maru Gothic",
    fontWeight: 900,
    fontSize: 80,
    layers: [shadow({ offset: [0, 8], blur: 4, stroke: 10 }), stroke(10, "#7b2cbf"), fill("#ffffff")],
  },
});
const animate = (time: number) => {
  wave.update({
    glyphTransform: (glyph) => {
      const phase = time / 180 - glyph.index * 0.6;
      return { y: Math.min(0, Math.sin(phase) * 28), rotation: Math.sin(phase) * 6, scale: 1 + Math.max(0, Math.sin(phase)) * 0.12 };
    },
  });
  const { width, height } = wave.lastDraw;
  waveCanvas.style.width = `${width}px`;
  waveCanvas.style.height = `${height}px`;
  requestAnimationFrame(animate);
};
requestAnimationFrame(animate);

// TelopNode inside a regular PixiJS scene.
{
  const stage = section("TelopNode inside a PixiJS Application");
  const app = new Application();
  await app.init({ width: 900, height: 200, background: "#1d3557", resolution: devicePixelRatio, autoDensity: true });
  stage.append(app.canvas);
  const props: TelopProps = {
    text: "Pixiシーンに直接配置",
    style: { fontFamily: "Noto Sans JP", fontWeight: 900, fontSize: 72, layers: [stroke(10, "#e63946"), fill("#f1faee")] },
  };
  await loadFonts(props);
  const node = new TelopNode(props);
  node.position.set((900 - node.layout.width) / 2, (200 - node.layout.height) / 2);
  app.stage.addChild(node);
  app.ticker.add(({ lastTime }) => {
    node.update({ glyphTransform: (glyph) => ({ opacity: 0.4 + 0.6 * Math.abs(Math.sin(lastTime / 400 - glyph.index * 0.4)) }) });
  });
}

document.body.dataset.ready = "true";
