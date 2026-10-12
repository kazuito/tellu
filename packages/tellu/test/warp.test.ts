import { describe, expect, test } from "bun:test";
import { WARP_STYLES, warpedBounds, warpMapping } from "../src/render/warp";
import type { Warp } from "../src/style/types";

const box = { x: 100, y: 50, width: 400, height: 80 };
const identityEnvelope = Array.from({ length: 16 }, (_, i) => [(i % 4) / 3, Math.floor(i / 4) / 3] as const);

describe("warpMapping", () => {
  test("no warp at bend 0 or with the identity envelope", () => {
    expect(warpMapping({ style: "arc", bend: 0 }, box)).toBeNull();
    expect(warpMapping({ envelope: identityEnvelope }, box)).toBeNull();
    expect(warpMapping({ style: "arc", bend: 0, horizontalDistortion: 0.2 }, box)).not.toBeNull();
  });

  test("bend defaults to 0.5", () => {
    const a = warpMapping({ style: "flag" }, box)!;
    const b = warpMapping({ style: "flag", bend: 0.5 }, box)!;
    expect(a.forward(200, 70)).toEqual(b.forward(200, 70));
  });

  test("every style maps back to where it came from", () => {
    for (const style of WARP_STYLES) {
      for (const bend of [-1, -0.5, 0.3, 1]) {
        for (const direction of ["horizontal", "vertical"] as const) {
          const mapping = warpMapping({ style, bend, direction, horizontalDistortion: 0.2 }, box)!;
          for (const [x, y] of [
            [100, 50],
            [300, 90],
            [480, 120],
            [150, 60],
            [350, 128],
          ] as const) {
            const [wx, wy] = mapping.forward(x, y);
            const back = mapping.inverse(wx, wy);
            expect(back, `${style} ${bend} ${direction} (${x}, ${y})`).not.toBeNull();
            expect(back![0]).toBeCloseTo(x, 2);
            expect(back![1]).toBeCloseTo(y, 2);
          }
        }
      }
    }
  });

  test("an envelope is a Bézier patch through its corners", () => {
    const envelope = identityEnvelope.map(([u, v]) => [u, v + (u > 0 && u < 1 ? -0.5 : 0)] as const);
    const mapping = warpMapping({ envelope }, box)!;
    expect(mapping.forward(100, 50)).toEqual([100, 50]);
    expect(mapping.forward(500, 130)).toEqual([500, 130]);
    // The middle control points pull the middle up by 3/4 of their shift.
    const [, y] = mapping.forward(300, 90);
    expect(y).toBeCloseTo(90 - 0.75 * 0.5 * 80);
    const [bx, by] = mapping.inverse(...mapping.forward(250, 70))!;
    expect(bx).toBeCloseTo(250, 3);
    expect(by).toBeCloseTo(70, 3);
  });

  test("solving from a neighbour's solution doesn't stray to a far branch", () => {
    // The left corners move toward the middle, so above the top edge the envelope's cubic folds back.
    const t = 1 / 3;
    const u = 2 / 3;
    const envelope = [
      [0, 0.3],
      [t, 0],
      [u, 0],
      [1, 0.3],
      [0, t],
      [t, t],
      [u, t],
      [1, t],
      [0, u],
      [t, u],
      [u, u],
      [1, u],
      [0, 0.7],
      [t, 1],
      [u, 1],
      [1, 0.7],
    ] as const;
    const square = { x: 0, y: 0, width: 480, height: 120 };
    const mapping = warpMapping({ envelope }, square)!;
    for (let y = 18; y < 104; y += 2) {
      let guess: [number, number] | null = null;
      for (let x = 13; x < 103; x += 2) {
        const chained = mapping.inverse(x, y, guess ?? undefined);
        guess = chained;
        const fresh = mapping.inverse(x, y);
        expect(chained === null).toBe(fresh === null);
        if (chained && fresh) expect(Math.hypot(chained[0] - fresh[0], chained[1] - fresh[1])).toBeLessThan(0.01);
      }
    }
  });

  test("an envelope needs 16 points", () => {
    expect(() => warpMapping({ envelope: identityEnvelope.slice(1) }, box)).toThrow();
  });

  test("unknown styles throw", () => {
    expect(() => warpMapping({ style: "nope" } as unknown as Warp, box)).toThrow();
  });
});

