import type { LineDecoration } from "../style/types";

/** The path commands line shapes use; `Path2D` and `CanvasRenderingContext2D` have them. */
export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  closePath(): void;
}

/**
 * Traces the shape of a line decoration filling a band `width` × `height` px from the origin, made of strokes
 * `thickness` px thick. Lines run along the band's long axis: horizontally, or vertically when `vertical`.
 */
export function traceLine(
  sink: PathSink,
  decoration: LineDecoration,
  width: number,
  height: number,
  thickness: number,
  vertical: boolean,
): void {
  const length = vertical ? height : width;
  const t = thickness;
  if (!(length > 0) || !(t > 0)) return;
  // `u` runs along the line, `v` across it from the band's over side: its top, or its right in vertical text.
  const point = (u: number, v: number): [number, number] => (vertical ? [width - v, u] : [u, v]);
  const polygon = (points: readonly (readonly [number, number])[]) => {
    points.forEach(([u, v], i) => {
      const [x, y] = point(u, v);
      if (i === 0) sink.moveTo(x, y);
      else sink.lineTo(x, y);
    });
    sink.closePath();
  };
  const bar = (from: number, to: number, v0: number, v1: number) =>
    polygon([
      [from, v0],
      [to, v0],
      [to, v1],
      [from, v1],
    ]);

  switch (decoration.style ?? "solid") {
    case "solid":
      bar(0, length, 0, t);
      return;
    case "double":
      bar(0, length, 0, t);
      bar(0, length, 2 * t, 3 * t);
      return;
    case "dotted": {
      const count = Math.max(1, Math.floor((length - t) / (2 * t)) + 1);
      const spacing = count > 1 ? (length - t) / (count - 1) : 0;
      for (let i = 0; i < count; i++) {
        // The last dot ends exactly at the end of the line.
        const u = count === 1 ? length / 2 : i === count - 1 ? length - t / 2 : t / 2 + i * spacing;
        const [x, y] = point(u, t / 2);
        sink.moveTo(x + t / 2, y);
        sink.arc(x, y, t / 2, 0, Math.PI * 2);
        sink.closePath();
      }
      return;
    }
    case "dashed": {
      const gap = 2 * t;
      const count = Math.max(1, Math.round((length + gap) / (3 * t + gap)));
      const dash = (length - (count - 1) * gap) / count;
      for (let i = 0; i < count; i++) bar(i * (dash + gap), i === count - 1 ? length : i * (dash + gap) + dash, 0, t);
      return;
    }
    case "wavy": {
      // A sine wave of amplitude t, stroked t thick, fills a band 3t thick. A wavelength of 6t keeps the curvature
      // radius at the crests above t / 2, so the inner edge of the stroke never folds over.
      const wavelength = 6 * t;
      const k = (2 * Math.PI) / wavelength;
      const steps = Math.max(2, Math.ceil((length / wavelength) * 24));
      const upper: [number, number][] = [];
      const lower: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const u = (length * i) / steps;
        const v = 1.5 * t + t * Math.sin(k * u);
        const slope = t * k * Math.cos(k * u);
        const norm = Math.hypot(1, slope);
        // Unit normal of the centerline, scaled to half the stroke.
        const du = (-slope / norm) * (t / 2);
        const dv = (1 / norm) * (t / 2);
        // Clamped along the line so the ends stay square to the band.
        upper.push([Math.min(length, Math.max(0, u + du)), v + dv]);
        lower.push([Math.min(length, Math.max(0, u - du)), v - dv]);
      }
      polygon([...upper, ...lower.reverse()]);
      return;
    }
  }
}
