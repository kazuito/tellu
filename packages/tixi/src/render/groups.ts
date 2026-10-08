import type { Layout } from "../layout/layout";
import type { Layer } from "../style/types";
import { stableKey } from "../utils/stableKey";

export interface GroupMember {
  glyph: number;
  layer: Layer;
}

/** Glyph layers composited together: one decoration slot sharing the same effects. */
export interface LayerGroup {
  key: string;
  slot: number;
  /** Source of the group's effects (offset, blur, opacity, blend mode, filters). */
  effects: Layer;
  members: GroupMember[];
}

export function effectsKey(layer: Layer): string {
  return stableKey([layer.offset, layer.blur, layer.blurQuality, layer.opacity, layer.blendMode, layer.filters]);
}

/**
 * Groups every visible glyph layer by slot (layer index) and effects. Groups are ordered by slot,
 * so all glyphs' outlines sit below all glyphs' fills and neighbouring outlines merge.
 */
export function planGroups(layout: Layout): LayerGroup[] {
  const groups = new Map<string, LayerGroup>();
  for (const glyph of layout.glyphs) {
    if (glyph.isWhitespace) continue;
    layout.runs[glyph.runIndex]!.style.layers.forEach((layer, slot) => {
      if (layer.visible === false) return;
      const key = `${slot}|${effectsKey(layer)}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, slot, effects: layer, members: [] };
        groups.set(key, group);
      }
      group.members.push({ glyph: glyph.index, layer });
    });
  }
  return [...groups.values()].sort((a, b) => a.slot - b.slot);
}
