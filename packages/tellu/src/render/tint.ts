import { Color } from "pixi.js";
import type { ColorValue } from "../style/types";

/** No tint. */
export const WHITE = 0xffffff;

const parsed = new Map<string, number>();

/** A color as `0xRRGGBB`, its alpha dropped. Strings are parsed once, since tints are read on every frame. */
export function tintOf(color: ColorValue | undefined): number {
  if (color === undefined) return WHITE;
  if (typeof color === "number") return color & 0xffffff;
  let value = parsed.get(color);
  if (value === undefined) {
    value = new Color(color).toNumber();
    if (parsed.size >= 256) parsed.delete(parsed.keys().next().value!);
    parsed.set(color, value);
  }
  return value;
}

/** Two tints applied one after the other: their channels multiplied. */
export function multiplyTints(a: number, b: number): number {
  if (a === WHITE) return b;
  if (b === WHITE) return a;
  const channel = (shift: number) => Math.round((((a >> shift) & 0xff) * ((b >> shift) & 0xff)) / 255) << shift;
  return channel(16) | channel(8) | channel(0);
}

/** The tint `t` of the way from `a` to `b`, channel by channel. */
export function mixTints(a: number, b: number, t: number): number {
  if (a === b) return a;
  const channel = (shift: number) => {
    const from = (a >> shift) & 0xff;
    return Math.round(from + (((b >> shift) & 0xff) - from) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}
