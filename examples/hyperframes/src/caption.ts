import { type CanvasText, createCanvasText, loadFonts, type TextNodeProps } from "tellu";

export interface CaptionSpec {
  /** Id of the element the caption is placed at. */
  host: string;
  props: TextNodeProps;
  /** Point of the layout box placed at the host, as fractions of its size. Default: `[0, 0]`. */
  anchor?: readonly [number, number];
  /** Props that change over time, at a frame counted from the start of the scene. */
  animate?: (frame: number) => Partial<TextNodeProps>;
  /** Every character the caption shows over time, when `animate` changes the text. */
  charset?: string;
}

export interface Caption {
  render(frame: number): void;
}

export async function createCaption(spec: CaptionSpec): Promise<Caption> {
  const host = document.getElementById(spec.host);
  if (!host) throw new Error(`No caption host #${spec.host}`);
  const canvas = document.createElement("canvas");
  host.append(canvas);
  if (spec.charset) await loadFonts({ text: spec.charset, style: spec.props.style });

  const text: CanvasText = await createCanvasText(canvas, { ...spec.props, ...spec.animate?.(0) });
  const [ax, ay] = spec.anchor ?? [0, 0];

  return {
    render(frame) {
      const { x, y, width, height } = spec.animate ? text.update(spec.animate(frame)) : text.lastDraw;
      const box = text.node.layoutBounds;
      canvas.style.left = `${x - ax * box.width}px`;
      canvas.style.top = `${y - ay * box.height}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    },
  };
}
