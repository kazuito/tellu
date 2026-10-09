import { fill, linearGradient, shadow, stroke } from "tellu";
import { Text } from "tellu/react";

export default function App() {
  return (
    <Text
      text="Reactでテロップ！"
      textStyle={{
        fontFamily: "Noto Sans JP",
        fontWeight: 900,
        fontSize: 72,
        layers: [
          shadow({
            color: "rgba(0,0,0,0.45)",
            offset: [8, 10],
            blur: 6,
            stroke: 22,
          }),
          stroke(22, "#14206b"),
          stroke(12, "#ffffff"),
          fill(linearGradient(["#ffd000", "#ff8a00", "#ff4d00"])),
        ],
      }}
    />
  );
}
