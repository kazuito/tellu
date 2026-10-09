import { useState } from "react";
import { fill, stroke } from "tellu";
import { Text } from "tellu/react";

const field = {
  height: 36,
  padding: "0 10px",
  borderRadius: 6,
  color: "#111",
  background: "#fff",
};

export default function App() {
  const [text, setText] = useState("ここに入力してね");
  const [color, setColor] = useState("#ff2e7e");

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 32 }}>
      <Text
        text={text}
        maxWidth={640}
        align="center"
        textStyle={{
          fontFamily: "Zen Maru Gothic",
          fontWeight: 900,
          fontSize: 64,
          layers: [stroke(16, color), stroke(8, "#ffffff"), fill(color)],
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          style={{ ...field, width: 260 }}
        />
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          style={{ ...field, width: 48, padding: 4 }}
        />
      </div>
    </div>
  );
}
