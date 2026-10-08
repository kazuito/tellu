import { type AnyCanvas, type Canvas2D, context2d, createCanvas } from "../canvas";
import { type FontSpec, fontToCss } from "../layout/measure";
import type { Layer, StrokePosition } from "../style/types";
import { type Box, createPaintStyle } from "./paint";
import { signedDistanceField, strokeCoverage } from "./sdf";

export interface GlyphShape {
  text: string;
  font: FontSpec;
  scaleX: number;
  scaleY: number;
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

interface GlyphBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FieldEntry {
  field: Float32Array;
  width: number;
  height: number;
}

const SUPERSAMPLE = 2;
const AA_MARGIN = 2;

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

  /**
   * @param paintBox The paint's scope box relative to the glyph origin, in layout px.
   * @param reach Extra margin around the glyph; layers of one glyph share it so distance fields can be reused.
   */
  rasterize(shape: GlyphShape, layer: Layer, paintBox: Box, reach: number): RasterResult {
    const { resolution: res, scaleX, scaleY, fracX, fracY } = shape;
    const bounds = this.glyphBounds(shape.text, shape.font);
    const margin = reach * res + AA_MARGIN;
    const left = Math.floor(fracX + bounds.left * scaleX * res - margin);
    const top = Math.floor(fracY + bounds.top * scaleY * res - margin);
    const width = Math.max(1, Math.ceil(fracX + bounds.right * scaleX * res + margin) - left);
    const height = Math.max(1, Math.ceil(fracY + bounds.bottom * scaleY * res + margin) - top);

    const canvas = createCanvas(width, height);
    const ctx = context2d(canvas);
    const { width: strokeWidth, position, join, miterLimit } = layerShape(layer);
    const glyphX = fracX - left;
    const glyphY = fracY - top;
    const isFill = strokeWidth === 0 && position === "outside";

    if (isFill || scaleX === scaleY) {
      ctx.setTransform(res * scaleX, 0, 0, res * scaleY, glyphX, glyphY);
      ctx.font = fontToCss(shape.font);
      ctx.fillStyle = ctx.strokeStyle = "#000";
      ctx.lineJoin = join;
      ctx.miterLimit = miterLimit;
      // The transform scales strokes, so widths are given in glyph units.
      const unit = 1 / scaleX;
      if (position === "outside") {
        if (strokeWidth > 0) {
          ctx.lineWidth = strokeWidth * 2 * unit;
          ctx.strokeText(shape.text, 0, 0);
        }
        ctx.fillText(shape.text, 0, 0);
      } else if (position === "inside") {
        ctx.fillText(shape.text, 0, 0);
        ctx.globalCompositeOperation = "destination-in";
        ctx.lineWidth = strokeWidth * 2 * unit;
        ctx.strokeText(shape.text, 0, 0);
      } else {
        ctx.lineWidth = strokeWidth * unit;
        ctx.strokeText(shape.text, 0, 0);
      }
    } else {
      // Non-uniform scale would distort a native stroke, so grow the scaled glyph with a distance field instead.
      const entry = this.distanceField(shape, glyphX, glyphY, width, height);
      const pixels = strokeCoverage(
        entry.field,
        entry.width,
        entry.height,
        SUPERSAMPLE,
        strokeWidth * res * SUPERSAMPLE,
        position,
      );
      ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
    }

    ctx.globalCompositeOperation = "source-in";
    ctx.setTransform(res, 0, 0, res, glyphX, glyphY);
    ctx.fillStyle = createPaintStyle(ctx, layer.paint, paintBox);
    ctx.fillRect(-glyphX / res, -glyphY / res, width / res, height / res);

    return { canvas, offsetX: left, offsetY: top };
  }

  private distanceField(shape: GlyphShape, glyphX: number, glyphY: number, width: number, height: number): FieldEntry {
    const css = fontToCss(shape.font);
    const key = [css, shape.text, shape.scaleX, shape.scaleY, shape.resolution, glyphX, glyphY, width, height].join(
      "\u0000",
    );
    let entry = this.fieldCache.get(key);
    if (entry) return entry;

    const fieldWidth = width * SUPERSAMPLE;
    const fieldHeight = height * SUPERSAMPLE;
    const ctx = context2d(createCanvas(fieldWidth, fieldHeight));
    const scale = shape.resolution * SUPERSAMPLE;
    ctx.setTransform(scale * shape.scaleX, 0, 0, scale * shape.scaleY, glyphX * SUPERSAMPLE, glyphY * SUPERSAMPLE);
    ctx.font = css;
    ctx.fillStyle = "#000";
    ctx.fillText(shape.text, 0, 0);
    const { data } = ctx.getImageData(0, 0, fieldWidth, fieldHeight);
    entry = { field: signedDistanceField(data, fieldWidth, fieldHeight), width: fieldWidth, height: fieldHeight };

    if (this.fieldCache.size > 64) this.fieldCache.delete(this.fieldCache.keys().next().value!);
    this.fieldCache.set(key, entry);
    return entry;
  }

  clear(): void {
    this.boundsCache.clear();
    this.fieldCache.clear();
  }
}
