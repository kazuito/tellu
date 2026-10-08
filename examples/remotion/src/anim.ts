import { Easing, interpolate } from "remotion";

/** 0 → 1 over `duration` frames starting at `start`, clamped on both ends. */
export const ramp = (frame: number, start: number, duration: number, easing: (t: number) => number = Easing.linear) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
