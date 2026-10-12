import type { TextPathArc } from "../style/types";

/** A point on a path and the direction the path runs there. */
export interface PathPoint {
  x: number;
  y: number;
  /** Direction of travel in radians, clockwise from the +x axis (screen coordinates, y down). */
  angle: number;
}

/** A path that can be walked by arc length. */
export interface PathSampler {
  readonly length: number;
  readonly closed: boolean;
  /**
   * The point `distance` px along the path. Closed paths wrap around; open paths continue straight past their ends
   * along the end tangent.
   */
  pointAt(distance: number): PathPoint;
}

const DEG = Math.PI / 180;

/** An exact circular arc. */
export function arcSampler({ radius, center = 0, sweep = 360, direction = "clockwise" }: TextPathArc): PathSampler {
  const r = Math.abs(radius);
  const span = Math.min(360, Math.max(0, sweep)) * DEG;
  const sign = direction === "clockwise" ? 1 : -1;
  const start = center * DEG - (sign * span) / 2;
  const length = r * span;
  const closed = sweep >= 360;
  const at = (theta: number): PathPoint => ({
    x: r * Math.sin(theta),
    y: -r * Math.cos(theta),
    // Clockwise from the top, the tangent turns with theta; counterclockwise it points the other way.
    angle: sign > 0 ? theta : theta + Math.PI,
  });
  return {
    length,
    closed,
    pointAt(distance) {
      if (r === 0) return { x: 0, y: 0, angle: 0 };
      if (closed || (distance >= 0 && distance <= length)) return at(start + (sign * distance) / r);
      // Past an end of an open arc: straight on along the tangent.
      const end = distance < 0 ? 0 : length;
      const point = at(start + (sign * end) / r);
      const extra = distance - end;
      return {
        x: point.x + Math.cos(point.angle) * extra,
        y: point.y + Math.sin(point.angle) * extra,
        angle: point.angle,
      };
    },
  };
}

interface Sample {
  x: number;
  y: number;
  angle: number;
  /** Arc length from the start of the path. */
  distance: number;
}

/** Longest straight piece a curve is flattened into, in px. */
const FLATNESS = 1;

/**
 * Parses SVG path data (`M L H V C S Q T A Z`, absolute and relative) into a sampler. Only the first subpath is
 * walked: text runs along one continuous path. Curves are flattened into pieces at most 1px long, keeping their exact
 * tangents.
 */
