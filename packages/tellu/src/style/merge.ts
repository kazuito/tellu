import { stableKey } from "../utils/stableKey";
import { stripUndefined } from "./defaults";
import type { Decoration, GlyphTransform, Layer, LayerPatch, LayerTransform, StyleOverride, TextStyle } from "./types";

export function isLayerPatch(layers: readonly Layer[] | LayerPatch): layers is LayerPatch {
  return !Array.isArray(layers);
}

export function applyLayerPatch(layers: readonly Layer[], patch: LayerPatch): Layer[] {
  return layers.map((layer, index) => {
    const byIndex = patch[index];
    const byId = layer.id !== undefined ? patch[layer.id] : undefined;
    if (!byIndex && !byId) return layer;
    return { ...layer, ...(byIndex && stripUndefined(byIndex)), ...(byId && stripUndefined(byId)) };
  });
}

/** `outer` followed by the decorations of `inner` it doesn't already have. */
function addDecorations(
  outer: readonly Decoration[] | undefined,
  inner: readonly Decoration[] | undefined,
): readonly Decoration[] | undefined {
  if (!outer || outer.length === 0) return inner;
  if (!inner || inner.length === 0) return outer;
  const keys = new Set(outer.map(stableKey));
  const added = inner.filter((decoration) => !keys.has(stableKey(decoration)));
  return added.length === 0 ? outer : [...outer, ...added];
}

/**
 * Combines an outer override with an inner one; the inner one wins. Layer patches merge key by key, and an inner patch
 * applies to an outer layer array. Decorations add up: the inner override's follow the outer one's. This is how nested
 * markup tags combine.
 */
export function mergeOverrides(
  outer: StyleOverride | undefined,
  inner: StyleOverride | undefined,
): StyleOverride | undefined {
  if (!outer) return inner;
  if (!inner) return outer;
  const merged: StyleOverride = { ...outer, ...stripUndefined(inner) };
  const decorations = addDecorations(outer.decorations, inner.decorations);
  if (decorations) merged.decorations = decorations;
  if (outer.layers && inner.layers && isLayerPatch(inner.layers)) {
    merged.layers = isLayerPatch(outer.layers)
      ? mergeLayerPatches(outer.layers, inner.layers)
      : applyLayerPatch(outer.layers, inner.layers);
  }
  return merged;
}

function mergeLayerPatches(outer: LayerPatch, inner: LayerPatch): LayerPatch {
  const merged: Record<string, Partial<Layer>> = { ...outer };
  for (const key of Object.keys(inner)) {
    merged[key] = { ...merged[key], ...stripUndefined(inner[key]!) };
  }
  return merged;
}

/**
 * Applies a run's override to a full style: an array of `layers` replaces them, an object patches them by index or
 * `id`, and `decorations` are added after the base style's. `undefined` values are ignored.
 */
export function applyOverride(base: TextStyle, override: StyleOverride | undefined): TextStyle {
  if (!override) return base;
  const { layers, decorations, ...rest } = override;
  const style: TextStyle = { ...base, ...stripUndefined(rest) };
  if (layers) style.layers = isLayerPatch(layers) ? applyLayerPatch(base.layers, layers) : layers;
  if (decorations) style.decorations = addDecorations(base.decorations, decorations) ?? [];
  return style;
}

/**
 * A glyph's transform of one layer, from `GlyphTransform.layers`: the entry for the layer's index merged with the entry
 * for its `id`, which wins.
 */
export function layerTransformFor(
  layers: GlyphTransform["layers"],
  slot: number,
  id: string | undefined,
): LayerTransform | undefined {
  if (!layers) return undefined;
  const byIndex = layers[slot];
  const byId = id === undefined ? undefined : layers[id];
  if (!byIndex || !byId) return byId ?? byIndex;
  return { ...byIndex, ...stripUndefined(byId) };
}
