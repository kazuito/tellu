import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TelopRenderer } from "../TelopRenderer";

const RendererContext = createContext<TelopRenderer | Promise<TelopRenderer> | null>(null);

export interface TelopRendererProviderProps {
  /** Renderer used by `<Telop>` components below. Default: `TelopRenderer.shared()`. */
  renderer: TelopRenderer | Promise<TelopRenderer>;
  children?: ReactNode;
}

export function TelopRendererProvider({ renderer, children }: TelopRendererProviderProps): ReactNode {
  return <RendererContext.Provider value={renderer}>{children}</RendererContext.Provider>;
}

/** The renderer for this subtree, or `null` while it is being created. */
export function useTelopRenderer(onError?: (error: unknown) => void): TelopRenderer | null {
  const source = useContext(RendererContext);
  const [renderer, setRenderer] = useState<TelopRenderer | null>(source instanceof TelopRenderer ? source : null);

  useEffect(() => {
    if (source instanceof TelopRenderer) {
      setRenderer(source);
      return;
    }
    let active = true;
    (source ?? TelopRenderer.shared()).then(
      (instance) => active && setRenderer(instance),
      (error: unknown) => active && onError?.(error),
    );
    return () => {
      active = false;
    };
  }, [source]);

  return source instanceof TelopRenderer ? source : renderer;
}
