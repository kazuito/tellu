import {
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { checkFonts, type FontCheckMode, type FontIssue, FontIssueError, warnFontIssues } from "../fontCheck";
import { fontRequests, fontsReady, getFontEpoch, loadFonts, subscribeFontEpoch } from "../fonts";
import type { Layout } from "../layout/layout";
import type { Measurer } from "../layout/measure";
import type { TextContent, TextNodeProps, TextStyle } from "../style/types";
import { TextNode } from "../TextNode";
import type { DrawResult, TextRenderer } from "../TextRenderer";
import { stableKey } from "../utils/stableKey";
import { useTextRenderer } from "./context";

/**
 * Point of the layout box placed at the element's position: a named point, or `[x, y]` as fractions of the layout box
 * (`[0.5, 1]` = bottom center).
 */
export type Anchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | readonly [x: number, y: number];

/** Keeps the text in the accessibility tree and find-in-page without showing or sizing it. */
const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "pre-wrap",
};

function plainText(text: TextContent): string {
  return typeof text === "string" ? text : text.map((run) => (typeof run === "string" ? run : run.text)).join("");
}

const ANCHORS: Record<Exclude<Anchor, readonly [number, number]>, readonly [number, number]> = {
  "top-left": [0, 0],
  top: [0.5, 0],
  "top-right": [1, 0],
  left: [0, 0.5],
  center: [0.5, 0.5],
  right: [1, 0.5],
  "bottom-left": [0, 1],
  bottom: [0.5, 1],
  "bottom-right": [1, 1],
};

/** The region drawn into the canvas, relative to the layout box, plus the node and its layout. */
export interface TextDrawEvent extends DrawResult {
  /** The layout that was drawn, e.g. to read the number of lines or the `shrink` scale. */
  layout: Layout;
  node: TextNode;
}

/** Every `TextNodeProps` option, with `style` renamed to `textStyle`, plus props for the element and its lifecycle. */
export interface TextProps extends Omit<TextNodeProps, "style"> {
  /** Text style (font, layers, …), the `style` of `TextNodeProps`. `style` styles the wrapper element. */
  textStyle?: Partial<TextStyle>;
  /**
   * Point of the layout box placed at the element's position, applied as a CSS translate.
   * Default: `"top-left"` (no translate).
   */
  anchor?: Anchor;
  /**
   * Pixel density of the canvas. Raise it when the element is scaled up, e.g. inside a CSS-transformed stage.
   * Default: `devicePixelRatio`.
   */
  resolution?: number;
  /**
   * Text for screen readers and find-in-page in place of the caption's text, which the canvas hides from them.
   * `""` marks the caption as decorative. Default: the caption's text.
   */
  alt?: string;
  /** Wait for web fonts before drawing so no fallback font is ever measured. Default: `true`. */
  waitForFonts?: boolean;
  /**
   * Checks the fonts once they are loaded (see `checkFonts()`): `"warn"` logs each issue once with `console.warn`,
   * `"error"` stays pending until the check is done and reports issues to `onError` as a `FontIssueError`, and `"off"`
   * skips the check. Default: `"warn"`.
   */
  fontCheck?: FontCheckMode;
  /** Called with the issues a font check found, in `"warn"` and `"error"` mode. */
  onFontIssues?: (issues: readonly FontIssue[]) => void;
  /** Default: the one from `<TextRendererProvider>`, or `TextRenderer.shared()`. */
  renderer?: TextRenderer;
  /** Text measurement backend. Only read when the component mounts. Default: `getDefaultMeasurer()`. */
  measurer?: Measurer;
  /** Class of the wrapper `<div>`. */
  className?: string;
  /** Style of the wrapper `<div>`, merged over its `position: relative` and `display: inline-block`. */
  style?: CSSProperties;
  /** Called after each draw. A render that changes nothing the caption paints skips both the draw and this call. */
  onDraw?: (event: TextDrawEvent) => void;
  /** `true` while fonts or the renderer are loading, i.e. while the canvas may not match the props. */
  onPendingChange?: (pending: boolean) => void;
  /** Called when the renderer, a font or a draw fails. Without it, draw errors throw to the nearest error boundary. */
  onError?: (error: unknown) => void;
}

/**
 * Draws a caption into a canvas. The element takes the size of the layout box; outlines, shadows and transformed
 * glyphs may paint outside of it. It waits for the fonts it needs, re-measures when web fonts finish loading, and keeps
 * the caption's text readable by screen readers and find-in-page. The ref is the wrapper `<div>`.
 *
 * Re-rendering is cheap: unchanged props don't redraw, and a new `glyphTransform` alone only moves the existing glyphs,
 * so it can change every frame.
 *
 * @example <Text text="テロップ" textStyle={{ fontSize: 64 }} maxWidth={800} anchor="bottom" />
 */
