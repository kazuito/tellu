export { type CanvasText, type CreateCanvasTextOptions, createCanvasText } from "./createCanvasText";
export { checkFonts, type FontCheckMode, type FontIssue, FontIssueError } from "./fontCheck";
export { type FontRequest, fontRequests, fontsReady, getFontEpoch, loadFonts, subscribeFontEpoch } from "./fonts";
export type { LayoutDecoration } from "./layout/decorations";
export {
  type Layout,
  type LayoutGlyph,
  type LayoutLine,
  layoutText,
  normalizeRuns,
  type ResolvedRun,
} from "./layout/layout";
export {
  CanvasMeasurer,
  type FontMetrics,
  type FontSpec,
  fontSpecOf,
  fontToCss,
  getDefaultMeasurer,
  type InkBounds,
  type Measurer,
} from "./layout/measure";
export { type WipeClipOptions, wipeClip } from "./layout/wipe";
export { parseMarkup } from "./markup";
export { defaultKinsoku, defaultStyle, resolveStyle } from "./style/defaults";
export {
  arcPath,
  type BevelOptions,
  type BoxDecorationOptions,
  bevel,
  conicGradient,
  diamondGradient,
  fill,
  frame,
  type GlowOptions,
  glow,
  type InnerGlowOptions,
  type InnerShadowOptions,
  innerGlow,
  innerShadow,
  type LineDecorationOptions,
  linearGradient,
  lineThrough,
  marker,
  overline,
  radialGradient,
  type SatinOptions,
  type ShadowOptions,
  satin,
  shadow,
  shapeGradient,
  stroke,
  underline,
} from "./style/helpers";
export { applyOverride, mergeOverrides } from "./style/merge";
export type * from "./style/types";
export { createGlyphContexts, TextNode, type TextNodeOptions } from "./TextNode";
export { type DrawOptions, type DrawResult, TextRenderer, type TextRendererOptions } from "./TextRenderer";
