import { CanvasSource, Texture } from "pixi.js";
import type { AnyCanvas } from "../canvas";

export interface CachedTexture {
  texture: Texture;
  offsetX: number;
  offsetY: number;
}

interface Entry extends CachedTexture {
  used: boolean;
}

/** Textures keyed by what was drawn into them. Entries not requested during a build are released. */
export class TextureCache {
  private entries = new Map<string, Entry>();

  get size(): number {
    return this.entries.size;
  }

  begin(): void {
    for (const entry of this.entries.values()) entry.used = false;
  }

  get(
    key: string,
    resolution: number,
    draw: () => { canvas: AnyCanvas; offsetX: number; offsetY: number },
  ): CachedTexture {
    let entry = this.entries.get(key);
    if (!entry) {
      const { canvas, offsetX, offsetY } = draw();
      const texture = new Texture({ source: new CanvasSource({ resource: canvas, resolution }) });
      entry = { texture, offsetX, offsetY, used: true };
      this.entries.set(key, entry);
    }
    entry.used = true;
    return entry;
  }

  end(): void {
    for (const [key, entry] of this.entries) {
      if (entry.used) continue;
      entry.texture.destroy(true);
      this.entries.delete(key);
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) entry.texture.destroy(true);
    this.entries.clear();
  }
}
