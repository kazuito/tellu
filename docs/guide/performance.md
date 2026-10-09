---
description: Keep caption animation cheap by changing only glyphTransform per frame, keeping filters and images stable, and sharing one renderer.
---

# Performance

tellu does expensive work (layout and rasterizing) only when it has to, and cheap work (moving sprites) on every frame. These guidelines keep you on the cheap path.

## What triggers a rebuild

On every update, a node compares a **structural key** of its props, minus `glyphTransform`, plus its resolution:

- **Same key**: only glyph transforms are reapplied. This costs microseconds.
- **Different key**: full layout and composition. Bitmaps for unchanged glyph × layer pairs still come from the cache.

`<Text>` also skips drawing when a render changes nothing it paints: same props, and glyph transforms with the same output as last time. A static caption in a Remotion composition is drawn once, not on every frame.

Plain data (strings, numbers, arrays, objects) is compared **by value**, so rebuilding identical style objects every render is fine. Class instances, such as PixiJS filters, images and canvases, are compared **by identity**.

## Do

- **Animate with `glyphTransform`** whenever you can, instead of changing `text`, `style` or layout props per frame.
- **Create filters and pattern sources once**, at module level or in a `useMemo`.
- **Hide glyphs instead of slicing text** for typewriter effects. See [the recipe](./animation#typewriter-pop-in).
- **Move whole captions with CSS** (or the node's own transform) rather than a transform on every glyph.
- **Share the renderer.** The default `TextRenderer.shared()` already does this.

## Avoid

```tsx
// ✗ A new filter instance every frame forces a full rebuild every frame
<Text textStyle={{ layers: [fill("#fff", { filters: [new NoiseFilter()] })] }} />

// ✓ Created once
const grain = new NoiseFilter();
<Text textStyle={{ layers: [fill("#fff", { filters: [grain] })] }} />
```

```tsx
// ✗ Re-layout and re-rasterize every frame
<Text text={fullText.slice(0, frame)} />

// ✓ Layout fixed, glyphs revealed
<Text text={fullText} glyphTransform={(glyph) => ({ visible: glyph.visibleIndex < frame })} />
```

## Big blurs

Blurred layers render through PixiJS's `BlurFilter`, whose cost grows with strength × quality × area. A few large glows on a full-HD caption are fine. Dozens of animated captions each with a 40 px, quality-8 blur will add up. Lower `blurQuality` (default `4`) first: 2–3 passes are often indistinguishable.

## Resolution

Glyph bitmaps are rasterized at the node's `resolution`. In Remotion, the default (`devicePixelRatio`) is `1` at scale 1. Render with `--scale=2` and the output is sharp at 2×, with four times the pixels to rasterize.
