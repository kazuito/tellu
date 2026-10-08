import { forwardRef, type ReactNode, useEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { Text as BaseText, type TextProps } from "../react/Text";

export interface RemotionTextProps extends TextProps {
  /** Label shown when Remotion times out waiting for this text. */
  delayRenderLabel?: string;
}

/**
 * `<Text>` that holds Remotion's frame capture (`delayRender`) until the renderer is ready,
 * fonts are loaded and the current props are drawn. Render with `--gl=angle` for WebGL in headless Chrome.
 */
export const Text = forwardRef<HTMLDivElement, RemotionTextProps>(function Text(
  { delayRenderLabel = "tixi: drawing text", onPendingChange, onError, ...props },
  ref,
): ReactNode {
  const [initialHandle] = useState(() => delayRender(delayRenderLabel));
  const handle = useRef<number | null>(initialHandle);

  const release = () => {
    if (handle.current === null) return;
    continueRender(handle.current);
    handle.current = null;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: release only on unmount
  useEffect(() => release, []);

  return (
    <BaseText
      ref={ref}
      {...props}
      onPendingChange={(pending) => {
        if (pending && handle.current === null) handle.current = delayRender(delayRenderLabel);
        if (!pending) release();
        onPendingChange?.(pending);
      }}
      onError={(error) => {
        onError?.(error);
        cancelRender(error);
      }}
    />
  );
});