export function svgPathSampler(d: string): PathSampler {
  const samples: Sample[] = [];
  let closed = false;
  const add = (x: number, y: number, angle: number) => {
    const last = samples.at(-1);
    const distance = last ? last.distance + Math.hypot(x - last.x, y - last.y) : 0;
    samples.push({ x, y, angle, distance });
  };
  /** A curve from its point function and derivative over `[0, 1]`, flattened by its estimated length. */
  const curve = (
    point: (t: number) => [number, number],
    derivative: (t: number) => [number, number],
    estimate: number,
  ) => {
    const steps = Math.max(4, Math.ceil(estimate / FLATNESS));
    for (let i = samples.length === 0 ? 0 : 1; i <= steps; i++) {
      const t = i / steps;
      const [x, y] = point(t);
      const [dx, dy] = derivative(t);
      add(x, y, dx === 0 && dy === 0 ? (samples.at(-1)?.angle ?? 0) : Math.atan2(dy, dx));
    }
  };
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    if (x0 === x1 && y0 === y1) return;
    const angle = Math.atan2(y1 - y0, x1 - x0);
    // A corner keeps both directions at the same point: the incoming one ends there, the outgoing one starts there.
    if (samples.length === 0) add(x0, y0, angle);
    else if (samples.at(-1)!.angle !== angle) add(x0, y0, angle);
    add(x1, y1, angle);
  };

  const tokens = tokenize(d);
  let i = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let control: [number, number] | null = null;
  let previous = "";
  let started = false;
  const number = () => {
    const token = tokens[i++];
    if (token === undefined || !/^[-+.\d]/.test(token)) throw new Error(`tellu: invalid path data "${d}"`);
    return Number(token);
  };
  const flag = () => {
    const token = tokens[i];
    if (token === undefined) throw new Error(`tellu: invalid path data "${d}"`);
    // Flags may be written without separators ("a1 1 0 01 4 4"): take one character.
    i++;
    if (token.length > 1) tokens.splice(i, 0, token.slice(1));
    if (token[0] !== "0" && token[0] !== "1") throw new Error(`tellu: invalid arc flag in path data "${d}"`);
    return token[0] === "1";
  };

  while (i < tokens.length) {
    const token = tokens[i]!;
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      i++;
    } else if (!command) {
      throw new Error(`tellu: path data must start with a command: "${d}"`);
    }
    const relative = command !== command.toUpperCase();
    const ox = relative ? x : 0;
    const oy = relative ? y : 0;
    const upper = command.toUpperCase();
    // A second subpath isn't walked; a move before anything was drawn just moves the start.
    if (started && upper === "M" && samples.length > 0) break;
    switch (upper) {
      case "M": {
        x = ox + number();
        y = oy + number();
        startX = x;
        startY = y;
        started = true;
        // Further pairs are line-tos.
        command = relative ? "l" : "L";
        control = null;
        break;
      }
      case "L": {
        const nx = ox + number();
        const ny = oy + number();
        line(x, y, nx, ny);
        [x, y] = [nx, ny];
        control = null;
        break;
      }
      case "H": {
        const nx = ox + number();
        line(x, y, nx, y);
        x = nx;
        control = null;
        break;
      }
      case "V": {
        const ny = oy + number();
        line(x, y, x, ny);
        y = ny;
        control = null;
        break;
      }
      case "C":
      case "S": {
        let c1: [number, number];
        if (upper === "C") c1 = [ox + number(), oy + number()];
        else c1 = control && /[CS]/i.test(previous) ? [2 * x - control[0], 2 * y - control[1]] : [x, y];
        const c2: [number, number] = [ox + number(), oy + number()];
        const end: [number, number] = [ox + number(), oy + number()];
        cubic([x, y], c1, c2, end, curve);
        control = c2;
        [x, y] = end;
        break;
      }
      case "Q":
      case "T": {
        let c: [number, number];
        if (upper === "Q") c = [ox + number(), oy + number()];
        else c = control && /[QT]/i.test(previous) ? [2 * x - control[0], 2 * y - control[1]] : [x, y];
        const end: [number, number] = [ox + number(), oy + number()];
        quadratic([x, y], c, end, curve);
        control = c;
        [x, y] = end;
        break;
      }
      case "A": {
        const rx = number();
        const ry = number();
        const rotation = number();
        const large = flag();
        const sweep = flag();
        const end: [number, number] = [ox + number(), oy + number()];
        arc([x, y], rx, ry, rotation, large, sweep, end, curve, line);
        [x, y] = end;
        control = null;
        break;
      }
      case "Z": {
        line(x, y, startX, startY);
        [x, y] = [startX, startY];
        closed = true;
        control = null;
        break;
      }
      default:
        throw new Error(`tellu: unknown path command "${command}" in "${d}"`);
    }
    previous = command;
    if (upper === "Z") {
      // Anything after a closing Z starts another subpath, which isn't walked.
      break;
    }
  }
  if (samples.length === 0) samples.push({ x, y, angle: 0, distance: 0 });
  return polylineSampler(samples, closed);
}

