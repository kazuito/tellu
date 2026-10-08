import { TelopNode, type TelopNodeOptions } from "./TelopNode";
import { TelopRenderer, type DrawResult } from "./TelopRenderer";
import { loadFonts } from "./fonts";
import type { TelopProps } from "./style/types";

export interface CanvasTelop {
  readonly node: TelopNode;
  readonly renderer: TelopRenderer;
  /** Region of the telop drawn into the canvas by the last draw. */
  readonly lastDraw: DrawResult;
  /** Merges props and redraws. Wait for `loadFonts` first when new fonts or characters appear. */
  update(props: Partial<TelopProps>): DrawResult;
  draw(): DrawResult;
  destroy(): void;
}

export interface CreateCanvasTelopOptions extends TelopNodeOptions {
  renderer?: TelopRenderer;
  /** Default: `true`. */
  waitForFonts?: boolean;
}

/**
 * Draws a telop into a canvas without touching PixiJS directly. The canvas is resized to the telop's ink bounds;
 * `lastDraw.x` / `lastDraw.y` give its offset from the layout box origin.
 */
export async function createCanvasTelop(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  props: TelopProps,
  options: CreateCanvasTelopOptions = {},
): Promise<CanvasTelop> {
  const { renderer: providedRenderer, waitForFonts = true, ...nodeOptions } = options;
  const [renderer] = await Promise.all([
    providedRenderer ?? TelopRenderer.shared(),
    waitForFonts ? loadFonts(props) : undefined,
  ]);
  const node = new TelopNode(props, nodeOptions);
  let lastDraw = renderer.draw(node, canvas);

  return {
    node,
    renderer,
    get lastDraw() {
      return lastDraw;
    },
    update(next) {
      node.update(next);
      return (lastDraw = renderer.draw(node, canvas));
    },
    draw() {
      return (lastDraw = renderer.draw(node, canvas));
    },
    destroy() {
      node.destroy();
    },
  };
}
