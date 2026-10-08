---
description: Captions for YouTube, Shorts and live streams, covering bold edit subtitles, a short-form hook, a neon stream alert and a sale price tag.
---

# YouTube & Shorts

Captions for creator content: loud, fast and readable on a phone.

## Edit subtitles

Two-tone outlines, the default look of YouTube edits. The inner outline matches the fill's mood, and the outer one separates the caption from any background.

```ts demo backdrop=scene
import { fill, parseMarkup, stroke } from "tixi";

export default {
  text: parseMarkup("ここ<hot>めちゃくちゃ</hot>重要です", {
    hot: {
      layers: { inner: { paint: "#ff3d3d" }, face: { paint: "#fff27a" } },
    },
  }),
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 64,
    layers: [
      stroke(16, "#ffffff"),
      stroke(9, "#1f1f1f", { id: "inner" }),
      fill("#ffffff", { id: "face" }),
    ],
  },
};
```

## Short-form hook

A two-line hook for vertical video, shrunk to fit the safe area whatever the copy says.

```ts demo backdrop=night
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tixi";

export default {
  text: parseMarkup(
    "<tag>【検証】</tag><br/>1日100回テロップを作ったら上達する？",
    {
      tag: {
        fontFamily: "Dela Gothic One",
        fontWeight: 400,
        layers: { 2: { paint: linearGradient(["#fff", "#ffe14d"]) } },
      },
    },
  ),
  maxWidth: 520,
  maxLines: 3,
  overflow: "shrink",
  align: "center",
  lineBreak: "phrase",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 64,
    lineHeight: 1.25,
    layers: [
      shadow({ offset: [0, 6], blur: 8, stroke: 14 }),
      stroke(14, "#111111"),
      fill("#ffffff"),
    ],
  },
};
```

## Stream alert

Additive glows over a dark scene. The glow pulses with a per-glyph opacity animation.

```ts demo loop=60 still=0 backdrop=studio
import { fill, glow, stroke, type TextNodeProps } from "tixi";

export default (frame: number): TextNodeProps => ({
  text: "NEW FOLLOWER!!",
  style: {
    fontFamily: "Montserrat",
    fontWeight: 900,
    fontSize: 72,
    letterSpacing: 4,
    layers: [
      glow({ color: "#00e5ff", stroke: 8, blur: 20, blendMode: "add" }),
      glow({ color: "#ff00d4", stroke: 3, blur: 6, blendMode: "add" }),
      stroke(3, "#b8f7ff"),
      fill("#ffffff"),
    ],
  },
  glyphTransform: (glyph) => ({
    opacity:
      0.75 + 0.25 * Math.cos((frame / 60) * Math.PI * 2 - glyph.index * 0.4),
    y: Math.sin((frame / 60) * Math.PI * 2 - glyph.index * 0.4) * 3,
  }),
});
```

## Sale price

Mixed sizes on one baseline: a small ¥, big condensed digits and a tax note in a different face.

```ts demo backdrop=light
import { fill, linearGradient, parseMarkup, shadow, stroke } from "tixi";

export default {
  text: parseMarkup("<yen>¥</yen>1,980<note>（税込）</note>", {
    yen: { fontSize: 56, baselineShift: 4 },
    note: {
      fontFamily: "Noto Sans JP",
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: 0,
      scaleX: 1,
    },
  }),
  style: {
    fontFamily: "Montserrat, Noto Sans JP",
    fontWeight: 900,
    fontSize: 112,
    scaleX: 0.88,
    letterSpacing: -2,
    layers: [
      shadow({ offset: [5, 6], blur: 0, stroke: 12, color: "#7a0010" }),
      stroke(12, "#ffffff"),
      fill(linearGradient(["#ff4d4d", "#c80018"])),
    ],
  },
};
```
