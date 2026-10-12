import type { Layout } from "../layout/layout";
import type { Layer } from "../style/types";
import { stableKey } from "../utils/stableKey";

/** A glyph's layer, or a line decoration's layer (index into `layout.decorations`). */
export type GroupMember = { glyph: number; layer: Layer } | { decoration: number; layer: Layer };

/** Glyph layers composited together: one decoration slot sharing the same effects. */
export interface LayerGroup {
  key: string;
  slot: number;
  /** Source of the group's effects (offset, blur, opacity, blend mode, filters). */
  effects: Layer;
  members: GroupMember[];
}

export function effectsKey(layer: Layer): string {
  const effects: unknown[] = [
    layer.offset,
    layer.blur,
    layer.blurQuality,
    layer.opacity,
    layer.blendMode,
    layer.filters,
  ];
  // Only layers with a contour or noise add them, so keys of other layers stay as they were.
  if (layer.contour !== undefined || layer.noise) effects.push(layer.contour, layer.noise);
  return stableKey(effects);
}

/**
 * Groups every visible glyph layer by slot (layer index) and effects. Groups are ordered by slot,
 * so all glyphs' outlines sit below all glyphs' fills and neighbouring outlines merge. Line decorations are part of
 * the text's shape: each one joins the groups of its run's layers, after the glyphs.
 */
export function planGroups(layout: Layout): LayerGroup[] {
  const groups = new Map<string, LayerGroup>();
  const add = (layers: readonly Layer[], member: (layer: Layer) => GroupMember) =>
    layers.forEach((layer, slot) => {
      if (layer.visible === false) return;
      const key = `${slot}|${effectsKey(layer)}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, slot, effects: layer, members: [] };
        groups.set(key, group);
      }
      group.members.push(member(layer));
    });
  for (const glyph of layout.glyphs) {
    if (glyph.isWhitespace) continue;
    add(layout.runs[glyph.runIndex]!.style.layers, (layer) => ({ glyph: glyph.index, layer }));
  }
  layout.decorations.forEach(({ decoration, runIndex }, index) => {
    if (decoration.type !== "line") return;
    add(layout.runs[runIndex]!.style.layers, (layer) => ({ decoration: index, layer }));
  });
  return [...groups.values()].sort((a, b) => a.slot - b.slot);
}
