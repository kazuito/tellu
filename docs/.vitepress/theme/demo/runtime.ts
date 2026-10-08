import { type CanvasText, createCanvasText, type TextNodeProps } from "tixi";

export type DemoExport = TextNodeProps | ((frame: number) => TextNodeProps) | Readonly<Record<string, TextNodeProps>>;

export const FPS = 30;
const DEFAULT_LOOP = 120;

const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Noto+Serif+JP:wght@700;900" +
  "&family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@700;900&family=RocknRoll+One&family=Reggae+One" +
  "&family=Montserrat:wght@800;900&display=block";

let stylesheet: Promise<void> | undefined;

/**
 * tixi only sees `@font-face` rules that are already declared, so demos wait for the stylesheet.
 * It is added on the first demo instead of in `<head>` to keep pages without demos light.
 */
export function loadFontStylesheet(): Promise<void> {
  stylesheet ??= new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_STYLESHEET;
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
  return stylesheet;
}

export interface DemoView {
  readonly animated: boolean;
  readonly playing: boolean;
  setPlaying(playing: boolean): void;
  destroy(): void;
}

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

function union(a: Region | undefined, b: Region): Region {
  if (!a) return { x: b.x, y: b.y, width: b.width, height: b.height };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function setCssSize(canvas: HTMLCanvasElement, { width, height }: { width: number; height: number }) {
  canvas.style.width = `${width}px`;
  canvas.style.aspectRatio = `${width} / ${height}`;
}

function isProps(value: DemoExport): value is TextNodeProps {
  return typeof value === "object" && "text" in value;
}

async function drawStatic(stage: HTMLElement, props: TextNodeProps): Promise<CanvasText> {
  const canvas = document.createElement("canvas");
  stage.append(canvas);
  const text = await createCanvasText(canvas, props);
  setCssSize(canvas, text.lastDraw);
  return text;
}

export async function mountDemo(
  stage: HTMLElement,
  value: DemoExport,
  { loop = DEFAULT_LOOP, still = Math.floor(loop / 2) }: { loop?: number; still?: number } = {},
): Promise<DemoView> {
  await loadFontStylesheet();

  if (typeof value !== "function") {
    const entries: [string | undefined, TextNodeProps][] = isProps(value)
      ? [[undefined, value]]
      : Object.entries(value);
    const texts: CanvasText[] = [];
    for (const [label, props] of entries) {
      if (label === undefined) {
        texts.push(await drawStatic(stage, props));
        continue;
      }
      const figure = document.createElement("figure");
      const caption = document.createElement("figcaption");
      caption.textContent = label;
      figure.append(caption);
      stage.append(figure);
      texts.push(await drawStatic(figure, props));
    }
    return {
      animated: false,
      playing: false,
      setPlaying() {},
      destroy: () => {
        for (const text of texts) text.destroy();
      },
    };
  }

  const canvas = document.createElement("canvas");
  stage.append(canvas);
  const text = await createCanvasText(canvas, value(0));

  // A fixed region covering every frame keeps the canvas from jumping around while it plays.
  let bounds: Region | undefined;
  for (let frame = 0; frame < loop; frame += 2) {
    text.node.update(value(frame));
    bounds = union(bounds, text.node.getInkBounds());
  }
  const pad = 2;
  const region = {
    x: bounds!.x - pad,
    y: bounds!.y - pad,
    width: bounds!.width + pad * 2,
    height: bounds!.height + pad * 2,
  };

  let frame = -1;
  const show = (next: number) => {
    if (next === frame) return;
    frame = next;
    text.node.update(value(frame));
    text.renderer.draw(text.node, canvas, { bounds: region });
  };
  show(still % loop);
  setCssSize(canvas, region);

  let playing = false;
  let handle = 0;
  let origin = 0;
  const tick = (now: number) => {
    show(Math.floor(((now - origin) * FPS) / 1000) % loop);
    handle = requestAnimationFrame(tick);
  };

  return {
    animated: true,
    get playing() {
      return playing;
    },
    setPlaying(next) {
      if (next === playing) return;
      playing = next;
      if (playing) {
        origin = performance.now() - (Math.max(0, frame) * 1000) / FPS;
        handle = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(handle);
      }
    },
    destroy() {
      cancelAnimationFrame(handle);
      text.destroy();
    },
  };
}
