import type { Box, Warp, WarpStyle } from "../style/types";

/** A warp of the plane, in layout px: where each point goes, and back. */
export interface WarpMapping {
  forward(x: number, y: number): [x: number, y: number];
  /**
   * The point that `forward` maps to `(x, y)`, found by Newton's method from `guess` (default: the nearest point of a
   * grid over the box), or `null` when there is none near the box, e.g. far outside the warped area.
   */
  inverse(x: number, y: number, guess?: readonly [number, number]): [x: number, y: number] | null;
}

/**
 * A style's displacement in centered, normalized coordinates: `x` and `y` run from `-1` to `1` across the warp box
 * (`y` down), `a` and `c` are its half width and half height in px, and the result is the warped point in px from the
 * box's center.
 */
type StyleFunction = (x: number, y: number, bend: number, a: number, c: number) => [number, number];

const STYLES: Record<WarpStyle, StyleFunction> = {
  // The box bent into a ring sector whose middle line keeps its length: half a circle at bend 1. The sweep is limited
  // so the inner edge stays outside the circle's center, where the ring would fold over itself.
  arc: (x, y, bend, a, c) => {
    const sweep = Math.sign(bend) * Math.min(Math.abs(bend) * Math.PI, (2 * a) / (1.25 * c));
    if (Math.abs(sweep) < 1e-9) return [x * a, y * c];
    const radius = (2 * a) / sweep;
    const angle = (x * sweep) / 2;
    const rho = radius - y * c;
    return [rho * Math.sin(angle), radius - rho * Math.cos(angle)];
  },
  // Only the bottom edge bows (down for a positive bend); the top stays straight.
  "arc-lower": (x, y, bend, a, c) => [x * a, y * c + ((y + 1) / 2) * bend * c * (1 - x * x)],
  // Only the top edge bows (up for a positive bend); the bottom stays straight.
  "arc-upper": (x, y, bend, a, c) => [x * a, y * c - ((1 - y) / 2) * bend * c * (1 - x * x)],
  // The whole box lifted along a curve, keeping its height: an arched bridge.
  arch: (x, y, bend, a, c) => [x * a, y * c - bend * 2 * c * (1 - x * x)],
  // Taller in the middle (or pinched, for a negative bend), both edges bowing out.
  bulge: (x, y, bend, a, c) => [x * a, y * c * (1 + pinch(bend) * (1 - x * x))],
  // One wave across the width, both edges moving together.
  flag: (x, y, bend, a, c) => [x * a, y * c + bend * c * Math.sin(Math.PI * x)],
  // Two waves across the width.
  wave: (x, y, bend, a, c) => [x * a, y * c + bend * c * Math.sin(2 * Math.PI * x)],
  // Rising from left to right along an S curve.
  rise: (x, y, bend, a, c) => [x * a, y * c - bend * 2 * c * Math.sin((Math.PI / 2) * x)],
  // Magnified around the center like a lens, the same in every direction (shrunk, for a negative bend), fading out
  // toward the corners: glyphs in the middle grow without changing shape.
  fisheye: (x, y, bend, a, c) => {
    const px = x * a;
    const py = y * c;
    const r2 = (px * px + py * py) / (a * a + c * c);
    const k = r2 < 1 ? 1 + pinch(bend) * (1 - r2) * (1 - r2) : 1;
    return [px * k, py * k];
  },
  // Swollen in both directions, most in the middle (shrunk, for a negative bend).
  inflate: (x, y, bend, a, c) => {
    // At most a third: more would make the edges fold back at their midpoints.
    const k = 1 + (pinch(bend) / 3) * (1 - x * x) * (1 - y * y);
    return [x * a * k, y * c * k];
  },
  // Pinched toward the vertical middle line at mid-height (stretched for a negative bend). The pinch is measured
  // against the height, so the ends of a long line move in no more than they are tall, instead of shearing.
  squeeze: (x, y, bend, a, c) => [x * a - x * Math.min(a, 2 * c) * (bend / 2) * (1 - y * y), y * c],
  // Turned around the center, a quarter turn at the center at bend 1, less toward the corners. Each circle around the
  // center turns as a whole, so the twist never folds.
  twist: (x, y, bend, a, c) => {
    const px = x * a;
    const py = y * c;
    const r = Math.min(1, Math.hypot(px, py) / Math.hypot(a, c));
    const angle = bend * (Math.PI / 2) * (1 - r) * (1 - r);
    return [px * Math.cos(angle) - py * Math.sin(angle), px * Math.sin(angle) + py * Math.cos(angle)];
  },
};

/** A negative bend that shrinks toward nothing stops short of it, so the warp never collapses a line to a point. */
function pinch(bend: number): number {
  return bend < 0 ? bend * 0.9 : bend;
}

/** The warp styles. */
export const WARP_STYLES = Object.keys(STYLES) as WarpStyle[];

