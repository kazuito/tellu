import { CanvasSource, Texture } from "pixi.js";
import type { AnyCanvas } from "../canvas";
import { GlyphRasterizer } from "./rasterize";
import { type CacheEntry, SharedCache } from "./sharedCache";

export interface CachedTexture {
  texture: Texture;
  offsetX: number;
  offsetY: number;
}

/** Bytes of glyph bitmaps kept after no node shows them anymore. */
const IDLE_BUDGET = 64 * 1024 * 1024;

const textures = new SharedCache<CachedTexture>({
  budget: IDLE_BUDGET,
  sizeOf: ({ texture }) => texture.source.pixelWidth * texture.source.pixelHeight * 4,
  dispose: ({ texture }) => texture.destroy(true),
});

/** Glyph measurements and distance fields, shared by every node. */
export const rasterizer = new GlyphRasterizer();

let watchingFonts = false;

/** Drops every cached bitmap, e.g. after a web font finished loading. Nodes keep theirs until they rebuild. */
export function invalidateTextures(): void {
  textures.invalidate();
  rasterizer.clear();
}

/**
 * The textures one node holds, keyed by what was drawn into them. Textures are shared with every
 * other node; those not requested during a build are released after it.
 */
export class TextureSet {
  private held = new Map<string, CacheEntry<CachedTexture>>();
  private next: Map<string, CacheEntry<CachedTexture>> | null = null;

  begin(): void {
    if (!watchingFonts && typeof document !== "undefined" && document.fonts) {
      document.fonts.addEventListener("loadingdone", invalidateTextures);
      watchingFonts = true;
    }
    // A build that threw never reached `end()`.
    if (this.next) for (const entry of this.next.values()) textures.release(entry);
    this.next = new Map();
  }

  get(
    key: string,
    resolution: number,
    draw: () => { canvas: AnyCanvas; offsetX: number; offsetY: number },
  ): CachedTexture {
    const next = this.next;
    if (!next) throw new Error("tellu: TextureSet.get() called outside begin() / end()");
    let entry = next.get(key);
    if (!entry) {
      entry = textures.acquire(key, () => {
        const { canvas, offsetX, offsetY } = draw();
        const texture = new Texture({ source: new CanvasSource({ resource: canvas, resolution }) });
        return { texture, offsetX, offsetY };
      });
      next.set(key, entry);
    }
    return entry.value;
  }

  end(): void {
    if (!this.next) return;
    const previous = this.held;
    this.held = this.next;
    this.next = null;
    for (const entry of previous.values()) textures.release(entry);
  }

  clear(): void {
    for (const entry of this.held.values()) textures.release(entry);
    this.held.clear();
  }
}
