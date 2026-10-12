import { describe, expect, test } from "bun:test";
import { arcSampler, type PathPoint, svgPathSampler } from "../src/layout/path";

const DEG = Math.PI / 180;
const near = (point: PathPoint, x: number, y: number, angleDegrees: number, digits = 6) => {
  expect(point.x).toBeCloseTo(x, digits);
  expect(point.y).toBeCloseTo(y, digits);
  const delta = ((((point.angle / DEG - angleDegrees) % 360) + 540) % 360) - 180;
  expect(Math.abs(delta)).toBeLessThan(10 ** -Math.min(digits, 3));
};

describe("arcSampler", () => {
  test("a clockwise circle starts at the bottom when centered on the top, and runs left to right over it", () => {
    const arc = arcSampler({ radius: 100 });
    expect(arc.length).toBeCloseTo(2 * Math.PI * 100);
    expect(arc.closed).toBe(true);
    near(arc.pointAt(arc.length / 2), 0, -100, 0);
    near(arc.pointAt(0), 0, 100, 180);
  });

  test("a sweep centered at the top", () => {
    const arc = arcSampler({ radius: 100, sweep: 90 });
    expect(arc.length).toBeCloseTo((Math.PI / 2) * 100);
    expect(arc.closed).toBe(false);
    near(arc.pointAt(0), -100 * Math.SQRT1_2, -100 * Math.SQRT1_2, -45);
    near(arc.pointAt(arc.length), 100 * Math.SQRT1_2, -100 * Math.SQRT1_2, 45);
  });

  test("counterclockwise at the bottom reads left to right", () => {
    const arc = arcSampler({ radius: 50, center: 180, sweep: 90, direction: "counterclockwise" });
    near(arc.pointAt(arc.length / 2), 0, 50, 0);
    expect(arc.pointAt(0).x).toBeLessThan(arc.pointAt(arc.length).x);
  });

  test("an open arc continues straight past its ends", () => {
    const arc = arcSampler({ radius: 100, sweep: 90 });
    const end = arc.pointAt(arc.length);
    const past = arc.pointAt(arc.length + 10);
    near(past, end.x + 10 * Math.cos(end.angle), end.y + 10 * Math.sin(end.angle), end.angle / DEG);
  });
});

describe("svgPathSampler", () => {
  test("lines, with corners", () => {
    const path = svgPathSampler("M0 0 L100 0 L100 50");
    expect(path.length).toBe(150);
    near(path.pointAt(50), 50, 0, 0);
    near(path.pointAt(125), 100, 25, 90);
    near(path.pointAt(-10), -10, 0, 0);
    near(path.pointAt(160), 100, 60, 90);
  });

  test("relative commands, H and V, and implicit line-tos", () => {
    const path = svgPathSampler("m10 10 20 0 v10 h-20 V 10");
    expect(path.length).toBe(60);
    near(path.pointAt(25), 30, 15, 90);
    near(path.pointAt(60), 10, 10, -90);
  });

  test("Z closes the path, which then wraps around", () => {
    const path = svgPathSampler("M0 0 H10 V10 H0 Z");
    expect(path.closed).toBe(true);
    expect(path.length).toBe(40);
    near(path.pointAt(45), 5, 0, 0);
    near(path.pointAt(-5), 0, 5, -90);
  });

  test("cubic curves follow their tangents", () => {
    // A quarter circle approximated by a cubic: from (100, 0) to (0, 100) around the origin.
    const k = 0.5522847498 * 100;
    const path = svgPathSampler(`M100 0 C100 ${k} ${k} 100 0 100`);
    expect(path.length).toBeCloseTo((Math.PI / 2) * 100, 0);
    const middle = path.pointAt(path.length / 2);
    expect(Math.hypot(middle.x, middle.y)).toBeCloseTo(100, 0);
    expect(middle.angle / DEG).toBeCloseTo(135, 0);
    near(path.pointAt(0), 100, 0, 90, 3);
  });

  test("S reflects the previous control point", () => {
    const smooth = svgPathSampler("M0 0 C0 50 50 50 50 0 S100 -50 100 0");
    const explicit = svgPathSampler("M0 0 C0 50 50 50 50 0 C50 -50 100 -50 100 0");
    expect(smooth.length).toBeCloseTo(explicit.length, 6);
    near(smooth.pointAt(100), explicit.pointAt(100).x, explicit.pointAt(100).y, explicit.pointAt(100).angle / DEG);
  });

  test("quadratic curves, and T", () => {
    const path = svgPathSampler("M0 0 Q50 50 100 0 T200 0");
    expect(path.pointAt(path.length / 4).y).toBeGreaterThan(0);
    expect(path.pointAt((path.length * 3) / 4).y).toBeLessThan(0);
    near(path.pointAt(path.length / 2), 100, 0, -45, 1);
  });

  test("elliptical arcs, with flags written without separators", () => {
    // A half circle of radius 50 over the top, from (0, 0) to (100, 0).
    const path = svgPathSampler("M0 0 A50 50 0 01100 0");
    expect(path.length).toBeCloseTo(Math.PI * 50, 0);
    near(path.pointAt(path.length / 2), 50, -50, 0, 1);
    // The other sweep goes under.
    expect(svgPathSampler("M0 0 A50 50 0 0 0 100 0").pointAt(Math.PI * 25).y).toBeCloseTo(50, 0);
  });

  test("radii too small to reach the end are scaled up", () => {
    const path = svgPathSampler("M0 0 A1 1 0 0 1 100 0");
    expect(path.length).toBeCloseTo(Math.PI * 50, 0);
  });

  test("only the first subpath is walked", () => {
    expect(svgPathSampler("M0 0 H10 M50 50 H100").length).toBe(10);
    expect(svgPathSampler("M5 5 M0 0 H10").length).toBe(10);
  });

  test("invalid data throws", () => {
    expect(() => svgPathSampler("0 0 L 10 10")).toThrow();
    expect(() => svgPathSampler("M0 0 L10")).toThrow();
    expect(() => svgPathSampler("M0 0 X10 10")).toThrow();
  });
});