/** Bernstein basis of degree 3 at `t`. */
function bernstein(t: number): [number, number, number, number] {
  const u = 1 - t;
  return [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
}

function isIdentity(warp: Warp): boolean {
  if ("envelope" in warp) {
    return warp.envelope.every(([u, v], index) => u === (index % 4) / 3 && v === Math.floor(index / 4) / 3);
  }
  return (warp.bend ?? 0.5) === 0 && !warp.horizontalDistortion && !warp.verticalDistortion;
}

/**
 * The mapping of a warp over `box` (the text's content, in layout px), or `null` when it leaves everything in place.
 * Points outside the box are warped by the same formulas.
 */
export function warpMapping(warp: Warp, box: Box): WarpMapping | null {
  if (isIdentity(warp)) return null;
  const width = Math.max(1, box.width);
  const height = Math.max(1, box.height);
  let forward: (x: number, y: number) => [number, number];

  if ("envelope" in warp) {
    if (warp.envelope.length !== 16) throw new Error("tellu: a warp envelope needs 16 points (4 rows of 4)");
    const points = warp.envelope.map(([u, v]) => [box.x + u * width, box.y + v * height] as const);
    forward = (x, y) => {
      const bu = bernstein((x - box.x) / width);
      const bv = bernstein((y - box.y) / height);
      let px = 0;
      let py = 0;
      for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
          const weight = bu[column]! * bv[row]!;
          const point = points[row * 4 + column]!;
          px += weight * point[0];
          py += weight * point[1];
        }
      }
      return [px, py];
    };
  } else {
    const style = STYLES[warp.style];
    if (!style) throw new Error(`tellu: unknown warp style "${warp.style}"`);
    const bend = Math.max(-1, Math.min(1, warp.bend ?? 0.5));
    const distortX = Math.max(-1, Math.min(1, warp.horizontalDistortion ?? 0));
    const distortY = Math.max(-1, Math.min(1, warp.verticalDistortion ?? 0));
    const vertical = warp.direction === "vertical";
    const cx = box.x + width / 2;
    const cy = box.y + height / 2;
    const a = width / 2;
    const c = height / 2;
    forward = (px, py) => {
      const x = (px - cx) / a;
      const y = (py - cy) / c;
      // A vertical warp is the horizontal one with the axes swapped.
      let [dx, dy] = vertical ? swap(style(y, x, bend, c, a)) : style(x, y, bend, a, c);
      // Distortions scale one side up and the other down, like a perspective: horizontal distortion makes the left
      // side taller for a positive value, vertical distortion makes the top wider.
      dy *= 1 + (distortX * -x) / 2;
      dx *= 1 + (distortY * -y) / 2;
      return [cx + dx, cy + dy];
    };
  }

  const scale = Math.max(width, height);
  // Starting points for inverses without a guess: a grid over the box, and where it maps.
  let grid: { from: [number, number]; to: [number, number] }[] | undefined;
  /** How far a point lies outside the box, in box sizes; `0` inside. */
  const outside = (u: number, v: number) =>
    Math.max(box.x - u, u - box.x - width, 0) / width + Math.max(box.y - v, v - box.y - height, 0) / height;
  /** The grid point inside the box that maps nearest to `(x, y)`. */
  const nearest = (x: number, y: number): [number, number] => {
    grid ??= Array.from({ length: 25 * 25 }, (_, i) => {
      const from: [number, number] = [box.x + ((i % 25) / 24) * width, box.y + (Math.floor(i / 25) / 24) * height];
      return { from, to: forward(...from) };
    });
    let best = grid[0]!;
    let distance = Infinity;
    for (const point of grid) {
      const d = (point.to[0] - x) ** 2 + (point.to[1] - y) ** 2;
      if (d < distance) {
        distance = d;
        best = point;
      }
    }
    return best.from;
  };
  // Outside the box, a warp's extrapolation can fold (an envelope's cubic does), so a point there can have several
  // solutions, and a seed from a neighbouring point can lead to a far one. Inside the box the solution is unique.
  const solve = (x: number, y: number, start: readonly [number, number]): [number, number] | null => {
    let [u, v] = start;
    const step = scale * 1e-5;
    for (let iteration = 0; iteration < 32; iteration++) {
      const [fx, fy] = forward(u, v);
      const ex = fx - x;
      const ey = fy - y;
      if (Math.abs(ex) < 1e-4 && Math.abs(ey) < 1e-4) return [u, v];
      const [ax, ay] = forward(u + step, v);
      const [bx, by] = forward(u - step, v);
      const [cx2, cy2] = forward(u, v + step);
      const [dx2, dy2] = forward(u, v - step);
      const j11 = (ax - bx) / (2 * step);
      const j21 = (ay - by) / (2 * step);
      const j12 = (cx2 - dx2) / (2 * step);
      const j22 = (cy2 - dy2) / (2 * step);
      const det = j11 * j22 - j12 * j21;
      if (!(Math.abs(det) > 1e-12)) return null;
      let du = (j22 * ex - j12 * ey) / det;
      let dv = (-j21 * ex + j11 * ey) / det;
      // Damped steps keep Newton from jumping across folds of strong warps.
      const length = Math.hypot(du, dv);
      const limit = scale / 4;
      if (length > limit) {
        du *= limit / length;
        dv *= limit / length;
      }
      u -= du;
      v -= dv;
      if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    }
    return null;
  };
  return {
    forward,
    inverse(x, y, guess) {
      const seeded = guess ? solve(x, y, guess) : null;
      if (seeded && outside(...seeded) === 0) return seeded;
      // Otherwise the solution nearest the box, also starting from inside it; none farther than half the box.
      const fresh = solve(x, y, nearest(x, y));
      let best: [number, number] | null = null;
      for (const candidate of [fresh, seeded]) {
        if (candidate && outside(...candidate) <= 0.5 && (!best || outside(...candidate) < outside(...best))) {
          best = candidate;
        }
      }
      return best;
    },
  };
}

function swap([x, y]: [number, number]): [number, number] {
  return [y, x];
}

/**
 * Bounds of a box after a warp, from a grid of points over it: inner points can move past the edges (a twist turns
 * the middle of a wide box up and down).
 */
export function warpedBounds(mapping: WarpMapping, box: Box, steps = 16): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const [x, y] = mapping.forward(box.x + (i / steps) * box.width, box.y + (j / steps) * box.height);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
