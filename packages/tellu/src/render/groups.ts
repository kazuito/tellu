import type { Layout } from "../layout/layout";
import { type ResolvedLayer, resolveLayer } from "../style/resolve";
import { stableKey } from "../utils/stableKey";

/** A glyph's layer, or a line decoration's layer (index into `layout.decorations`). */
export type GroupMember = { glyph: number; layer: ResolvedLayer } | { decoration: number; layer: ResolvedLayer };

/** Glyph layers composited together: one decoration slot sharing the same effects. */
export interface LayerGroup {
  key: string;
  slot: number;
  /** Source of the group's effects (offset, blur, opacity, blend mode, filters). */
  effects: ResolvedLayer;
  /** The copies of its members' layers (`Layer.repeat`), drawn just below the group of the layers themselves. */
  copies: boolean;
  members: GroupMember[];
}

export function effectsKey(layer: ResolvedLayer): string {
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

/** The layers of each run with their `{ em }` lengths in px, at the run's font size after `shrink`. */
export function runLayers(layout: Layout): ResolvedLayer[][] {
  return layout.runs.map((run) => {
    const em = run.style.fontSize * layout.fontScale;
    return run.style.layers.map((layer) => resolveLayer(layer, em));
  });
}

/**
 * Groups every visible glyph layer by slot (layer index) and effects. Groups are ordered by slot,
 * so all glyphs' outlines sit below all glyphs' fills and neighbouring outlines merge. A layer with `repeat` also joins
 * a group of copies just below its own. Line decorations are part of
 * the text's shape: each one joins the groups of its run's layers, after the glyphs.
 */
export function planGroups(
  layout: Layout,
  layers: readonly (readonly ResolvedLayer[])[] = runLayers(layout),
): LayerGroup[] {
  const groups = new Map<string, LayerGroup>();
  const add = (list: readonly ResolvedLayer[], member: (layer: ResolvedLayer) => GroupMember) =>
    list.forEach((layer, slot) => {
      if (layer.visible === false) return;
      const join = (copies: boolean) => {
        const key = `${slot}|${copies ? "copies|" : ""}${effectsKey(layer)}`;
        let group = groups.get(key);
        if (!group) {
          group = { key, slot, effects: layer, copies, members: [] };
          groups.set(key, group);
        }
        group.members.push(member(layer));
      };
      if (repeatCount(layer) > 0) join(true);
      join(false);
    });
  for (const glyph of layout.glyphs) {
    if (glyph.isWhitespace) continue;
    add(layers[glyph.runIndex]!, (layer) => ({ glyph: glyph.index, layer }));
  }
  layout.decorations.forEach(({ decoration, runIndex }, index) => {
    if (decoration.type !== "line") return;
    add(layers[runIndex]!, (layer) => ({ decoration: index, layer }));
  });
  // In each slot, copies go below the layers they copy.
  return [...groups.values()].sort((a, b) => a.slot - b.slot || Number(b.copies) - Number(a.copies));
}

/** How many copies `Layer.repeat` draws: `0` to `256`. */
export function repeatCount(layer: ResolvedLayer): number {
  return layer.repeat ? Math.max(0, Math.min(256, Math.round(layer.repeat.count))) : 0;
}
