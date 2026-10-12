import { type AnyCanvas, type Canvas2D, context2d, createCanvas } from "../canvas";
import { type FontSpec, fontToCss } from "../layout/measure";
import type { Box, Layer, StrokePosition } from "../style/types";
import { createPaintStyle } from "./paint";
import { measureInside, signedDistanceField, strokeCoverage } from "./sdf";

/** A path to rasterize like a glyph, such as a decoration line. */
export interface PathSource {
  path: Path2D;
  /** Extent of the path in px from the shape's origin. */
  bounds: GlyphBounds;
  /** Identifies the path: equal keys must draw equal paths. */
  key: string;
}

export interface GlyphShape {
  /** A glyph of text in a font, drawn from its baseline origin, or a path. */
  source: { text: string; font: FontSpec } | PathSource;
  /** Applied on screen, after `rotation`. */
  scaleX: number;
  scaleY: number;
  /** Clockwise, in degrees. */
  rotation: 0 | 90;
  resolution: number;
  /** Sub-pixel position of the glyph origin in device pixels, `[0, 1)`. */
  fracX: number;
  fracY: number;
}

export interface RasterResult {
  canvas: AnyCanvas;
  /** Canvas top-left in device pixels, relative to the integer pixel the glyph origin falls in. */
  offsetX: number;
  offsetY: number;
}

export interface GlyphBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FieldEntry {
  field: Float32Array;
  width: number;
  height: number;
  /** Whether distances inside the glyph are measured (see `signedDistanceField`). */
  inside: boolean;
}

const SUPERSAMPLE = 2;
const AA_MARGIN = 2;

type Matrix = readonly [a: number, b: number, c: number, d: number];

/** Glyph space → device pixels: rotate, then scale on screen. */
function glyphMatrix({ scaleX, scaleY, rotation, resolution }: GlyphShape): Matrix {
  return rotation === 90
    ? [0, resolution * scaleY, -resolution * scaleX, 0]
    : [resolution * scaleX, 0, 0, resolution * scaleY];
}

function transformBounds(bounds: GlyphBounds, [a, b, c, d]: Matrix): GlyphBounds {
  const xs = [bounds.left, bounds.right];
  const ys = [bounds.top, bounds.bottom];
  const result = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const x of xs) {
    for (const y of ys) {
      const tx = a * x + c * y;
      const ty = b * x + d * y;
      result.left = Math.min(result.left, tx);
      result.right = Math.max(result.right, tx);
      result.top = Math.min(result.top, ty);
      result.bottom = Math.max(result.bottom, ty);
    }
  }
  return result;
}

export function layerShape(layer: Layer): {
  width: number;
  position: StrokePosition;
  join: CanvasLineJoin;
  miterLimit: number;
} {
  return {
    width: Math.max(0, layer.stroke ?? 0),
    position: layer.strokePosition ?? "outside",
    join: layer.join ?? "round",
    miterLimit: layer.miterLimit ?? 10,
  };
}

/** How far a layer's shape extends past the glyph outline, in layout px. */
export function layerReach(layer: Layer): number {
  const { width, position, join, miterLimit } = layerShape(layer);
  if (position === "inside") return 0;
  const half = position === "center" ? width / 2 : width;
  return join === "miter" ? half * Math.min(miterLimit, 4) : half;
}

/** Fills or strokes a shape at the origin with the context's current style, line width and transform. */
function drawShape(ctx: Canvas2D, shape: GlyphShape, operation: "fill" | "stroke"): void {
  const { source } = shape;
  if ("path" in source) {
    if (operation === "fill") ctx.fill(source.path);
    else ctx.stroke(source.path);
    return;
  }
  ctx.font = fontToCss(source.font);
  if (operation === "fill") ctx.fillText(source.text, 0, 0);
  else ctx.strokeText(source.text, 0, 0);
}

/** Draws glyph × layer bitmaps with the Canvas 2D API. */
export class GlyphRasterizer {
  private measureContext: Canvas2D | undefined;
  private boundsCache = new Map<string, GlyphBounds>();
  private fieldCache = new Map<string, FieldEntry>();

  private get measureCtx(): Canvas2D {
    this.measureContext ??= context2d(createCanvas(1, 1));
    return this.measureContext;
  }

  /** Ink bounds of a glyph at scale 1, relative to its baseline origin. */
  glyphBounds(text: string, font: FontSpec): GlyphBounds {
    const css = fontToCss(font);
    const key = `${css}\u0000${text}`;
    let bounds = this.boundsCache.get(key);
    if (!bounds) {
      const ctx = this.measureCtx;
      ctx.font = css;
      const m = ctx.measureText(text);
      bounds = {
        left: -m.actualBoundingBoxLeft,
        top: -m.actualBoundingBoxAscent,
        right: m.actualBoundingBoxRight,
        bottom: m.actualBoundingBoxDescent,
      };
      this.boundsCache.set(key, bounds);
    }
    return bounds;
  }

  /** Extent of a shape at scale 1, relative to its origin. */
  private shapeBounds(shape: GlyphShape): GlyphBounds {
    return "path" in shape.source ? shape.source.bounds : this.glyphBounds(shape.source.text, shape.source.font);
  }

