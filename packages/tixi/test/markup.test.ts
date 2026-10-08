import { describe, expect, test } from "bun:test";
import { parseMarkup } from "../src/markup";

describe("parseMarkup", () => {
  test("splits text into styled runs", () => {
    expect(parseMarkup("今日は<em>最高</em>の日", { em: { fontSize: 96 } })).toEqual([
      { text: "今日は" },
      { text: "最高", style: { fontSize: 96 }, tags: ["em"] },
      { text: "の日" },
    ]);
  });

  test("nests tags with inner styles winning and layer patches merged", () => {
    const runs = parseMarkup("<a>x<b>y</b></a>", {
      a: { fontSize: 10, layers: { 0: { paint: "red", stroke: 2 } } },
      b: { fontSize: 20, layers: { 0: { paint: "blue" } } },
    });
    expect(runs[1]).toEqual({
      text: "y",
      style: { fontSize: 20, layers: { 0: { paint: "blue", stroke: 2 } } },
      tags: ["a", "b"],
    });
  });

  test("keeps unknown tags for glyphTransform and supports <br/> and entities", () => {
    expect(parseMarkup("<x>a</x><br/>&lt;b&gt; &amp;")).toEqual([
      { text: "a", tags: ["x"] },
      { text: "\n" },
      { text: "<b> &" },
    ]);
  });

  test("rejects unbalanced markup", () => {
    expect(() => parseMarkup("<a>x")).toThrow("unclosed");
    expect(() => parseMarkup("x</a>")).toThrow("unexpected closing");
  });
});
