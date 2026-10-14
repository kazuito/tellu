import { resolveLength } from "./defaults";
import type {
  BevelShading,
  BoxDecoration,
  InsetShading,
  Layer,
  Length,
  Paint,
  PlateStyle,
  SatinShading,
  ShapeGradient,
} from "./types";

type Pair = readonly [x: number, y: number];

/** A `Shading` with its lengths in px. */
export type ResolvedShading =
  | (InsetShading & { offset?: Pair; size?: number })
  | (BevelShading & { size?: number })
  | (SatinShading & { offset?: Pair; size?: number });

/** A `ShapeGradient` with its `size` in px. */
export type ResolvedShapeGradient = ShapeGradient & { size?: number };

/** A `Layer` with every length in px, as it is drawn. */
export type ResolvedLayer = Layer & {
  paint: Paint | ResolvedShapeGradient;
  stroke?: number;
  offset?: Pair;
  blur?: number;
  shading?: ResolvedShading;
};

/** A `PlateStyle` with every length in px. */
export type ResolvedPlate = PlateStyle & {
  padding?: number | Pair;
  radius?: number;
  stroke?: { width: number; paint: Paint };
  offset?: Pair;
  blur?: number;
};

/** A `BoxDecoration` with the lengths it is drawn with in px (its `padding` is applied by layout). */
export type ResolvedBoxDecoration = BoxDecoration & {
  radius?: number;
  stroke?: { width: number; paint: Paint };
  offset?: Pair;
  blur?: number;
};

const isEm = (length: Length | undefined) => typeof length === "object";
const isEmPair = (pair: readonly [Length, Length] | undefined) => !!pair && (isEm(pair[0]) || isEm(pair[1]));
const isPair = (value: Length | readonly [Length, Length]): value is readonly [Length, Length] => Array.isArray(value);
/** Whether a padding of one length or a pair of lengths has an `{ em }` length. */
const isEmPadding = (padding: Length | readonly [Length, Length] | undefined) =>
  padding !== undefined && (isPair(padding) ? isEmPair(padding) : isEm(padding));

function length(value: Length | undefined, em: number): number | undefined {
  return value === undefined ? undefined : resolveLength(value, em);
}

function pair(value: readonly [Length, Length] | undefined, em: number): Pair | undefined {
  return value && [resolveLength(value[0], em), resolveLength(value[1], em)];
}

function resolveShading(shading: Layer["shading"], em: number): ResolvedShading | undefined {
  if (!shading || !(isEm(shading.size) || ("offset" in shading && isEmPair(shading.offset)))) {
    return shading as ResolvedShading | undefined;
  }
  if (shading.type === "bevel") return { ...shading, size: length(shading.size, em) };
  return { ...shading, size: length(shading.size, em), offset: pair(shading.offset, em) };
}

/**
 * A layer with its `{ em }` lengths in px, at `em` px per em: the font size of its run after `shrink`. A layer with
 * only px lengths is returned as it is.
 */
export function resolveLayer(layer: Layer, em: number): ResolvedLayer {
  const shading = resolveShading(layer.shading, em);
  const shapeSize = typeof layer.paint === "object" && layer.paint.type === "shape" && isEm(layer.paint.size);
  if (!isEm(layer.stroke) && !isEmPair(layer.offset) && !isEm(layer.blur) && shading === layer.shading && !shapeSize) {
    return layer as ResolvedLayer;
  }
  const resolved: ResolvedLayer = {
    ...layer,
    paint: layer.paint as ResolvedLayer["paint"],
    stroke: length(layer.stroke, em),
    offset: pair(layer.offset, em),
    blur: length(layer.blur, em),
    shading,
  };
  if (shapeSize) {
    const paint = layer.paint as ShapeGradient;
    resolved.paint = { ...paint, size: length(paint.size, em) };
  }
  return resolved;
}

/** A plate with its `{ em }` lengths in px, at `em` px per em: the base font size after `shrink`. */
export function resolvePlate(style: PlateStyle, em: number): ResolvedPlate {
  const { padding } = style;
  if (
    !isEmPadding(padding) &&
    !isEm(style.radius) &&
    !isEm(style.stroke?.width) &&
    !isEmPair(style.offset) &&
    !isEm(style.blur)
  ) {
    return style as ResolvedPlate;
  }
  return {
    ...style,
    padding: padding === undefined ? undefined : isPair(padding) ? pair(padding, em) : resolveLength(padding, em),
    radius: length(style.radius, em),
    stroke: style.stroke && { ...style.stroke, width: resolveLength(style.stroke.width, em) },
    offset: pair(style.offset, em),
    blur: length(style.blur, em),
  };
}

/** Whether a box decoration has `{ em }` lengths, which make its look depend on the font size of its run. */
export function boxDecorationUsesEm(decoration: BoxDecoration): boolean {
  return (
    isEmPadding(decoration.padding) ||
    isEm(decoration.radius) ||
    isEm(decoration.stroke?.width) ||
    isEmPair(decoration.offset) ||
    isEm(decoration.blur)
  );
}

/**
 * The padding of a box decoration in px, `[along, across]` the line, at `em` px per em: the font size of its glyphs.
 */
export function boxDecorationPadding(decoration: BoxDecoration, em: number): [along: number, across: number] {
  const { padding = 0 } = decoration;
  if (isPair(padding)) return [resolveLength(padding[0], em), resolveLength(padding[1], em)];
  const both = resolveLength(padding, em);
  return [both, both];
}

/** A box decoration with the lengths it is drawn with in px, at `em` px per em: the font size of its glyphs. */
export function resolveBoxDecoration(decoration: BoxDecoration, em: number): ResolvedBoxDecoration {
  if (!boxDecorationUsesEm(decoration)) return decoration as ResolvedBoxDecoration;
  return {
    ...decoration,
    radius: length(decoration.radius, em),
    stroke: decoration.stroke && { ...decoration.stroke, width: resolveLength(decoration.stroke.width, em) },
    offset: pair(decoration.offset, em),
    blur: length(decoration.blur, em),
  };
}
