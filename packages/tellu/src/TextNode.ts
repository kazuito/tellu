import { AlphaFilter, BlurFilter, Container, type DestroyOptions, type Filter, Rectangle, Sprite } from "pixi.js";
import { type Layout, layoutText } from "./layout/layout";
import { fontSpecOf, fontToCss, getDefaultMeasurer, type Measurer } from "./layout/measure";
import { blurPadding } from "./render/blur";
import { planGroups } from "./render/groups";
import { paintKey, paintScope } from "./render/paint";
import { plateBoxes, rasterizePlate } from "./render/plate";
import { GlyphRasterizer, layerReach, layerShape } from "./render/rasterize";
import { ScopeBoxes } from "./render/scope";
import { TextureCache } from "./render/textureCache";
import type { GlyphContext, GlyphTransform, Layer, PlateStyle, TextNodeProps } from "./style/types";
import { stableKey } from "./utils/stableKey";

export interface TextNodeOptions {
  /** Text measurement backend. Default: Canvas 2D. */
  measurer?: Measurer;
  /** Pixel density of the generated glyph bitmaps. Default: `devicePixelRatio` or `1`. */
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
 * Styled text as a PixiJS container. Add it to any scene, or draw it with `TextRenderer`.
 * The local origin is the top-left of the layout box.
 */
export class TextNode extends Container {
  private _props: TextNodeProps;
  private _resolution: number;
  private _layout: Layout | undefined;
  private contexts: GlyphContext[] = [];
  private glyphSprites: GlyphSprite[] = [];
  private builtKey = "";
  private transformed = false;
  private readonly measurer: Measurer;
  private readonly rasterizer = new GlyphRasterizer();
  private readonly textures = new TextureCache();
  private readonly plateLayer = new Container({ label: "plate" });
  private readonly glyphLayer = new Container({ label: "glyphs" });

  constructor(props: TextNodeProps, options: TextNodeOptions = {}) {
    super({ label: "text" });
    this._props = props;
    this.measurer = options.measurer ?? getDefaultMeasurer();
    this._resolution = options.resolution ?? (typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    this.addChild(this.plateLayer, this.glyphLayer);
    this.refresh();
  }

  get props(): TextNodeProps {
    return this._props;
  }

  set props(props: TextNodeProps) {
    this._props = props;
    this.refresh();
  }

  /** Merges `props` into the current props. */
  update(props: Partial<TextNodeProps>): this {
    this._props = { ...this._props, ...props };
    this.refresh();
    return this;
  }

  get resolution(): number {
    return this._resolution;
  }

  set resolution(resolution: number) {
    this._resolution = resolution;
    this.refresh();
  }

  get layout(): Layout {
    return this._layout!;
  }

  /** The layout box, `(0, 0, width, height)`. */
  get layoutBounds(): Rectangle {
    return new Rectangle(0, 0, this.layout.width, this.layout.height);
  }

  /** Everything this node paints, including outlines, shadows, blur and glyph transforms, in local coordinates. */
  getInkBounds(): Rectangle {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const group of [...this.plateLayer.children, ...this.glyphLayer.children]) {
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

  /** Re-measures and redraws everything, e.g. after a web font finished loading. */
  invalidate(): void {
    if ("clear" in this.measurer && typeof this.measurer.clear === "function") this.measurer.clear();
    this.rasterizer.clear();
    this.textures.clear();
    this.builtKey = "";
    this.refresh();
  }

  /** Rebuilds what changed since the last call. Cheap when only `glyphTransform` output changes. */
  refresh(): void {
    const { glyphTransform: _, ...rest } = this._props;
    const key = stableKey([rest, this._resolution]);
    if (key !== this.builtKey) {
      this.build();
      this.builtKey = key;
      this.transformed = true;
    }
    this.applyGlyphTransforms();
  }

  private build(): void {
    const layout = layoutText(this._props, this.measurer);
    this._layout = layout;
    this.contexts = createGlyphContexts(layout);

    for (const child of [...this.glyphLayer.removeChildren(), ...this.plateLayer.removeChildren()]) {
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
          paintKey(layer.paint),
          paintScope(layer.paint) === null ? "" : stableKey(roundBox(paintBox)),
        ].join("\u0000");
        const cached = this.textures.get(key, res, () =>
          this.rasterizer.rasterize(shape, layer, paintBox, reach[index]!),
        );

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
    this.textures.end();
  }

  private buildPlate(layout: Layout, style: PlateStyle): void {
    const boxes = plateBoxes(layout, style);
    if (boxes.length === 0) return;
    const res = this._resolution;
    const key = `plate\u0000${stableKey([style, boxes, res])}`;
    let x = 0;
    let y = 0;
    const cached = this.textures.get(key, res, () => {
      const plate = rasterizePlate(style, boxes, res);
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

  private applyGlyphTransforms(): void {
    const fn = this._props.glyphTransform;
    if (!fn && !this.transformed) return;
    const layout = this.layout;
    const transforms: (GlyphTransform | null)[] = this.contexts.map((context) => fn?.(context) || null);

    for (const { sprite, glyph: index, baseX, baseY } of this.glyphSprites) {
      const t = transforms[index];
      if (!t) {
        sprite.pivot.set(0, 0);
        sprite.position.set(baseX, baseY);
        sprite.scale.set(1, 1);
        sprite.rotation = 0;
        sprite.skew.set(0, 0);
        sprite.alpha = 1;
        sprite.visible = true;
        continue;
      }
      const { box } = layout.glyphs[index]!;
      const [ox, oy] = t.origin ?? [0.5, 0.5];
      const px = box.x + ox * box.width;
      const py = box.y + oy * box.height;
      const scale = t.scale ?? 1;
      sprite.pivot.set(px - baseX, py - baseY);
      sprite.position.set(px + (t.x ?? 0), py + (t.y ?? 0));
      sprite.scale.set(scale * (t.scaleX ?? 1), scale * (t.scaleY ?? 1));
      sprite.rotation = (t.rotation ?? 0) * DEG;
      sprite.skew.set((t.skewX ?? 0) * DEG, (t.skewY ?? 0) * DEG);
      sprite.alpha = t.opacity ?? 1;
      sprite.visible = t.visible ?? true;
    }
    this.transformed = !!fn;
  }

  override destroy(options?: DestroyOptions): void {
    for (const child of [...this.glyphLayer.children, ...this.plateLayer.children]) destroyFilters(child);
    this.textures.clear();
    this.rasterizer.clear();
    super.destroy(typeof options === "boolean" ? options : { ...options, children: true });
  }
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
