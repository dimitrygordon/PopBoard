// Physics 101, M1 L2 "Mathematics and Physics": deck, art, Test it scenes. zagan narration (Tesla-cleared).
import { lessonTests } from "./physics101-lesson-common.mjs";
lessonTests({ slug: "m01-l02", pages: 11, testIt: [1, 5, 6, 7, 8, 9, 10, 11], buttonOnly: [7, 10], audio: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("M01-L02 p11 ends on Socrates' edit, with no editorial note", () => {
  const t = JSON.parse(readFileSync(new URL("../public/physics101/decks/m01-l02/v2/story.json", import.meta.url))).slides["11"].text;
  assert.match(t, /Our answer can't be more precise than our least-precise measurement\.<\/p>/);
  assert.doesNotMatch(t, /96\.4\.\.\.|Note:/);
});
