// Physics 101 Study Questions: every shipped item shows its question, taken from the source PDFs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SQ = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "physics101", "sq");
const lessons = readdirSync(SQ).filter((f) => f.endsWith(".json") && f !== "index.json").map((f) => JSON.parse(readFileSync(join(SQ, f), "utf8")));
const items = lessons.flatMap((l) => l.items);
const text = (h) => h.replace(/<[^>]+>/g, "").trim();
// Source headings that are only a label (e.g. "2. Claim.", "Logarithms, #1") with no stem anywhere in the source PDFs.
const NO_STEM_IN_SOURCE = new Set("mq01-47 sol01-47 mq02-81 sol02-75 mq06-66 sol06-66 sol09-23 sol09-30 sol10-26 sol11-49 mq13-44 sol15-1 sol17-49 sol17-50 sol21-2 sol21-40 sol23-55 sol23-56 mq23-38 sol23-37 mq23-64 sol23-62 solms-41 solms-42 solms-43 sol19-96 mq19-97 sol19-97".split(" "));
// sol19-96, mq19-97, sol19-97: the source prints only "Challenge N." and then the solution; that prose sits behind Show answer (Dimitry, Nov 2026)
const LABEL_ONLY = /^[A-Za-z &,.()\-]*\d+[a-z]?(, #\d+)?\)?[.:]?$/;

test("no item has an empty prompt", () => {
  assert.ok(items.length > 3000);
  const empty = items.filter((it) => {
    if (NO_STEM_IN_SOURCE.has(it.id)) return false;
    const q = it.question.map((b) => (b.html ? text(b.html) : b.eq || b.fig ? "[img]" : "")).join(" ").trim();
    const t = it.title.trim();
    return !q && (t.length < 20 || LABEL_ONLY.test(t));
  });
  assert.deepEqual(empty.map((it) => it.id), []);
});

test("no title is the tail of a wrapped question (starts lowercase)", () => {
  assert.deepEqual(items.filter((it) => /^[a-z]/.test(it.title)).map((it) => it.id), []);
});

test("known wrapped stems are whole", () => {
  const byId = Object.fromEntries(items.map((it) => [it.id, it]));
  assert.match(byId["mq03-35"].title, /^Lesson 2, Calculate \(Figure 12\): A cart's velocity-time graph .* between these times\?$/);
  assert.match(byId["mq03-39"].title, /A marble rolls up .*\(c\) Describe the motion\.$/);
});

test("shipped Study Questions text has no em-dashes", () => {
  for (const f of readdirSync(SQ).filter((f) => f.endsWith(".json"))) assert.ok(!readFileSync(join(SQ, f), "utf8").includes("\u2014"), f);
});

test("question text carries no worked-solution markers (solutions stay behind Show answer)", () => {
  const MARK = /(?:^|[\s.])(What we know|Physics idea|Work|Check|Known|Unknown|Strategy|Solve|Claim|Evidence|Reasoning|What we read|Answer)( \([^()]{0,80}\))?[.:](\s|$)/;
  const bad = items.filter((it) => it.question.some((b) => b.html && MARK.test(text(b.html)))).map((it) => it.id);
  assert.deepEqual(bad, []);
});

test("a lettered part in the question is only its question, not its reasoning", () => {
  const bad = items.filter((it) => it.question.some((b) => b.html && /^<b>\([a-z]\) <\/b>/.test(b.html) && /\?\s+\S/.test(text(b.html)))).map((it) => it.id);
  assert.deepEqual(bad, []);
});

test("mq02-42 part (b) keeps its full source wording", () => {
  const it = items.find((x) => x.id === "mq02-42");
  assert.ok(it.question.some((b) => b.html === "<b>(b) </b>Does Tess ever catch up with Rosa on the trail?"));
  assert.ok(it.steps.flatMap((s) => s.body).some((b) => b.html && text(b.html).endsWith("smaller than Rosa's (5.0 km/h) and she starts later, so the gap keeps growing.")));
});

test("mq02-42 heading uses Leo's colon form", () => {
  const want = "Lesson 3, Problem 19 (Challenge): Rosa and Tess hike the same trail: Rosa's graph runs from (0, 0) to (1.60 h, 8.0 km); Tess's graph runs from (0.25 h, 0) to (2.75 h, 8.0 km).";
  assert.equal(items.find((x) => x.id === "mq02-42").title, want);
  const ix = JSON.parse(readFileSync(join(SQ, "index.json"), "utf8"));
  assert.equal(Object.values(ix).flatMap((v) => v.t).find((t) => t[0] === "mq02-42")[1], want);
});

test("worked tables sit behind Show answer; given tables stay in the question", () => {
  // these tables are rows of html blocks; worked ones open the card's Work section, given ones stay in the question
  for (const id of ["mq04-41", "sol19-84"]) {
    const it = items.find((x) => x.id === id);
    assert.equal(it.question.length, 0, id);
    assert.equal(it.steps[0].label, "Work", id);
  }
  for (const id of ["mq01-21", "mq01-32", "mq02-33", "mq11-64", "sol11-58", "mq13-20"]) assert.ok(items.find((x) => x.id === id).question.length > 0, id);
});

test("mq02-42 shows Leo's pencil graph with a dark-mode twin", () => {
  const f = items.find((x) => x.id === "mq02-42").question[0];
  assert.ok(f.fig.startsWith("data:image/webp") && f.dark.startsWith("data:image/webp") && f.fig !== f.dark);
});

test("solution steps lost in extraction are restored from the source", () => {
  const get = (id) => items.find((x) => x.id === id);
  for (const id of ["sol04-40", "sol06-18", "mq06-18"]) assert.equal(get(id).steps[0].label, "Work", id);
  assert.equal(get("mq06-18").question.length, 1);
  for (const id of ["mq03-88", "sol03-71"]) assert.deepEqual(get(id).steps.map((s) => s.label), ["Physics idea", "Work"], id);
  for (const id of ["mq06-57", "sol06-57", "mq06-58", "sol06-58"]) assert.match(get(id).steps[0].body[0].alt, /𝜃 = tan⁻¹/, id);
});