function tokenize(d: string): string[] {
  return d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

type Curve = (
  point: (t: number) => [number, number],
  derivative: (t: number) => [number, number],
  estimate: number,
) => void;

function cubic(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], curve: Curve) {
  const estimate =
    Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) +
    Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) +
    Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  curve(
    (t) => {
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const e = t * t * t;
      return [a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]];
    },
    (t) => {
      // The derivative vanishes where a control point sits on its end point: look a little inward there.
      const atStart = t === 0 && p1[0] === p0[0] && p1[1] === p0[1];
      const atEnd = t === 1 && p2[0] === p3[0] && p2[1] === p3[1];
      const tt = atStart ? 1e-4 : atEnd ? 1 - 1e-4 : t;
      const v = 1 - tt;
      return [
        3 * v * v * (p1[0] - p0[0]) + 6 * v * tt * (p2[0] - p1[0]) + 3 * tt * tt * (p3[0] - p2[0]),
        3 * v * v * (p1[1] - p0[1]) + 6 * v * tt * (p2[1] - p1[1]) + 3 * tt * tt * (p3[1] - p2[1]),
      ];
    },
    estimate,
  );
}

function quadratic(p0: [number, number], p1: [number, number], p2: [number, number], curve: Curve) {
  const estimate = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  curve(
    (t) => {
      const u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
    },
    (t) => {
      const degenerate = (p1[0] === p0[0] && p1[1] === p0[1]) || (p1[0] === p2[0] && p1[1] === p2[1]);
      if (degenerate) return [p2[0] - p0[0], p2[1] - p0[1]];
      return [
        2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
        2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
      ];
    },
    estimate,
  );
}

/** An SVG elliptical arc, converted to its center parameterization (SVG 1.1, appendix F.6). */
function arc(
  from: [number, number],
  rxIn: number,
  ryIn: number,
  rotation: number,
  large: boolean,
  sweep: boolean,
  to: [number, number],
  curve: Curve,
  line: (x0: number, y0: number, x1: number, y1: number) => void,
) {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) {
    line(from[0], from[1], to[0], to[1]);
    return;
  }
  if (from[0] === to[0] && from[1] === to[1]) return;
  const phi = rotation * DEG;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (from[0] - to[0]) / 2;
  const dy = (from[1] - to[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  // Radii too small to reach the end point are scaled up.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator / denominator));
  const cx1 = (factor * rx * y1) / ry;
  const cy1 = (-factor * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from[0] + to[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (from[1] + to[1]) / 2;
  const angleOf = (ux: number, uy: number) => Math.atan2(uy, ux);
  const theta1 = angleOf((x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angleOf((-x1 - cx1) / rx, (-y1 - cy1) / ry) - theta1;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  curve(
    (t) => {
      const theta = theta1 + delta * t;
      const ex = rx * Math.cos(theta);
      const ey = ry * Math.sin(theta);
      return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
    },
    (t) => {
      const theta = theta1 + delta * t;
      const ex = -rx * Math.sin(theta) * delta;
      const ey = ry * Math.cos(theta) * delta;
      return [cos * ex - sin * ey, sin * ex + cos * ey];
    },
    Math.abs(delta) * Math.max(rx, ry),
  );
}

/** Walks samples by arc length, interpolating positions and directions between them. */
function polylineSampler(samples: readonly Sample[], closed: boolean): PathSampler {
  const length = samples.at(-1)!.distance;
  const first = samples[0]!;
  const last = samples.at(-1)!;
  const lerpAngle = (a: number, b: number, t: number) => {
    let delta = b - a;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return a + delta * t;
  };
  return {
    length,
    closed,
    pointAt(distance) {
      if (length === 0) return { x: first.x, y: first.y, angle: first.angle };
      let d = distance;
      if (closed) d = ((d % length) + length) % length;
      if (d < 0)
        return { x: first.x + Math.cos(first.angle) * d, y: first.y + Math.sin(first.angle) * d, angle: first.angle };
      if (d > length) {
        const extra = d - length;
        return {
          x: last.x + Math.cos(last.angle) * extra,
          y: last.y + Math.sin(last.angle) * extra,
          angle: last.angle,
        };
      }
      // Binary search for the piece holding `d`.
      let low = 0;
      let high = samples.length - 1;
      while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (samples[mid]!.distance <= d) low = mid;
        else high = mid;
      }
      const a = samples[low]!;
      const b = samples[high]!;
      const span = b.distance - a.distance;
      const t = span > 0 ? (d - a.distance) / span : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: lerpAngle(a.angle, b.angle, t) };
    },
  };
}
