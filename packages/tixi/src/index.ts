export { TelopNode, createGlyphContexts, type TelopNodeOptions } from "./TelopNode";
export { TelopRenderer, type DrawOptions, type DrawResult, type TelopRendererOptions } from "./TelopRenderer";
export { createCanvasTelop, type CanvasTelop, type CreateCanvasTelopOptions } from "./createTelop";
export { fontRequests, fontsReady, getFontEpoch, loadFonts, subscribeFontEpoch, type FontRequest } from "./fonts";
export { parseMarkup } from "./markup";

export { layoutTelop, normalizeRuns, type Layout, type LayoutGlyph, type LayoutLine, type ResolvedRun } from "./layout/layout";
export {
  CanvasMeasurer,
  fontSpecOf,
  fontToCss,
  getDefaultMeasurer,
  type FontMetrics,
  type FontSpec,
  type Measurer,
} from "./layout/measure";

export { defaultKinsoku, defaultStyle, resolveStyle } from "./style/defaults";
export { fill, glow, linearGradient, radialGradient, shadow, stroke, type GlowOptions, type ShadowOptions } from "./style/helpers";
export { applyOverride, mergeOverrides } from "./style/merge";
export type * from "./style/types";
