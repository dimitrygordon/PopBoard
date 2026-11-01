// Physics 101, M1 L4 "Graphing Data": deck, art, Test it scenes, and zagan narration (Tesla-cleared outline).
import { lessonTests } from "./physics101-lesson-common.mjs";
lessonTests({ slug: "m01-l04", pages: 18, testIt: [1, 4, 5, 6, 7, 8, 10, 11, 13, 14], audio: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("M01-L04 Socrates' edits: slope rounding and the 49 g example without the editorial note", () => {
  const S = JSON.parse(readFileSync(new URL("../public/physics101/decks/m01-l04/v2/story.json", import.meta.url))).slides;
  assert.match(S["8"].text, /Rounded, that's about 0\.08 centimeters per gram/);
  assert.match(S["13"].text, /it stretched about 3\.9 centimeters\.<\/p>/);
  assert.doesNotMatch(S["13"].text, /Note:/);
});
