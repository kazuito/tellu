import { AlphaFilter, BlurFilter, Container, type DestroyOptions, type Filter, Rectangle, Sprite } from "pixi.js";
import { decorationKey } from "./layout/decorations";
import { type Layout, layoutText } from "./layout/layout";
import { fontSpecOf, fontToCss, getDefaultMeasurer, type Measurer } from "./layout/measure";
import { isVertical } from "./layout/vertical";
import { blurPadding } from "./render/blur";
import { planGroups } from "./render/groups";
import { paintKey, paintScope } from "./render/paint";
import { plateBoxes, rasterizeBoxes, rasterizePlate } from "./render/plate";
import { layerReach, layerShape } from "./render/rasterize";
import { ScopeBoxes } from "./render/scope";
import { invalidateTextures, rasterizer, TextureSet } from "./render/textureCache";
import type { Box, BoxDecoration, GlyphContext, GlyphTransform, Layer, PlateStyle, TextNodeProps } from "./style/types";
import { stableKey } from "./utils/stableKey";

export interface TextNodeOptions {
  /** Text measurement backend. Default: `getDefaultMeasurer()` (Canvas 2D). */
  measurer?: Measurer;
  /** Pixel density of the glyph bitmaps. Raise it when the node is scaled up. Default: `devicePixelRatio` or `1`. */
  resolution?: number;
}

interface GlyphSprite {
  sprite: Sprite;
  glyph: number;
  baseX: number;
  baseY: number;
}

const DEG = Math.PI / 180;
const SUBPIXEL_STEPS = 4;

/**
 * Styled text as a PixiJS container. Add it to any scene, or draw it into a canvas with `TextRenderer`.
 * The local origin is the top-left of the layout box.
 *
 * Text is laid out and rasterized synchronously, in the constructor and whenever the props change, so
 * `await loadFonts(props)` first. Setting equal props again doesn't rebuild, and a change to `glyphTransform` alone
 * only moves the existing glyphs. Call `destroy()` when done to release the shared glyph bitmaps.
 *
 * @example
 * await loadFonts(props);
 * const node = new TextNode(props);
 * app.stage.addChild(node);
 */
export class TextNode extends Container {
  private _props: TextNodeProps;
  private _resolution: number;
  private _layout: Layout | undefined;
  private contexts: GlyphContext[] = [];
  private glyphSprites: GlyphSprite[] = [];
  private builtKey = "";
  private transformed = false;
  private _revision = 0;
  private readonly measurer: Measurer;
  private readonly textures = new TextureSet();
  private readonly plateLayer = new Container({ label: "plate" });
  private readonly backDecorationLayer = new Container({ label: "decorations behind" });
  private readonly glyphLayer = new Container({ label: "glyphs" });
  private readonly frontDecorationLayer = new Container({ label: "decorations in front" });

