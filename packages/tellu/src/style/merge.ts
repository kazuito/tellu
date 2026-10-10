import { stripUndefined } from "./defaults";
import type { Layer, LayerPatch, StyleOverride, TextStyle } from "./types";

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

/**
 * Combines an outer override with an inner one; the inner one wins. Layer patches merge key by key, and an inner patch
 * applies to an outer layer array. This is how nested markup tags combine.
 */
export function mergeOverrides(
  outer: StyleOverride | undefined,
  inner: StyleOverride | undefined,
): StyleOverride | undefined {
  if (!outer) return inner;
  if (!inner) return outer;
  const merged: StyleOverride = { ...outer, ...stripUndefined(inner) };
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
 * `id`. `undefined` values are ignored.
 */
export function applyOverride(base: TextStyle, override: StyleOverride | undefined): TextStyle {
  if (!override) return base;
  const { layers, ...rest } = override;
  const style: TextStyle = { ...base, ...stripUndefined(rest) };
  if (layers) style.layers = isLayerPatch(layers) ? applyLayerPatch(base.layers, layers) : layers;
  return style;
}
