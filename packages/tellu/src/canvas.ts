export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function context2d(canvas: AnyCanvas, settings?: CanvasRenderingContext2DSettings): Canvas2D {
  const ctx = canvas.getContext("2d", settings) as Canvas2D | null;
  if (!ctx) throw new Error("tellu: failed to get a 2D canvas context");
  return ctx;
}