  constructor(props: TextNodeProps, options: TextNodeOptions = {}) {
    super({ label: "text" });
    this._props = props;
    this.measurer = options.measurer ?? getDefaultMeasurer();
    this._resolution = options.resolution ?? (typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    this.addChild(this.plateLayer, this.backDecorationLayer, this.glyphLayer, this.frontDecorationLayer);
    this.refresh();
  }

  /** The current props. Setting them replaces all props and refreshes; `update()` merges instead. */
  get props(): TextNodeProps {
    return this._props;
  }

  set props(props: TextNodeProps) {
    this._props = props;
    this.refresh();
  }

  /** Merges `props` into the current props and refreshes. */
  update(props: Partial<TextNodeProps>): this {
    this._props = { ...this._props, ...props };
    this.refresh();
    return this;
  }

  /** Pixel density of the glyph bitmaps. Setting it re-rasterizes the text. */
  get resolution(): number {
    return this._resolution;
  }

  set resolution(resolution: number) {
    this._resolution = resolution;
    this.refresh();
  }

  /**
   * Increments whenever what this node paints changes: a rebuild, or glyph transforms with new output. Compare it with
   * the value at the last draw to skip redundant draws.
   */
  get revision(): number {
    return this._revision;
  }

  /** The current layout: lines, glyph positions and the layout box size. */
  get layout(): Layout {
    return this._layout!;
  }

  /** The layout box, `(0, 0, width, height)`. Outlines, shadows and transformed glyphs may paint outside it. */
  get layoutBounds(): Rectangle {
    return new Rectangle(0, 0, this.layout.width, this.layout.height);
  }

  /**
   * Everything this node paints, including the plate, outlines, shadows, blur and glyph transforms, in local
   * coordinates. Empty (`0 × 0`) when nothing is painted.
   */
  getInkBounds(): Rectangle {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const group of this.groups()) {
      if (!group.visible) continue;
      const bounds = group.getLocalBounds();
      if (bounds.width <= 0 || bounds.height <= 0) continue;
      const padding = (group.filters ?? []).reduce((sum: number, filter: Filter) => sum + filter.padding, 0);
      minX = Math.min(minX, group.x + bounds.minX - padding);
      minY = Math.min(minY, group.y + bounds.minY - padding);
      maxX = Math.max(maxX, group.x + bounds.maxX + padding);
      maxY = Math.max(maxY, group.y + bounds.maxY + padding);
    }
    if (minX === Infinity) return new Rectangle(0, 0, 0, 0);
    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Re-measures and redraws everything, e.g. after a web font finished loading. Glyph bitmaps are shared
   * between nodes, so this drops them for every node; other nodes keep theirs until they rebuild.
   * `<Text>` calls it when web fonts finish loading; with a bare `TextNode`, call it when a font arrives after the
   * node was built.
   */
  invalidate(): void {
    if ("clear" in this.measurer && typeof this.measurer.clear === "function") this.measurer.clear();
    invalidateTextures();
    this.builtKey = "";
    this.refresh();
  }

  /**
   * Rebuilds if anything but `glyphTransform` changed, then reapplies glyph transforms. Setting props calls it; call it
   * yourself when `glyphTransform` reads state that changed, such as the current frame.
   */
  refresh(): void {
    const { glyphTransform: _, ...rest } = this._props;
    const key = stableKey([rest, this._resolution]);
    if (key !== this.builtKey) {
      this.build();
      this.builtKey = key;
      this.transformed = true;
      this._revision++;
    }
    this.applyGlyphTransforms();
  }

  private build(): void {
    const layout = layoutText(this._props, this.measurer);
    this._layout = layout;
    this.contexts = createGlyphContexts(layout);

    for (const child of this.groups()) {
      child.parent?.removeChild(child);
      destroyFilters(child);
      child.destroy({ children: true });
    }
    this.glyphSprites = [];
    this.textures.begin();

    const res = this._resolution;
    const scopes = new ScopeBoxes(layout);
    const reach = layout.glyphs.map((glyph) =>
      Math.max(0, ...layout.runs[glyph.runIndex]!.style.layers.map(layerReach)),
    );

    for (const group of planGroups(layout)) {
      const container = createEffectContainer(group.effects, `slot ${group.slot}`);
      for (const { glyph: index, layer } of group.members) {
        const glyph = layout.glyphs[index]!;
        const style = layout.runs[glyph.runIndex]!.style;
        const font = fontSpecOf(style, glyph.fontSize);

        const [pixelX, fracX] = snap(glyph.x * res);
        const [pixelY, fracY] = snap(glyph.y * res);
        const originX = (pixelX + fracX) / res;
        const originY = (pixelY + fracY) / res;
        const scopeBox = scopes.get(paintScope(layer.paint), glyph);
        const paintBox = { ...scopeBox, x: scopeBox.x - originX, y: scopeBox.y - originY };
        const shape = {
          text: glyph.text,
          font,
          scaleX: glyph.scaleX,
          scaleY: glyph.scaleY,
          rotation: glyph.rotation,
          resolution: res,
          fracX,
          fracY,
        };

        const key = [
          glyph.text,
          fontToCss(font),
          glyph.scaleX,
          glyph.scaleY,
          glyph.rotation,
          res,
          fracX,
          fracY,
          reach[index],
          stableKey(layerShape(layer)),
          stableKey(layer.shading ?? null),
          paintKey(layer.paint),
          paintScope(layer.paint) === null ? "" : stableKey(roundBox(paintBox)),
        ].join("\u0000");
        const cached = this.textures.get(key, res, () => rasterizer.rasterize(shape, layer, paintBox, reach[index]!));

        const sprite = new Sprite({ texture: cached.texture, blendMode: "max", roundPixels: false });
        const baseX = (pixelX + cached.offsetX) / res;
        const baseY = (pixelY + cached.offsetY) / res;
        sprite.position.set(baseX, baseY);
        container.addChild(sprite);
        this.glyphSprites.push({ sprite, glyph: index, baseX, baseY });
      }
      this.glyphLayer.addChild(container);
    }

    if (this._props.background) this.buildPlate(layout, this._props.background);
    this.buildDecorations(layout);
    this.textures.end();
    rasterizer.releaseFields();
  }

  private buildPlate(layout: Layout, style: PlateStyle): void {
    const boxes = plateBoxes(layout, style);
    if (boxes.length === 0) return;
    const res = this._resolution;
    const key = `plate\u0000${stableKey([style, boxes, res])}`;
    let x = 0;
    let y = 0;
    const cached = this.textures.get(key, res, () => {
      const plate = rasterizePlate(style, boxes, res, isVertical(layout.writingMode));
      return { canvas: plate.canvas, offsetX: plate.x * res, offsetY: plate.y * res };
    });
    x = cached.offsetX / res;
    y = cached.offsetY / res;
    const container = createEffectContainer(
      { paint: style.paint, offset: style.offset, blur: style.blur, opacity: style.opacity, filters: style.filters },
      "plate",
    );
    const sprite = new Sprite(cached.texture);
    sprite.position.set(x, y);
    container.addChild(sprite);
    this.plateLayer.addChild(container);
  }

  /** Box decorations: one sprite per decoration, holding all its boxes, behind or in front of the glyphs. */
  private buildDecorations(layout: Layout): void {
    const res = this._resolution;
    const vertical = isVertical(layout.writingMode);
    // Equal decorations from different runs draw together.
    const boxes = new Map<string, { decoration: BoxDecoration; list: Box[] }>();
    for (const { decoration, box } of layout.decorations) {
      if (decoration.type !== "box" || (decoration.paint === undefined && !decoration.stroke)) continue;
      const key = decorationKey(decoration);
      const entry = boxes.get(key) ?? { decoration, list: [] };
      entry.list.push(box);
      boxes.set(key, entry);
    }
    for (const { decoration, list } of boxes.values()) {
      const key = `decoration\u0000${stableKey([decoration.paint ?? null, decoration.stroke ?? null, decoration.radius, decoration.skew, vertical, list, res])}`;
      const cached = this.textures.get(key, res, () => {
        const drawn = rasterizeBoxes(
          decoration,
          list.map((box) => ({ box, scope: box })),
          res,
          vertical,
        );
        return { canvas: drawn.canvas, offsetX: drawn.x * res, offsetY: drawn.y * res };
      });
      const container = createEffectContainer(
        {
          paint: "#000",
          offset: decoration.offset,
          blur: decoration.blur,
          opacity: decoration.opacity,
          blendMode: decoration.blendMode,
          filters: decoration.filters,
        },
        "decoration",
      );
      const sprite = new Sprite(cached.texture);
      sprite.position.set(cached.offsetX / res, cached.offsetY / res);
      container.addChild(sprite);
      (decoration.placement === "front" ? this.frontDecorationLayer : this.backDecorationLayer).addChild(container);
    }
  }

  /** Every group container: plate, decorations and glyph layer groups. */
  private groups(): Container[] {
    return [
      ...this.plateLayer.children,
      ...this.backDecorationLayer.children,
      ...this.glyphLayer.children,
      ...this.frontDecorationLayer.children,
    ];
  }

  private applyGlyphTransforms(): void {
    const fn = this._props.glyphTransform;
    if (!fn && !this.transformed) return;
    const layout = this.layout;
    const transforms: (GlyphTransform | null)[] = this.contexts.map((context) => fn?.(context) || null);

    let changed = false;
    for (const { sprite, glyph: index, baseX, baseY } of this.glyphSprites) {
      const t = transforms[index];
      if (!t) {
        changed = placeSprite(sprite, [0, 0, baseX, baseY, 1, 1, 0, 0, 0, 1], true) || changed;
        continue;
      }
      const { box } = layout.glyphs[index]!;
      const [ox, oy] = t.origin ?? [0.5, 0.5];
      const px = box.x + ox * box.width;
      const py = box.y + oy * box.height;
      const scale = t.scale ?? 1;
      const placement: SpritePlacement = [
        px - baseX,
        py - baseY,
        px + (t.x ?? 0),
        py + (t.y ?? 0),
        scale * (t.scaleX ?? 1),
        scale * (t.scaleY ?? 1),
        (t.rotation ?? 0) * DEG,
        (t.skewX ?? 0) * DEG,
        (t.skewY ?? 0) * DEG,
        t.opacity ?? 1,
      ];
      changed = placeSprite(sprite, placement, t.visible ?? true) || changed;
    }
    if (changed) this._revision++;
    this.transformed = !!fn;
  }

  /**
   * Destroys the node and its children and releases its glyph bitmaps. Glyph textures are shared with other nodes, so
   * `options` can't destroy them, and filters passed in props are left alone.
   */
  override destroy(_options?: DestroyOptions): void {
    for (const child of this.groups()) destroyFilters(child);
    this.textures.clear();
    super.destroy({ children: true });
  }
}

type SpritePlacement = [
  pivotX: number,
  pivotY: number,
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotation: number,
  skewX: number,
  skewY: number,
  alpha: number,
];

/** Applies a glyph transform to its sprite. Returns whether anything changed. */
function placeSprite(sprite: Sprite, placement: SpritePlacement, visible: boolean): boolean {
  const [pivotX, pivotY, x, y, scaleX, scaleY, rotation, skewX, skewY, alpha] = placement;
  const changed =
    sprite.pivot.x !== pivotX ||
    sprite.pivot.y !== pivotY ||
    sprite.position.x !== x ||
    sprite.position.y !== y ||
    sprite.scale.x !== scaleX ||
    sprite.scale.y !== scaleY ||
    sprite.rotation !== rotation ||
    sprite.skew.x !== skewX ||
    sprite.skew.y !== skewY ||
    sprite.alpha !== alpha ||
    sprite.visible !== visible;
  if (!changed) return false;
  sprite.pivot.set(pivotX, pivotY);
  sprite.position.set(x, y);
  sprite.scale.set(scaleX, scaleY);
  sprite.rotation = rotation;
  sprite.skew.set(skewX, skewY);
  sprite.alpha = alpha;
  sprite.visible = visible;
  return true;
}

function snap(value: number): [pixel: number, fraction: number] {
  let pixel = Math.floor(value);
  let fraction = Math.round((value - pixel) * SUBPIXEL_STEPS) / SUBPIXEL_STEPS;
  if (fraction >= 1) {
    pixel += 1;
    fraction = 0;
  }
  return [pixel, fraction];
}

function roundBox(box: { x: number; y: number; width: number; height: number }) {
  const round = (value: number) => Math.round(value * 100) / 100;
  return [round(box.x), round(box.y), round(box.width), round(box.height)];
}

/** Filters created here are owned by the node; user filters are left alone. */
const ownedFilters = new WeakSet<Filter>();

function createEffectContainer(effects: Layer, label: string): Container {
  const container = new Container({ label });
  const [dx, dy] = effects.offset ?? [0, 0];
  container.position.set(dx, dy);

  const filters: Filter[] = [];
  if (effects.blur && effects.blur > 0) {
    // BlurFilter strength is in local units, so the blur looks the same at any resolution.
    const quality = effects.blurQuality ?? 4;
    const blur = new BlurFilter({ strength: effects.blur, quality, resolution: "inherit" });
    blur.padding = blurPadding(effects.blur, quality);
    ownedFilters.add(blur);
    filters.push(blur);
  }
  if (effects.filters) filters.push(...effects.filters);
  // Always isolate the group so glyph sprites merge with `max` blending before being composited.
  const alpha = new AlphaFilter({ alpha: effects.opacity ?? 1, resolution: "inherit" });
  alpha.blendMode = effects.blendMode ?? "normal";
  ownedFilters.add(alpha);
  filters.push(alpha);
  container.filters = filters;
  return container;
}

function destroyFilters(container: Container): void {
  for (const filter of container.filters ?? []) {
    if (ownedFilters.has(filter)) filter.destroy();
  }
  container.filters = null;
}

/**
 * The `GlyphContext` of every glyph, as `glyphTransform` receives them. Use it with `layoutText()` to plan animation
 * timing (e.g. the total duration from `visibleCount`) before creating a node.
 */
export function createGlyphContexts(layout: Layout): GlyphContext[] {
  const visibleCount = layout.glyphs.filter((glyph) => !glyph.isWhitespace).length;
  let visibleIndex = 0;
  return layout.glyphs.map((glyph) => {
    const line = layout.lines[glyph.lineIndex]!;
    return {
      index: glyph.index,
      count: layout.glyphs.length,
      visibleIndex: glyph.isWhitespace ? -1 : visibleIndex++,
      visibleCount,
      lineIndex: glyph.lineIndex,
      lineCount: layout.lines.length,
      indexInLine: glyph.indexInLine,
      lineLength: line.end - line.start,
      text: glyph.text,
      runIndex: glyph.runIndex,
      tags: layout.runs[glyph.runIndex]!.tags,
      isWhitespace: glyph.isWhitespace,
      ...glyph.box,
    };
  });
}
