import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { fill, linearGradient, shadow, stroke, type TextStyle } from "tixi";
import { Text } from "tixi/remotion";
import { easeIn, easeOut, ramp } from "../anim";
import { Background } from "../components/Background";
import { FONTS } from "../fonts";

export const NEWS_DURATION = 240;

const newsSuper: Partial<TextStyle> = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 64,
  lineHeight: 1.35,
  layers: [
    shadow({ offset: [3, 3], blur: 3, stroke: 7, color: "rgba(0,0,0,0.5)" }),
    stroke(7, "#1a1a1a"),
    fill("#ffffff"),
  ],
};

const newsLabel: Partial<TextStyle> = {
  fontFamily: FONTS.gothic,
  fontWeight: 900,
  fontSize: 44,
  layers: [fill("#ffffff")],
};

const TICKER =
  "【交通】JR山手線は大雨の影響で全線運転見合わせ　◆　【気象】関東南部に大雨警報　1時間に80ミリの猛烈な雨　◆　【空の便】羽田発着の国内線 32便が欠航　◆　【鉄道】東海道新幹線 一部列車に遅れ";

const BreakingBar = () => {
  const frame = useCurrentFrame();
  const drop = ramp(frame, 0, 12, easeOut);
  return (
    <div style={{ position: "absolute", left: 88, top: 62, display: "flex", translate: `0 ${(drop - 1) * 200}px` }}>
      <Text
        text="ニュース速報"
        textStyle={newsLabel}
        background={{ paint: "#d7000f", padding: [28, 14] }}
        style={{ marginRight: 56 }}
        glyphTransform={() => ({ opacity: frame < 30 && Math.floor(frame / 5) % 2 === 1 ? 0.35 : 1 })}
      />
      <Text
        text="首都圏で記録的な大雨　気象庁「命を守る行動を」"
        textStyle={{ ...newsLabel, layers: [fill("#0b1f44")] }}
        maxWidth={1100}
        wrap="none"
        overflow="shrink"
        background={{ paint: "rgba(255,255,255,0.96)", padding: [28, 14] }}
      />
    </div>
  );
};

const LiveBadge = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = 12 + Math.floor(frame / fps);
  return (
    <Text
      text={[{ text: "● ", style: { layers: [fill("#ff2d2d")] } }, `LIVE  15:42:${String(seconds).padStart(2, "0")}`]}
      textStyle={{ ...newsLabel, fontSize: 34, letterSpacing: { em: 0.04 } }}
      background={{ paint: "rgba(0,0,0,0.55)", padding: [20, 10], radius: 6 }}
      anchor="top-right"
      style={{ position: "absolute", left: 1860, top: 52 }}
      glyphTransform={(glyph) =>
        glyph.runIndex === 0 ? { opacity: 0.35 + 0.65 * Math.abs(Math.cos(frame / 12)) } : undefined
      }
    />
  );
};

const Location = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 80, top: 200, display: "flex", flexDirection: "column", gap: 20 }}>
      {["東京・千代田区", "午後3時40分ごろ"].map((line, index) => {
        const t = ramp(frame, 20 + index * 6, 10, easeOut);
        return (
          <Text
            key={line}
            text={line}
            textStyle={{ ...newsLabel, fontSize: 38 }}
            background={{ paint: "rgba(0,0,0,0.6)", padding: [20, 8] }}
            style={{ opacity: t, translate: `${(1 - t) * -40}px 0` }}
          />
        );
      })}
    </div>
  );
};

const Interview = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0]);
  return (
    <div style={{ position: "absolute", left: 960, top: 940, translate: "-50% -100%", opacity, textAlign: "center" }}>
      <Text
        text="近くに住む人"
        textStyle={{ ...newsSuper, fontSize: 36 }}
        style={{ display: "block", margin: "0 auto 18px" }}
      />
      <Text text={"「こんな雨は初めて」\n「傘がまったく役に立たない」"} textStyle={newsSuper} align="center" />
    </div>
  );
};

const Ticker = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = ramp(frame, 0, 14, easeOut) - ramp(frame, durationInFrames - 12, 12, easeIn);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 976,
        height: 84,
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(#10306b, #081a3d)",
        borderTop: "4px solid #f5c400",
        translate: `0 ${(1 - enter) * 120}px`,
      }}
    >
      <Text
        text="NEWS"
        textStyle={{ ...newsLabel, fontSize: 38, letterSpacing: { em: 0.1 } }}
        background={{ paint: linearGradient(["#ff3030", "#b00010"], { scope: "block" }), padding: [30, 20] }}
        style={{ zIndex: 1, margin: "0 30px" }}
      />
      <div style={{ position: "relative", flex: 1, height: "100%", overflow: "hidden" }}>
        <Text
          text={TICKER}
          textStyle={{ ...newsLabel, fontSize: 40 }}
          wrap="none"
          anchor="left"
          style={{ position: "absolute", top: "50%", left: 1700 - frame * 9 }}
        />
      </div>
    </div>
  );
};

export const News = () => (
  <AbsoluteFill>
    <Background from="#1f2a38" to="#4b6584" />
    <BreakingBar />
    <LiveBadge />
    <Location />
    <Sequence from={60} durationInFrames={130} layout="none">
      <Interview />
    </Sequence>
    <Ticker />
  </AbsoluteFill>
);