  /**
   * @param paintBox The paint's scope box relative to the glyph origin, in layout px.
   * @param reach Extra margin around the glyph; layers of one glyph share it so distance fields can be reused.
   */
  rasterize(shape: GlyphShape, layer: Layer, paintBox: Box, reach: number): RasterResult {
    const { resolution: res, scaleX, scaleY, fracX, fracY } = shape;
    const matrix = glyphMatrix(shape);
    const bounds = transformBounds(this.shapeBounds(shape), matrix);
    const margin = reach * res + AA_MARGIN;
    const left = Math.floor(fracX + bounds.left - margin);
    const top = Math.floor(fracY + bounds.top - margin);
    const width = Math.max(1, Math.ceil(fracX + bounds.right + margin) - left);
    const height = Math.max(1, Math.ceil(fracY + bounds.bottom + margin) - top);

    const canvas = createCanvas(width, height);
    const ctx = context2d(canvas);
    const { width: strokeWidth, position, join, miterLimit } = layerShape(layer);
    const glyphX = fracX - left;
    const glyphY = fracY - top;
    const isFill = strokeWidth === 0 && position === "outside";

    // Chrome's strokeText leaves holes where a wide stroke overruns a small counter (the loop of す), so round
    // strokes are grown from a distance field. Other joins need the native stroker, which only scales uniformly.
    // Shading is computed from the distance field too.
    if ((isFill || (join !== "round" && scaleX === scaleY)) && !layer.shading) {
      ctx.setTransform(...matrix, glyphX, glyphY);
      ctx.fillStyle = ctx.strokeStyle = "#000";
      ctx.lineJoin = join;
      ctx.miterLimit = miterLimit;
      // The transform scales strokes, so widths are given in glyph units.
      const unit = 1 / scaleX;
      if (position === "outside") {
        if (strokeWidth > 0) {
          ctx.lineWidth = strokeWidth * 2 * unit;
          drawShape(ctx, shape, "stroke");
        }
        drawShape(ctx, shape, "fill");
      } else if (position === "inside") {
        drawShape(ctx, shape, "fill");
        ctx.globalCompositeOperation = "destination-in";
        ctx.lineWidth = strokeWidth * 2 * unit;
        drawShape(ctx, shape, "stroke");
      } else {
        ctx.lineWidth = strokeWidth * unit;
        drawShape(ctx, shape, "stroke");
      }
    } else {
      const inside = position !== "outside" || !!layer.shading;
      const entry = this.distanceField(shape, matrix, glyphX, glyphY, width, height, inside);
      const pixels = strokeCoverage(
        entry.field,
        entry.width,
        entry.height,
        SUPERSAMPLE,
        strokeWidth * res * SUPERSAMPLE,
        position,
        layer.shading,
        res * SUPERSAMPLE,
      );
      ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
    }

    ctx.globalCompositeOperation = "source-in";
    ctx.setTransform(res, 0, 0, res, glyphX, glyphY);
    ctx.fillStyle = createPaintStyle(ctx, layer.paint, paintBox);
    ctx.fillRect(-glyphX / res, -glyphY / res, width / res, height / res);

    return { canvas, offsetX: left, offsetY: top };
  }

  private distanceField(
    shape: GlyphShape,
    matrix: Matrix,
    glyphX: number,
    glyphY: number,
    width: number,
    height: number,
    inside: boolean,
  ): FieldEntry {
    const source =
      "path" in shape.source ? shape.source.key : `${fontToCss(shape.source.font)}\u0000${shape.source.text}`;
    const key = [source, ...matrix, glyphX, glyphY, width, height].join("\u0000");
    let entry = this.fieldCache.get(key);
    if (entry) {
      if (inside && !entry.inside) {
        measureInside(entry.field, entry.width, entry.height);
        entry.inside = true;
      }
      return entry;
    }

    const fieldWidth = width * SUPERSAMPLE;
    const fieldHeight = height * SUPERSAMPLE;
    const ctx = context2d(createCanvas(fieldWidth, fieldHeight));
    const [a, b, c, d] = matrix;
    ctx.setTransform(
      a * SUPERSAMPLE,
      b * SUPERSAMPLE,
      c * SUPERSAMPLE,
      d * SUPERSAMPLE,
      glyphX * SUPERSAMPLE,
      glyphY * SUPERSAMPLE,
    );
    ctx.fillStyle = "#000";
    drawShape(ctx, shape, "fill");
    const { data } = ctx.getImageData(0, 0, fieldWidth, fieldHeight);
    entry = {
      field: signedDistanceField(data, fieldWidth, fieldHeight, inside),
      width: fieldWidth,
      height: fieldHeight,
      inside,
    };

    if (this.fieldCache.size > 64) this.fieldCache.delete(this.fieldCache.keys().next().value!);
    this.fieldCache.set(key, entry);
    return entry;
  }

  /** Distance fields are only reused across the layers of one build; the textures outlive them. */
  releaseFields(): void {
    this.fieldCache.clear();
  }

  clear(): void {
    this.boundsCache.clear();
    this.fieldCache.clear();
  }
}
