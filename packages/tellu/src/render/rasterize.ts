import { type AnyCanvas, type Canvas2D, context2d, createCanvas } from "../canvas";
import { type FontSpec, fontToCss } from "../layout/measure";
import type { Box, Layer, ShapeGradient, StrokePosition } from "../style/types";
import { colorRamp, createPaintStyle, rampIndex } from "./paint";
import { measureInside, shapeOffsets, signedDistanceField, strokeCoverage } from "./sdf";
import { type WarpMapping, warpedBounds } from "./warp";

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
  /** Clockwise rotation in degrees after scaling, e.g. along a text path. Default: `0`. */
  angle?: number;
  resolution: number;
  /** Sub-pixel position of the glyph origin in device pixels, `[0, 1)`. */
  fracX: number;
  fracY: number;
  /**
   * Bends the shape. With a warp the shape is placed absolutely: `origin` is its origin in layout px, `fracX` and
   * `fracY` are unused, and the result's offset is in device px from the layout origin.
   */
  warp?: { mapping: WarpMapping; key: string; origin: readonly [x: number, y: number] };
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
/** Font size at which glyphs are tested for colors of their own. */
const COLOR_TEST_SIZE = 32;

type Matrix = readonly [a: number, b: number, c: number, d: number];

/** Glyph space → device pixels: rotate, then scale on screen, then turn by `angle`. */
function glyphMatrix({ scaleX, scaleY, rotation, angle = 0, resolution }: GlyphShape): Matrix {
  const [a, b, c, d]: Matrix =
    rotation === 90
      ? [0, resolution * scaleY, -resolution * scaleX, 0]
      : [resolution * scaleX, 0, 0, resolution * scaleY];
  if (angle === 0) return [a, b, c, d];
  const cos = Math.cos((angle * Math.PI) / 180);
  const sin = Math.sin((angle * Math.PI) / 180);
  return [cos * a - sin * b, sin * a + cos * b, cos * c - sin * d, sin * c + cos * d];
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

/** Whether a layer reads distances inside the shape: inside or centered strokes, shading, or a shape gradient fill. */
function needsInside(layer: Layer): boolean {
  const { width, position } = layerShape(layer);
  const shapePaint = typeof layer.paint === "object" && layer.paint.type === "shape";
  return position !== "outside" || !!layer.shading || (shapePaint && width === 0);
}

/**
 * Whether drawn pixels have colors of their own: a glyph drawn in black has only black pixels unless the font colors
 * it (emoji, color fonts). `data` is RGBA, as from `getImageData`.
 */
export function hasColorPixels(data: Uint8ClampedArray): boolean {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0 && (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0)) return true;
  }
  return false;
}

/** Whether a layer keeps the colors of color glyphs: `colorGlyphs: "keep"` on a layer that paints the glyph itself. */
export function keepsGlyphColors(layer: Layer): boolean {
  if (layer.colorGlyphs !== "keep" || layer.shading) return false;
  const { width, position } = layerShape(layer);
  const shapePaint = typeof layer.paint === "object" && layer.paint.type === "shape";
  return width === 0 && position === "outside" && !shapePaint;
}

/** Puts a layer's coverage (colored, for a shape gradient) from a distance field into the canvas. */
function putCoverage(ctx: Canvas2D, entry: FieldEntry, layer: Layer, res: number, width: number, height: number): void {
  const { width: strokeWidth, position } = layerShape(layer);
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
  if (typeof layer.paint === "object" && layer.paint.type === "shape") {
    colorByShape(pixels, entry, layer.paint, strokeWidth * res, position, res);
  }
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
}

/** Paints the coverage in the canvas with the layer's paint, stretched over `paintBox` relative to the origin. */
function paintCoverage(
  ctx: Canvas2D,
  layer: Layer,
  paintBox: Box,
  res: number,
  originX: number,
  originY: number,
  width: number,
  height: number,
): void {
  ctx.globalCompositeOperation = "source-in";
  ctx.setTransform(res, 0, 0, res, originX, originY);
  ctx.fillStyle = createPaintStyle(ctx, layer.paint as Exclude<Layer["paint"], ShapeGradient>, paintBox);
  ctx.fillRect(-originX / res, -originY / res, width / res, height / res);
}

/**
 * Colors coverage pixels with a shape gradient, from each pixel's distance to the glyph's edge. `strokeWidth` is in
 * device pixels.
 */
