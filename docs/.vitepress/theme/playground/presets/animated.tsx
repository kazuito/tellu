import { useEffect, useState } from "react";
import { fill, stroke } from "tellu";
import { Text } from "tellu/react";

const FPS = 30;
const LOOP = 90;

function useFrame() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    let handle = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setFrame(Math.floor(((now - start) * FPS) / 1000) % LOOP);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);
  return frame;
}

const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

export default function App() {
  const frame = useFrame();

  return (
    <Text
      text="一文字ずつポンッ！"
      textStyle={{
        fontFamily: "Dela Gothic One",
        fontSize: 72,
        layers: [stroke(18, "#2b1055"), stroke(9, "#ffffff"), fill("#ff3c8e")],
      }}
      glyphTransform={(glyph) => {
        const t = Math.min(
          1,
          Math.max(0, (frame - glyph.visibleIndex * 3) / 8),
        );
        if (t === 0) return { visible: false };
        return { scale: easeOutBack(t), y: (1 - t) * -40, origin: [0.5, 1] };
      }}
    />
  );
}
