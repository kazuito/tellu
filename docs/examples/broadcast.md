---
description: Broadcast captions to copy, including a news super, breaking-news label, shrink-to-fit headline, lower third, speaker subtitles and the karaoke wipe technique.
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

## Breaking label and headline

The label is a plain plate. The headline must fit the bar whatever its length, so it shrinks on one line.

```ts demo compare
import { fill } from "tellu";

const label = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 36,
  layers: [fill("#ffffff")],
};

export default {
  label: {
    text: "ニュース速報",
    style: label,
    background: { paint: "#d7000f", padding: [24, 12] },
  },
  "headline (maxWidth 420, shrink)": {
    text: "首都圏で記録的な大雨　気象庁「命を守る行動を」",
    maxWidth: 420,
    wrap: "none",
    overflow: "shrink",
    style: { ...label, layers: [fill("#0b1f44")] },
    background: { paint: "rgba(255,255,255,0.96)", padding: [24, 12] },
  },
};
```

## Lower third

Name and title in one caption: a run for the smaller title line, and one gradient plate behind both.

```ts demo
import { fill, linearGradient } from "tellu";

export default {
  text: [
    "山田 太郎",
    {
      text: "\ntellu 開発者",
      style: {
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: { em: 0.05 },
        layers: [fill("#9fd3ff")],
      },
    },
  ],
  style: {
    fontFamily: "Noto Sans JP",
    fontWeight: 900,
    fontSize: 52,
    letterSpacing: { em: 0.08 },
    lineHeight: 1.3,
    layers: [fill("#ffffff")],
  },
  background: {
    paint: linearGradient(["#0b2a4a", "#14508a"], { angle: 90 }),
    padding: [36, 18],
    stroke: { width: 3, paint: "#5ab0ff" },
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

A karaoke wipe colors the text left to right as it is spoken. Stack two identical captions and reveal the colored one with `clip-path`. tellu lays both out identically, so they line up to the pixel:

```tsx
import { interpolate, useCurrentFrame } from "remotion";
import { fill, shadow, stroke } from "tellu";
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
      <Text text={text} textStyle={base} />
      <Text
        text={text}
        textStyle={sung}
        style={{
          position: "absolute",
          inset: 0,
          // Generous negative insets keep the outline and shadow inside the clip.
          clipPath: `inset(-60px ${(1 - progress) * 100}% -60px -60px)`,
        }}
      />
    </div>
  );
};
```

The colored copy changes only its fill. Because `clip-path` is CSS, the wipe costs nothing per frame on the tellu side.