export const Text = forwardRef<HTMLDivElement, TextProps>(function Text(props, ref): ReactNode {
  const {
    textStyle,
    anchor = "top-left",
    resolution,
    alt,
    waitForFonts = true,
    fontCheck = "warn",
    onFontIssues,
    renderer: rendererProp,
    measurer,
    className,
    style,
    onDraw,
    onPendingChange,
    onError,
    ...rest
  } = props;
  const sharedRenderer = useTextRenderer(onError);
  const renderer = rendererProp ?? sharedRenderer;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeRef = useRef<TextNode | null>(null);
  // Fonts that finish loading after a draw (e.g. a stylesheet added later) trigger a re-measure.
  const fontEpoch = useSyncExternalStore(subscribeFontEpoch, getFontEpoch, getFontEpoch);
  const drawnEpoch = useRef(fontEpoch);
  const pendingRef = useRef<boolean | null>(null);
  const lastDraw = useRef<{
    node: TextNode;
    revision: number;
    renderer: TextRenderer;
    canvas: HTMLCanvasElement;
    resolution: number;
  } | null>(null);
  const callbacks = useRef({ onDraw, onPendingChange, onError, onFontIssues });
  callbacks.current = { onDraw, onPendingChange, onError, onFontIssues };
  /** The font check of the current fonts and mode: started, or done with no issues to wait for. */
  const fontCheckState = useRef<{ key: string; done: boolean } | null>(null);

  const setPending = (pending: boolean) => {
    if (pendingRef.current === pending) return;
    pendingRef.current = pending;
    callbacks.current.onPendingChange?.(pending);
  };

  const nodeProps: TextNodeProps = { ...rest, style: textStyle };

  /** Starts a font check unless one for these fonts already ran. Returns whether drawing must wait for it. */
  const checkFontsOnce = (): boolean => {
    if (fontCheck === "off" || typeof document === "undefined" || document.fonts?.status === "loading") return false;
    const key = stableKey([fontRequests(nodeProps), fontEpoch, fontCheck]);
    const state = fontCheckState.current;
    if (state?.key === key) return fontCheck === "error" && !state.done;
    const current = { key, done: false };
    fontCheckState.current = current;
    checkFonts(nodeProps).then(
      (issues) => {
        if (fontCheckState.current !== current) return;
        if (issues.length > 0) callbacks.current.onFontIssues?.(issues);
        if (fontCheck === "warn") {
          warnFontIssues(issues);
          current.done = true;
          return;
        }
        if (issues.length > 0) {
          // Stay pending: the canvas shows fallback fonts.
          const error = new FontIssueError(issues);
          if (callbacks.current.onError) callbacks.current.onError(error);
          else console.error(error);
          return;
        }
        current.done = true;
        setPending(typeof document !== "undefined" && document.fonts?.status === "loading");
      },
      (error: unknown) => fontCheckState.current === current && callbacks.current.onError?.(error),
    );
    return fontCheck === "error";
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!renderer || !canvas || !wrapper) return;
    try {
      const pixelRatio = resolution ?? (typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
      let node = nodeRef.current;
      if (!node) {
        node = new TextNode(nodeProps, { resolution: pixelRatio, measurer });
        nodeRef.current = node;
      } else if (drawnEpoch.current !== fontEpoch) {
        node.props = nodeProps;
        node.invalidate();
      } else {
        node.props = nodeProps;
      }
      drawnEpoch.current = fontEpoch;
      const last = lastDraw.current;
      const unchanged =
        last !== null &&
        last.node === node &&
        last.revision === node.revision &&
        last.renderer === renderer &&
        last.canvas === canvas &&
        last.resolution === pixelRatio;
      if (!unchanged) {
        const result = renderer.draw(node, canvas, { resolution: pixelRatio });
        lastDraw.current = { node, revision: node.revision, renderer, canvas, resolution: pixelRatio };
        const { layout } = node;
        wrapper.style.width = `${layout.width}px`;
        wrapper.style.height = `${layout.height}px`;
        canvas.style.left = `${result.x}px`;
        canvas.style.top = `${result.y}px`;
        canvas.style.width = `${result.width}px`;
        canvas.style.height = `${result.height}px`;
        callbacks.current.onDraw?.({ ...result, layout, node });
      }
      // A font that is still loading will bump the epoch and redraw; stay pending until then.
      const loading = typeof document !== "undefined" && document.fonts?.status === "loading";
      setPending(checkFontsOnce() || loading);
    } catch (error) {
      callbacks.current.onError?.(error);
      if (!callbacks.current.onError) throw error;
    }
  };

  useLayoutEffect(() => {
    if (!renderer) {
      setPending(true);
      return;
    }
    if (!waitForFonts || fontsReady(nodeProps)) {
      draw();
      return;
    }
    setPending(true);
    let active = true;
    loadFonts(nodeProps).then(
      () => {
        if (!active) return;
        drawnEpoch.current = -1;
        draw();
      },
      (error: unknown) => active && callbacks.current.onError?.(error),
    );
    return () => {
      active = false;
    };
  });

  useEffect(
    () => () => {
      nodeRef.current?.destroy();
      nodeRef.current = null;
    },
    [],
  );

  const [ax, ay] = typeof anchor === "string" ? ANCHORS[anchor] : anchor;
  const label = alt ?? plainText(rest.text);
  return (
    <div
      ref={(element) => {
        wrapperRef.current = element;
        if (typeof ref === "function") ref(element);
        else if (ref) ref.current = element;
      }}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
        ...(ax !== 0 || ay !== 0 ? { translate: `${-ax * 100}% ${-ay * 100}%` } : undefined),
        ...style,
      }}
    >
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabIndex is not focusable */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", display: "block", pointerEvents: "none" }}
      />
      {label !== "" && <span style={VISUALLY_HIDDEN}>{label}</span>}
    </div>
  );
});
