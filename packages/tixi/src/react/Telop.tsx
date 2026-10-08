import {
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { fontsReady, getFontEpoch, loadFonts, subscribeFontEpoch } from "../fonts";
import type { Layout } from "../layout/layout";
import type { Measurer } from "../layout/measure";
import type { TelopProps, TelopStyle } from "../style/types";
import { TelopNode } from "../TelopNode";
import type { DrawResult, TelopRenderer } from "../TelopRenderer";
import { useTelopRenderer } from "./context";

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

export interface TelopDrawEvent extends DrawResult {
  layout: Layout;
  node: TelopNode;
}

export interface TelopComponentProps extends Omit<TelopProps, "style"> {
  /** Text style (font, layers, …). `style` styles the wrapper element. */
  textStyle?: Partial<TelopStyle>;
  /**
   * Point of the layout box placed at the element's position, applied as a CSS translate.
   * Default: `"top-left"` (no translate).
   */
  anchor?: Anchor;
  /** Default: `devicePixelRatio`. */
  resolution?: number;
  /** Wait for web fonts before drawing so no fallback font is ever measured. Default: `true`. */
  waitForFonts?: boolean;
  renderer?: TelopRenderer;
  measurer?: Measurer;
  className?: string;
  style?: CSSProperties;
  onDraw?: (event: TelopDrawEvent) => void;
  /** `true` while fonts or the renderer are loading, i.e. while the canvas may not match the props. */
  onPendingChange?: (pending: boolean) => void;
  onError?: (error: unknown) => void;
}

/**
 * Draws a telop into a canvas. The element takes the size of the layout box; outlines, shadows and
 * transformed glyphs may paint outside of it.
 */
export const Telop = forwardRef<HTMLDivElement, TelopComponentProps>(function Telop(props, ref): ReactNode {
  const {
    textStyle,
    anchor = "top-left",
    resolution,
    waitForFonts = true,
    renderer: rendererProp,
    measurer,
    className,
    style,
    onDraw,
    onPendingChange,
    onError,
    ...telop
  } = props;
  const sharedRenderer = useTelopRenderer(onError);
  const renderer = rendererProp ?? sharedRenderer;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeRef = useRef<TelopNode | null>(null);
  // Fonts that finish loading after a draw (e.g. a stylesheet added later) trigger a re-measure.
  const fontEpoch = useSyncExternalStore(subscribeFontEpoch, getFontEpoch, getFontEpoch);
  const drawnEpoch = useRef(fontEpoch);
  const pendingRef = useRef<boolean | null>(null);
  const callbacks = useRef({ onDraw, onPendingChange, onError });
  callbacks.current = { onDraw, onPendingChange, onError };

  const setPending = (pending: boolean) => {
    if (pendingRef.current === pending) return;
    pendingRef.current = pending;
    callbacks.current.onPendingChange?.(pending);
  };

  const telopProps: TelopProps = { ...telop, style: textStyle };
  const draw = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!renderer || !canvas || !wrapper) return;
    try {
      const pixelRatio = resolution ?? (typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
      let node = nodeRef.current;
      if (!node) {
        node = new TelopNode(telopProps, { resolution: pixelRatio, measurer });
        nodeRef.current = node;
      } else if (drawnEpoch.current !== fontEpoch) {
        node.props = telopProps;
        node.invalidate();
      } else {
        node.props = telopProps;
      }
      drawnEpoch.current = fontEpoch;
      const result = renderer.draw(node, canvas, { resolution: pixelRatio });
      const { layout } = node;
      wrapper.style.width = `${layout.width}px`;
      wrapper.style.height = `${layout.height}px`;
      canvas.style.left = `${result.x}px`;
      canvas.style.top = `${result.y}px`;
      canvas.style.width = `${result.width}px`;
      canvas.style.height = `${result.height}px`;
      callbacks.current.onDraw?.({ ...result, layout, node });
      // A font that is still loading will bump the epoch and redraw; stay pending until then.
      setPending(typeof document !== "undefined" && document.fonts?.status === "loading");
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
    if (!waitForFonts || fontsReady(telopProps)) {
      draw();
      return;
    }
    setPending(true);
    let active = true;
    loadFonts(telopProps).then(
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
      <canvas ref={canvasRef} style={{ position: "absolute", display: "block", pointerEvents: "none" }} />
    </div>
  );
});