function colorByShape(
  pixels: Uint8ClampedArray,
  entry: FieldEntry,
  paint: ShapeGradient,
  strokeWidth: number,
  position: StrokePosition,
  res: number,
): void {
  const offsets = shapeOffsets(
    entry.field,
    entry.width,
    entry.height,
    SUPERSAMPLE,
    strokeWidth * SUPERSAMPLE,
    position,
    (paint.size ?? 8) * res * SUPERSAMPLE,
  );
  const ramp = colorRamp(paint.stops);
  for (let i = 0; i < offsets.length; i++) {
    const from = rampIndex(paint.reverse ? 1 - offsets[i]! : offsets[i]!) * 4;
    const to = i * 4;
    pixels[to] = ramp[from]!;
    pixels[to + 1] = ramp[from + 1]!;
    pixels[to + 2] = ramp[from + 2]!;
    pixels[to + 3] = Math.round((pixels[to + 3]! * ramp[from + 3]!) / 255);
  }
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
  private colorContext: Canvas2D | undefined;
  private colorCache = new Map<string, boolean>();

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
    if (shape.warp) return this.rasterizeWarped(shape, shape.warp, layer, paintBox, reach);
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
    const shapePaint = typeof layer.paint === "object" && layer.paint.type === "shape" ? layer.paint : undefined;
    // A color glyph (an emoji) drawn in black keeps its own colors, so it isn't painted.
    const ownColors =
      keepsGlyphColors(layer) && "text" in shape.source && this.isColorGlyph(shape.source.text, shape.source.font);

    // Chrome's strokeText leaves holes where a wide stroke overruns a small counter (the loop of す), so round
    // strokes are grown from a distance field. Other joins need the native stroker, which only scales uniformly.
    // Shading is computed from the distance field too.
    if ((isFill || (join !== "round" && scaleX === scaleY)) && !layer.shading && !shapePaint) {
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
      const entry = this.distanceField(shape, matrix, glyphX, glyphY, width, height, needsInside(layer));
      putCoverage(ctx, entry, layer, res, width, height);
    }

    if (!shapePaint && !ownColors) paintCoverage(ctx, layer, paintBox, res, glyphX, glyphY, width, height);
    return { canvas, offsetX: left, offsetY: top };
  }

  /**
   * A warped shape: its fill is drawn flat, bent by inverse-mapping every sample of the output, and only then grown
   * into the layer's shape, so outlines keep an even width. Always on the distance field, so joins are round.
   * `paintBox` is in layout coordinates.
   */
  private rasterizeWarped(
    shape: GlyphShape,
    warp: NonNullable<GlyphShape["warp"]>,
    layer: Layer,
    paintBox: Box,
    reach: number,
  ): RasterResult {
    const res = shape.resolution;
    const [originX, originY] = warp.origin;
    const matrix = glyphMatrix(shape);
    const ink = transformBounds(this.shapeBounds(shape), matrix);
    // The flat ink in layout px, with a pixel to spare for antialiasing.
    const flat = {
      x: originX + ink.left / res - 1,
      y: originY + ink.top / res - 1,
      width: (ink.right - ink.left) / res + 2,
      height: (ink.bottom - ink.top) / res + 2,
    };
    const bent = warpedBounds(warp.mapping, flat, 8);
    const margin = reach * res + AA_MARGIN;
    const left = Math.floor(bent.x * res - margin);
    const top = Math.floor(bent.y * res - margin);
    const width = Math.max(1, Math.ceil((bent.x + bent.width) * res + margin) - left);
    const height = Math.max(1, Math.ceil((bent.y + bent.height) * res + margin) - top);

    const canvas = createCanvas(width, height);
    const ctx = context2d(canvas);
    if (keepsGlyphColors(layer) && "text" in shape.source && this.isColorGlyph(shape.source.text, shape.source.font)) {
      const pixels = this.warpedColors(shape, warp, matrix, flat, bent, left, top, width, height);
      ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
      return { canvas, offsetX: left, offsetY: top };
    }
    const entry = this.warpedField(shape, warp, matrix, flat, bent, left, top, width, height, needsInside(layer));
    putCoverage(ctx, entry, layer, res, width, height);
    if (!(typeof layer.paint === "object" && layer.paint.type === "shape")) {
      paintCoverage(ctx, layer, paintBox, res, -left, -top, width, height);
    }
    return { canvas, offsetX: left, offsetY: top };
  }

  /** The distance field of a warped shape over the output region, cached per glyph like flat fields. */
  private warpedField(
    shape: GlyphShape,
    warp: NonNullable<GlyphShape["warp"]>,
    matrix: Matrix,
    flat: Box,
    /** Where the flat ink goes: samples outside it can't land on ink, so they aren't mapped back. */
    bent: Box,
    left: number,
    top: number,
    width: number,
    height: number,
    inside: boolean,
  ): FieldEntry {
    const source =
      "path" in shape.source ? shape.source.key : `${fontToCss(shape.source.font)}\u0000${shape.source.text}`;
    const key = ["warp", warp.key, source, ...matrix, ...warp.origin, left, top, width, height].join("\u0000");
    let entry = this.fieldCache.get(key);
    if (entry) {
      if (inside && !entry.inside) {
        measureInside(entry.field, entry.width, entry.height);
        entry.inside = true;
      }
      return entry;
    }

    const scale = shape.resolution * SUPERSAMPLE;
    const sample = this.flatSampler(shape, warp, matrix, flat);
    const fieldWidth = width * SUPERSAMPLE;
    const fieldHeight = height * SUPERSAMPLE;
    const bentAlpha = new Uint8ClampedArray(fieldWidth * fieldHeight * 4);
    bendSamples(warp.mapping, bent, left, top, fieldWidth, fieldHeight, scale, (index, x, y) => {
      bentAlpha[index * 4 + 3] = sample(x, y, 3);
    });
    entry = {
      field: signedDistanceField(bentAlpha, fieldWidth, fieldHeight, inside),
      width: fieldWidth,
      height: fieldHeight,
      inside,
    };
    if (this.fieldCache.size > 64) this.fieldCache.delete(this.fieldCache.keys().next().value!);
    this.fieldCache.set(key, entry);
    return entry;
  }

  /**
   * Draws the shape flat and supersampled (in black, or in its own colors for a color glyph), and returns a bilinear
   * sampler of it at points in layout px: channel `3` is the alpha, `0`–`2` the colors premultiplied by it. Outside
   * the drawn area is empty.
   */
  private flatSampler(
    shape: GlyphShape,
    warp: NonNullable<GlyphShape["warp"]>,
    matrix: Matrix,
    flat: Box,
  ): (x: number, y: number, channel: number) => number {
    const scale = shape.resolution * SUPERSAMPLE;
    // The flat shape, supersampled, in device px from `flatLeft`, `flatTop`.
    const flatLeft = Math.floor(flat.x * scale);
    const flatTop = Math.floor(flat.y * scale);
    const flatWidth = Math.max(1, Math.ceil((flat.x + flat.width) * scale) - flatLeft);
    const flatHeight = Math.max(1, Math.ceil((flat.y + flat.height) * scale) - flatTop);
    const flatCtx = context2d(createCanvas(flatWidth, flatHeight));
    const [a, b, c, d] = matrix;
    flatCtx.setTransform(
      a * SUPERSAMPLE,
      b * SUPERSAMPLE,
      c * SUPERSAMPLE,
      d * SUPERSAMPLE,
      warp.origin[0] * scale - flatLeft,
      warp.origin[1] * scale - flatTop,
    );
    flatCtx.fillStyle = "#000";
    drawShape(flatCtx, shape, "fill");
    const pixels = flatCtx.getImageData(0, 0, flatWidth, flatHeight).data;
    return (x, y, channel) => {
      // Bilinear, in supersampled flat pixels.
      const fx = x * scale - flatLeft - 0.5;
      const fy = y * scale - flatTop - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      if (x0 < -1 || y0 < -1 || x0 >= flatWidth || y0 >= flatHeight) return 0;
      const at = (px: number, py: number) => {
        if (px < 0 || py < 0 || px >= flatWidth || py >= flatHeight) return 0;
        const i = (py * flatWidth + px) * 4;
        return channel === 3 ? pixels[i + 3]! : (pixels[i + channel]! * pixels[i + 3]!) / 255;
      };
      const tx = fx - x0;
      const ty = fy - y0;
      const upper = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const lower = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      return upper * (1 - ty) + lower * ty;
    };
  }

  /** A warped color glyph in its own colors, as unpremultiplied RGBA pixels of the output region. */
  private warpedColors(
    shape: GlyphShape,
    warp: NonNullable<GlyphShape["warp"]>,
    matrix: Matrix,
    flat: Box,
    bent: Box,
    left: number,
    top: number,
    width: number,
    height: number,
  ): Uint8ClampedArray<ArrayBuffer> {
    const scale = shape.resolution * SUPERSAMPLE;
    const sample = this.flatSampler(shape, warp, matrix, flat);
    const fieldWidth = width * SUPERSAMPLE;
    const fieldHeight = height * SUPERSAMPLE;
    // Premultiplied sums of the supersamples of each output pixel.
    const sums = new Float32Array(width * height * 4);
    bendSamples(warp.mapping, bent, left, top, fieldWidth, fieldHeight, scale, (index, x, y) => {
      const pixel =
        (Math.floor(index / fieldWidth / SUPERSAMPLE) * width + Math.floor((index % fieldWidth) / SUPERSAMPLE)) * 4;
      for (let channel = 0; channel < 4; channel++) sums[pixel + channel]! += sample(x, y, channel);
    });
    const pixels = new Uint8ClampedArray(width * height * 4);
    const count = SUPERSAMPLE * SUPERSAMPLE;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = sums[i + 3]! / count;
      if (alpha <= 0) continue;
      pixels[i] = (sums[i]! / count / alpha) * 255;
      pixels[i + 1] = (sums[i + 1]! / count / alpha) * 255;
      pixels[i + 2] = (sums[i + 2]! / count / alpha) * 255;
      pixels[i + 3] = alpha;
    }
    return pixels;
  }

  /**
   * Whether a glyph has colors of its own, such as an emoji or a glyph of a color font. Drawn in black, a plain glyph
   * has only black pixels. Tested once per glyph and font, at a small size.
   */
  isColorGlyph(text: string, font: FontSpec): boolean {
    const test = { ...font, size: COLOR_TEST_SIZE };
    const css = fontToCss(test);
    const key = `${css}\u0000${text}`;
    let color = this.colorCache.get(key);
    if (color === undefined) {
      const bounds = this.glyphBounds(text, test);
      const width = Math.max(1, Math.ceil(bounds.right - bounds.left) + 2);
      const height = Math.max(1, Math.ceil(bounds.bottom - bounds.top) + 2);
      // Read back once per glyph: a CPU-backed canvas makes that cheap.
      this.colorContext ??= context2d(createCanvas(1, 1), { willReadFrequently: true });
      const ctx = this.colorContext;
      // Resizing clears the canvas and resets the context.
      ctx.canvas.width = width;
      ctx.canvas.height = height;
      ctx.font = css;
      ctx.fillStyle = "#000";
      ctx.fillText(text, 1 - bounds.left, 1 - bounds.top);
      color = hasColorPixels(ctx.getImageData(0, 0, width, height).data);
      this.colorCache.set(key, color);
    }
    return color;
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
    this.colorCache.clear();
  }
}

