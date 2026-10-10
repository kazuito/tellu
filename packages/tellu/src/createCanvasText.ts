import { loadFonts } from "./fonts";
import type { TextNodeProps } from "./style/types";
import { TextNode, type TextNodeOptions } from "./TextNode";
import { type DrawResult, TextRenderer } from "./TextRenderer";

/** A caption bound to a canvas, returned by `createCanvasText()`. */
export interface CanvasText {
  /** The PixiJS node holding the caption. */
  readonly node: TextNode;
  readonly renderer: TextRenderer;
  /**
   * Region of the text drawn into the canvas by the last draw, relative to the layout box. Position the canvas at
   * `lastDraw.x` / `lastDraw.y` (CSS px) from where the layout box should be.
   */
  readonly lastDraw: DrawResult;
  /**
   * Merges props and redraws synchronously. Changing only `glyphTransform` is cheap, so this can run every frame.
   * When new fonts or characters appear, `await loadFonts(...)` first.
   */
  update(props: Partial<TextNodeProps>): DrawResult;
  /** Redraws with the current props. */
  draw(): DrawResult;
  /** Destroys the node. The canvas and the renderer are left alone. */
  destroy(): void;
}

export interface CreateCanvasTextOptions extends TextNodeOptions {
  /** Default: `TextRenderer.shared()`. */
  renderer?: TextRenderer;
  /** Load the fonts the text needs before the first draw. Default: `true`. */
  waitForFonts?: boolean;
}

/**
 * Draws text into a canvas without touching PixiJS directly. Resolves once the renderer is ready, the fonts are loaded
 * and the first draw is done. Every draw resizes the canvas to the text's ink bounds (outlines and shadows included);
 * `lastDraw.x` / `lastDraw.y` give its offset from the layout box origin.
 *
 * @example
 * const caption = await createCanvasText(canvas, {
 *   text: "テロップ",
 *   style: { layers: [stroke(8, "#000"), fill("#fff")] },
 * });
 * caption.update({ text: "次のテロップ" });
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
