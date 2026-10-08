import { type ReactNode, useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

export const FONTS = {
  gothic: "Noto Sans JP",
  heavy: "Dela Gothic One",
  rounded: "Zen Maru Gothic",
  serif: "Noto Serif JP",
  pop: "RocknRoll One",
  brush: "Reggae One",
  latin: "Montserrat",
} as const;

const STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;900&family=Dela+Gothic+One&family=Zen+Maru+Gothic:wght@900" +
  "&family=Noto+Serif+JP:wght@500;900&family=RocknRoll+One&family=Reggae+One&family=Montserrat:wght@900&display=block";

let stylesheet: Promise<void> | undefined;

function loadStylesheet(): Promise<void> {
  stylesheet ??= new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET;
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
  return stylesheet;
}

/**
 * Renders children once the @font-face rules exist. The rules are split by unicode-range and tixi
 * loads only the subsets each telop needs, but it can only see rules that are already declared.
 */
export const FontGate = ({ children }: { children: ReactNode }) => {
  const [handle] = useState(() => delayRender("Loading font stylesheet"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadStylesheet().then(() => setReady(true));
  }, []);

  // Children have rendered (and placed their own delayRender) by the time this effect runs.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  return ready ? children : null;
};