/**
 * Visits the supersampled pixels of a warped output region whose centers the warp maps back onto the flat shape:
 * `index` is the pixel, `x`, `y` the point in layout px it comes from. Neighbouring pixels come from neighbouring
 * points, so each solution seeds the next.
 */
function bendSamples(
  mapping: WarpMapping,
  /** Where the flat ink goes: pixels outside it can't land on ink, so they aren't mapped back. */
  bent: Box,
  left: number,
  top: number,
  fieldWidth: number,
  fieldHeight: number,
  scale: number,
  visit: (index: number, x: number, y: number) => void,
): void {
  let rowGuess: [number, number] | null = null;
  const [minX, minY, maxX, maxY] = [bent.x - 1, bent.y - 1, bent.x + bent.width + 1, bent.y + bent.height + 1];
  for (let py = 0; py < fieldHeight; py++) {
    const y = (top * SUPERSAMPLE + py + 0.5) / scale;
    if (y < minY || y > maxY) continue;
    let guess = rowGuess;
    let first = true;
    for (let px = 0; px < fieldWidth; px++) {
      const x = (left * SUPERSAMPLE + px + 0.5) / scale;
      if (x < minX || x > maxX) continue;
      const point = mapping.inverse(x, y, guess ?? undefined);
      // The next row starts from the first solution of this one.
      if (first) rowGuess = point;
      first = false;
      guess = point;
      if (point) visit(py * fieldWidth + px, point[0], point[1]);
    }
  }
}
