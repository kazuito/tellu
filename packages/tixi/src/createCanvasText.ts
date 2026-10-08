import { loadFonts } from "./fonts";
import type { TextNodeProps } from "./style/types";
import { TextNode, type TextNodeOptions } from "./TextNode";
import { type DrawResult, TextRenderer } from "./TextRenderer";

export interface CanvasText {
  readonly node: TextNode;
  readonly renderer: TextRenderer;
  /** Region of the text drawn into the canvas by the last draw. */
  readonly lastDraw: DrawResult;
  /** Merges props and redraws. Wait for `loadFonts` first when new fonts or characters appear. */
  update(props: Partial<TextNodeProps>): DrawResult;
  draw(): DrawResult;
  destroy(): void;
}

export interface CreateCanvasTextOptions extends TextNodeOptions {
  renderer?: TextRenderer;
  /** Default: `true`. */
  waitForFonts?: boolean;
}

/**
 * Draws text into a canvas without touching PixiJS directly. The canvas is resized to the text's ink bounds;
 * `lastDraw.x` / `lastDraw.y` give its offset from the layout box origin.
 */
export async function createCanvasText(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  props: TextNodeProps,
  options: CreateCanvasTextOptions = {},
): Promise<CanvasText> {
  const { renderer: providedRenderer, waitForFonts = true, ...nodeOptions } = options;
  const [renderer] = await Promise.all([
    providedRenderer ?? TextRenderer.shared(),
    waitForFonts ? loadFonts(props) : undefined,
  ]);
  const node = new TextNode(props, nodeOptions);
  let lastDraw = renderer.draw(node, canvas);

  return {
    node,
    renderer,
    get lastDraw() {
      return lastDraw;
    },
    update(next) {
      node.update(next);
      lastDraw = renderer.draw(node, canvas);
      return lastDraw;
    },
    draw() {
      lastDraw = renderer.draw(node, canvas);
      return lastDraw;
    },
    destroy() {
      node.destroy();
    },
  };
}
