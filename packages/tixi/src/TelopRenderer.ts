import { type AutoDetectOptions, autoDetectRenderer, Container, type Renderer } from "pixi.js";
import type { AnyCanvas } from "./canvas";
import type { TelopNode } from "./TelopNode";

const MIN_CAPACITY = 2048;

function nextPowerOfTwo(value: number, min: number): number {
  return Math.max(min, 2 ** Math.ceil(Math.log2(Math.max(1, value))));
}

export interface TelopRendererOptions extends Partial<AutoDetectOptions> {}

export interface DrawOptions {
  /** Output pixel density. Default: the node's resolution. */
  resolution?: number;
  /** Region of the node to draw, in its local coordinates. Default: its ink bounds. */
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface DrawResult {
  /** Drawn region in the node's local coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  resolution: number;
}

/**
 * One offscreen PixiJS renderer that draws telops into ordinary canvases.
 * Sharing it keeps any number of telops on a single WebGL context.
 */
export class TelopRenderer {
  private static sharedRenderer: Promise<TelopRenderer> | undefined;
  private readonly stage = new Container();
  private capacityWidth = 0;
  private capacityHeight = 0;
  private capacityResolution = 0;

  private constructor(readonly renderer: Renderer) {}

  static async create(options: TelopRendererOptions = {}): Promise<TelopRenderer> {
    const renderer = await autoDetectRenderer({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: false,
      preserveDrawingBuffer: true,
      width: 1,
      height: 1,
      ...options,
    });
    return new TelopRenderer(renderer);
  }

  /** The renderer shared by `<Telop>` components. Options only apply to the first call. */
  static shared(options?: TelopRendererOptions): Promise<TelopRenderer> {
    TelopRenderer.sharedRenderer ??= TelopRenderer.create(options).catch((error: unknown) => {
      TelopRenderer.sharedRenderer = undefined;
      throw error;
    });
    return TelopRenderer.sharedRenderer;
  }

  /**
   * Renders `node` and copies the result into `target`, resizing it to the drawn region.
   * Runs synchronously, so the target is complete when this returns.
   */
  draw(node: TelopNode, target: AnyCanvas, options: DrawOptions = {}): DrawResult {
    const resolution = options.resolution ?? node.resolution;
    if (node.resolution !== resolution) node.resolution = resolution;
    const bounds = options.bounds ?? node.getInkBounds();
    const x = Math.floor(bounds.x);
    const y = Math.floor(bounds.y);
    const width = Math.max(1, Math.ceil(bounds.x + bounds.width) - x);
    const height = Math.max(1, Math.ceil(bounds.y + bounds.height) - y);
    const pixelWidth = Math.ceil(width * resolution);
    const pixelHeight = Math.ceil(height * resolution);

    this.ensureCapacity(pixelWidth, pixelHeight, resolution);
    const parent = node.parent;
    const index = parent ? parent.getChildIndex(node) : -1;
    const { x: nodeX, y: nodeY } = node.position;
    const { x: scaleX, y: scaleY } = node.scale;
    const { x: pivotX, y: pivotY } = node.pivot;
    const { x: skewX, y: skewY } = node.skew;
    const rotation = node.rotation;

    // Draw in the node's local space, independent of where it sits in another scene.
    node.position.set(-x, -y);
    node.scale.set(1, 1);
    node.pivot.set(0, 0);
    node.skew.set(0, 0);
    node.rotation = 0;
    this.stage.addChild(node);
    try {
      this.renderer.render({ container: this.stage, clear: true });
    } finally {
      this.stage.removeChild(node);
      node.position.set(nodeX, nodeY);
      node.scale.set(scaleX, scaleY);
      node.pivot.set(pivotX, pivotY);
      node.skew.set(skewX, skewY);
      node.rotation = rotation;
      if (parent) parent.addChildAt(node, index);
    }

    if (target.width !== pixelWidth) target.width = pixelWidth;
    if (target.height !== pixelHeight) target.height = pixelHeight;
    const ctx = target.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error("tixi: the target canvas has no 2D context");
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.drawImage(
      this.renderer.canvas as CanvasImageSource,
      0,
      0,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight,
    );
    return { x, y, width, height, resolution };
  }

  /**
   * The renderer only grows, in power-of-two steps, so drawing telops of different sizes rarely reallocates
   * (each resize also makes PixiJS drop its pooled filter textures).
   */
  private ensureCapacity(pixelWidth: number, pixelHeight: number, resolution: number): void {
    if (
      pixelWidth <= this.capacityWidth &&
      pixelHeight <= this.capacityHeight &&
      resolution === this.capacityResolution
    )
      return;
    this.capacityWidth = Math.max(this.capacityWidth, nextPowerOfTwo(pixelWidth, MIN_CAPACITY));
    this.capacityHeight = Math.max(this.capacityHeight, nextPowerOfTwo(pixelHeight, MIN_CAPACITY / 2));
    this.capacityResolution = resolution;
    this.renderer.resize(this.capacityWidth / resolution, this.capacityHeight / resolution, resolution);
  }

  destroy(): void {
    if (TelopRenderer.sharedRenderer) {
      void TelopRenderer.sharedRenderer.then((shared) => {
        if (shared === this) TelopRenderer.sharedRenderer = undefined;
      });
    }
    this.stage.destroy();
    this.renderer.destroy();
  }
}
