import { describe, expect, test } from "bun:test";
import {
  checkedCharacters,
  classifyFontIssues,
  type FaceInfo,
  FontIssueError,
  fontUses,
  type GlyphTest,
  parseUnicodeRange,
} from "../src/fontCheck";
import { fontStack } from "../src/layout/measure";

const face = (family: string, overrides: Partial<FaceInfo> = {}): FaceInfo => ({
  family,
  weight: "400",
  style: "normal",
  status: "loaded",
  unicodeRange: "U+0-10FFFF",
  ...overrides,
});

/** Glyph test from a table of the characters each family has. */
function glyphs(table: Record<string, string>): GlyphTest {
  return (_use, families, char) => families.some((family) => table[family]?.includes(char));
}

describe("fontStack", () => {
  test("unquotes names and marks generic families", () => {
    expect(fontStack('"Noto Sans JP", Montserrat, sans-serif')).toEqual([
      { name: "Noto Sans JP", generic: false },
      { name: "Montserrat", generic: false },
      { name: "sans-serif", generic: true },
    ]);
  });

  test("a quoted generic name is a font name", () => {
    expect(fontStack(['"serif"'])).toEqual([{ name: "serif", generic: false }]);
  });
});

describe("parseUnicodeRange", () => {
  test("single code points, ranges and wildcards", () => {
    expect(parseUnicodeRange("U+0-FF, U+131, u+4??")).toEqual([
      [0, 0xff],
      [0x131, 0x131],
      [0x400, 0x4ff],
    ]);
  });

  test("ignores malformed tokens", () => {
    expect(parseUnicodeRange("U+zz, , U+30-39")).toEqual([[0x30, 0x39]]);
  });
});

describe("checkedCharacters", () => {
  test("skips whitespace, controls, joiners and marks, and dedupes", () => {
    expect(checkedCharacters("あ い\n‍あ️👍")).toEqual(["あ", "い", "👍"]);
  });
});

describe("fontUses", () => {
  test("groups runs by font and collects their characters", () => {
    const uses = fontUses({
      text: ["テロップ", { text: "強調", style: { fontWeight: 900 } }, "です"],
      style: { fontFamily: "Noto Sans JP, sans-serif" },
    });
    expect(uses).toHaveLength(2);
    expect(uses[0]).toMatchObject({ families: ["Noto Sans JP"], generic: true, text: "テロップです" });
    expect(uses[1]).toMatchObject({ weight: 900, text: "強調" });
  });
});

describe("classifyFontIssues", () => {
  const use = (fontFamily: string, text = "テロップ", fontWeight: number | "normal" | "bolder" = "normal") =>
    fontUses({ text, style: { fontFamily, fontWeight } });

  test("no issues when the declared face has every character", () => {
    expect(
      classifyFontIssues(use("Noto Sans JP"), [face("Noto Sans JP")], glyphs({ "Noto Sans JP": "テロップ" })),
    ).toEqual([]);
  });

  test("an undeclared family that isn't installed", () => {
    const issues = classifyFontIssues(use("Noto Sans JP"), [], glyphs({}));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "family-not-found", family: "Noto Sans JP" });
  });

  test("an undeclared family that is installed is fine, even without the text's characters", () => {
    const issues = classifyFontIssues(
      use("Arial, Noto Sans JP"),
      [face("Noto Sans JP")],
      glyphs({ Arial: "Aa0", "Noto Sans JP": "テロップ" }),
    );
    expect(issues).toEqual([]);
  });

  test("a missing weight", () => {
    const issues = classifyFontIssues(
      use("Noto Sans JP", "テロップ", 900),
      [face("Noto Sans JP")],
      glyphs({ "Noto Sans JP": "テロップ" }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "face-unavailable", weight: 900, style: "normal" });
  });

  test("weight ranges of variable faces and relative weights", () => {
    const has = glyphs({ "Noto Sans JP": "テロップ" });
    expect(
      classifyFontIssues(use("Noto Sans JP", "テロップ", 900), [face("Noto Sans JP", { weight: "100 900" })], has),
    ).toEqual([]);
    expect(classifyFontIssues(use("Noto Sans JP", "テロップ", "bolder"), [face("Noto Sans JP")], has)).toEqual([]);
  });

  test("a missing italic face", () => {
    const uses = fontUses({ text: "Caption", style: { fontFamily: "Montserrat", fontStyle: "italic" } });
    const issues = classifyFontIssues(uses, [face("Montserrat")], glyphs({ Montserrat: "Caption" }));
    expect(issues[0]).toMatchObject({ type: "face-unavailable", style: "italic" });
  });

  test("faces outside the text's characters don't count", () => {
    const faces = [
      face("Noto Sans JP", { unicodeRange: "U+0-7F", status: "error", weight: "900" }),
      face("Noto Sans JP", { unicodeRange: "U+3000-30FF" }),
    ];
    expect(classifyFontIssues(use("Noto Sans JP"), faces, glyphs({ "Noto Sans JP": "テロップ" }))).toEqual([]);
  });

  test("a face that failed to load", () => {
    const faces = [face("Noto Sans JP", { status: "error" })];
    const issues = classifyFontIssues(use("Noto Sans JP"), faces, glyphs({}));
    expect(issues.map((issue) => issue.type)).toEqual(["load-failed"]);
  });

  test("characters no font in the stack has", () => {
    const issues = classifyFontIssues(
      use("Montserrat, Noto Sans JP", "Go! テロップ👍"),
      [face("Montserrat"), face("Noto Sans JP")],
      glyphs({ Montserrat: "Go!", "Noto Sans JP": "テロップ" }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "missing-glyphs", characters: "👍" });
  });

  test("a generic family accepts the fallback", () => {
    const issues = classifyFontIssues(
      use("Noto Sans JP, sans-serif", "テロップ👍"),
      [face("Noto Sans JP")],
      glyphs({ "Noto Sans JP": "テロップ" }),
    );
    expect(issues).toEqual([]);
  });

  test("a family that isn't there is reported once", () => {
    const uses = fontUses({
      text: ["テロップ", { text: "強調", style: { fontWeight: 900 } }],
      style: { fontFamily: "Noto Sans JP" },
    });
    expect(classifyFontIssues(uses, [], glyphs({})).map((issue) => issue.type)).toEqual(["family-not-found"]);
  });

  test("family names match case-insensitively and quoted", () => {
    const issues = classifyFontIssues(
      use("noto sans jp"),
      [face('"Noto Sans JP"')],
      glyphs({ "noto sans jp": "テロップ" }),
    );
    expect(issues).toEqual([]);
  });

  test("whitespace-only text has nothing to check", () => {
    expect(classifyFontIssues(use("Noto Sans JP", "  \n"), [], glyphs({}))).toEqual([]);
  });
});

describe("FontIssueError", () => {
  test("lists every issue in its message", () => {
    const issues = classifyFontIssues(fontUses({ text: "あ", style: { fontFamily: "A, B" } }), [], glyphs({}));
    const error = new FontIssueError(issues);
    expect(error.issues).toHaveLength(2);
    expect(error.message.split("\n")).toHaveLength(2);
    expect(error).toBeInstanceOf(Error);
  });
});
