---
description: Broadcast captions to copy, including a news super, speaker subtitles and the karaoke wipe technique.
---

# News & subtitles

Restrained, legible captions for news, documentaries and interviews.

## News super

White on a tight black outline with a soft shadow, readable over any footage.

```ts demo
import { fill, shadow, stroke } from "tellu";

export default {
  text: "「こんな雨は初めて」\n「傘がまったく役に立たない」",
  align: "center",
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    lineHeight: 1.35,
    layers: [
      shadow({ offset: [3, 3], blur: 3, stroke: 7, color: "rgba(0,0,0,0.5)" }),
      stroke(7, "#1a1a1a"),
      fill("#ffffff"),
    ],
  },
};
```

## Speaker subtitles

The fill color tells you who is speaking, and a pill label names them.

```ts demo compare
import { fill, shadow, stroke } from "tellu";

const line = (text: string, color: string) => ({
  text,
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 40,
    layers: [
      shadow({ offset: [0, 4], blur: 6, stroke: 8, color: "rgba(0,0,0,0.6)" }),
      stroke(8, "#000000"),
      fill(color),
    ],
  },
});

export default {
  "speaker A": line("テロップって、CSSだけだと限界あるよね", "#ffd400"),
  "speaker B": line("それ全部、レイヤーを並べるだけ！", "#4ad6ff"),
};
```

## Karaoke subtitles

A karaoke wipe colors the text along its lines as it is spoken. Stack two identical captions and reveal the colored one with `clip` and [`wipeClip()`](/api/layout#wipeclip). tellu lays both out identically, so they line up to the pixel, and the wipe moves on to the next line when a line is done:

```tsx
import { interpolate, useCurrentFrame } from "remotion";
import { fill, shadow, stroke, wipeClip } from "tellu";
import { Text } from "tellu/remotion";

const base = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 64,
  layers: [shadow({ offset: [0, 4], blur: 6, stroke: 10 }), stroke(10, "#000"), fill("#fff")],
};
const sung = { ...base, layers: [...base.layers.slice(0, 2), fill("#ffd400")] };

export const KaraokeLine = ({ text, duration }: { text: string; duration: number }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative" }}>
      <Text text={text} textStyle={base} maxWidth={900} />
      <Text
        text={text}
        textStyle={sung}
        maxWidth={900}
        clip={(layout) => wipeClip(layout, progress)}
        style={{ position: "absolute", inset: 0 }}
      />
    </div>
  );
};
```

The colored copy changes only its fill. Like `glyphTransform`, a new `clip` doesn't rebuild the caption, so the wipe only redraws the canvas each frame. `wipeClip(layout, progress, { by: "glyph" })` gives every character the same share of the time instead of every pixel of length.