describe("no warp folds over itself", () => {
  test("the Jacobian stays positive over the box, for any bend and shape of box", () => {
    const h = 1e-3;
    for (const shape of [box, { x: 0, y: 0, width: 80, height: 400 }, { x: 0, y: 0, width: 100, height: 100 }]) {
      for (const style of WARP_STYLES) {
        for (const bend of [-1, -0.5, 0.5, 1]) {
          for (const direction of ["horizontal", "vertical"] as const) {
            const mapping = warpMapping({ style, bend, direction }, shape)!;
            let smallest = Infinity;
            for (let i = 0; i <= 20; i++) {
              for (let j = 0; j <= 20; j++) {
                const x = shape.x + (i / 20) * shape.width;
                const y = shape.y + (j / 20) * shape.height;
                const [ax, ay] = mapping.forward(x + h, y);
                const [bx, by] = mapping.forward(x - h, y);
                const [cx, cy] = mapping.forward(x, y + h);
                const [dx, dy] = mapping.forward(x, y - h);
                smallest = Math.min(smallest, ((ax - bx) * (cy - dy) - (cx - dx) * (ay - by)) / (4 * h * h));
              }
            }
            expect(smallest, `${style} ${bend} ${direction} ${shape.width}×${shape.height}`).toBeGreaterThan(1e-3);
          }
        }
      }
    }
  });
});

describe("warp styles", () => {
  const at = (warp: Warp, x: number, y: number) => warpMapping(warp, box)!.forward(x, y);
  // Box center (300, 90), half size 200 × 40.

  test("arc keeps the center and lifts the ends, keeping the middle line's length", () => {
    expect(at({ style: "arc", bend: 0.5 }, 300, 90)).toEqual([300, 90]);
    const [, endY] = at({ style: "arc", bend: 0.5 }, 500, 90);
    expect(endY).toBeGreaterThan(90);
    // Half a circle at bend 1: the ends of the middle line sit at the circle's center height.
    const [x, y] = at({ style: "arc", bend: 1 }, 500, 90);
    const radius = 400 / Math.PI;
    expect(x).toBeCloseTo(300 + radius);
    expect(y).toBeCloseTo(90 + radius);
  });

  test("arch lifts every row in the middle by the same amount", () => {
    const [, top] = at({ style: "arch", bend: 0.5 }, 300, 50);
    const [, bottom] = at({ style: "arch", bend: 0.5 }, 300, 130);
    expect(90 - 50 - (90 - top)).toBeCloseTo(-40);
    expect(bottom - top).toBeCloseTo(80);
  });

  test("bulge grows the middle, both ways", () => {
    expect(at({ style: "bulge", bend: 0.5 }, 300, 50)[1]).toBeCloseTo(30);
    expect(at({ style: "bulge", bend: 0.5 }, 300, 130)[1]).toBeCloseTo(150);
    expect(at({ style: "bulge", bend: 0.5 }, 100, 50)[1]).toBeCloseTo(50);
  });

  test("arc-lower and arc-upper move one edge", () => {
    expect(at({ style: "arc-lower", bend: 1 }, 300, 50)[1]).toBeCloseTo(50);
    expect(at({ style: "arc-lower", bend: 1 }, 300, 130)[1]).toBeCloseTo(170);
    expect(at({ style: "arc-upper", bend: 1 }, 300, 130)[1]).toBeCloseTo(130);
    expect(at({ style: "arc-upper", bend: 1 }, 300, 50)[1]).toBeCloseTo(10);
  });

  test("flag and wave move both edges together", () => {
    const [, top] = at({ style: "flag", bend: 1 }, 400, 50);
    const [, bottom] = at({ style: "flag", bend: 1 }, 400, 130);
    expect(bottom - top).toBeCloseTo(80);
    expect(top).toBeCloseTo(90);
  });

  test("a vertical warp bends along the height", () => {
    const [x, y] = at({ style: "bulge", bend: 0.5, direction: "vertical" }, 100, 90);
    expect(y).toBeCloseTo(90);
    expect(x).toBeCloseTo(0);
  });

  test("distortions scale the sides", () => {
    // Left side taller.
    const [, leftTop] = at({ style: "flag", bend: 0, horizontalDistortion: 1 }, 100, 50);
    const [, rightTop] = at({ style: "flag", bend: 0, horizontalDistortion: 1 }, 500, 50);
    expect(leftTop).toBeCloseTo(30);
    expect(rightTop).toBeCloseTo(70);
    // Top wider.
    const [topLeft] = at({ style: "flag", bend: 0, verticalDistortion: 1 }, 100, 50);
    expect(topLeft).toBeCloseTo(0);
  });
});

describe("warpedBounds", () => {
  test("includes points that move past the edges", () => {
    const mapping = warpMapping({ style: "twist", bend: 1 }, box)!;
    const bounds = warpedBounds(mapping, box);
    expect(bounds.y).toBeLessThan(box.y);
  });
});
