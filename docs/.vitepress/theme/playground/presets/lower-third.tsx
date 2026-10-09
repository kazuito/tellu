import { fill, linearGradient } from "tellu";
import { Text } from "tellu/react";

const name = {
  fontFamily: "Noto Sans JP",
  fontWeight: 900,
  fontSize: 52,
  letterSpacing: { em: 0.08 },
  layers: [fill("#ffffff")],
};

const title = {
  fontFamily: "Noto Sans JP",
  fontWeight: 700,
  fontSize: 26,
  letterSpacing: { em: 0.05 },
  layers: [fill("#0b2a4a")],
};

export default function App() {
  return (
    <div style={{ display: "grid", justifyItems: "start", gap: 22 }}>
      <Text
        text="山田 太郎"
        textStyle={name}
        background={{
          paint: linearGradient(["#0b2a4a", "#14508a"], { angle: 90 }),
          padding: [36, 14],
        }}
      />
      <Text
        text="tellu 開発者"
        textStyle={title}
        background={{ paint: "#9fd3ff", padding: [24, 8] }}
        style={{ marginLeft: 36 }}
      />
    </div>
  );
}
