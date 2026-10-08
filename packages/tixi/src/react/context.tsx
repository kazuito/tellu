import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { TextRenderer } from "../TextRenderer";

const RendererContext = createContext<TextRenderer | Promise<TextRenderer> | null>(null);

export interface TextRendererProviderProps {
  /** Renderer used by `<Text>` components below. Default: `TextRenderer.shared()`. */
  renderer: TextRenderer | Promise<TextRenderer>;
  children?: ReactNode;
}

export function TextRendererProvider({ renderer, children }: TextRendererProviderProps): ReactNode {
  return <RendererContext.Provider value={renderer}>{children}</RendererContext.Provider>;
}

/** The renderer for this subtree, or `null` while it is being created. */
export function useTextRenderer(onError?: (error: unknown) => void): TextRenderer | null {
  const source = useContext(RendererContext);
  const [renderer, setRenderer] = useState<TextRenderer | null>(source instanceof TextRenderer ? source : null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new onError must not recreate the renderer
  useEffect(() => {
    if (source instanceof TextRenderer) {
      setRenderer(source);
      return;
    }
    let active = true;
    (source ?? TextRenderer.shared()).then(
      (instance) => active && setRenderer(instance),
      (error: unknown) => active && onError?.(error),
    );
    return () => {
      active = false;
    };
  }, [source]);

  return source instanceof TextRenderer ? source : renderer;
}
