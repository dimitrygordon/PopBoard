// Physics 101 Study Questions: every lesson has extra practice with answers, linked from its storybook.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (p) => readFileSync(join(PUB, p), "utf8");

test("every Physics 101 lesson has Study Questions, and every problem has an answer", () => {
  assert.equal(DECKS.length, 73);
  for (const d of DECKS) {
    const f = `physics101/sq/${d.slug}.json`;
    assert.ok(existsSync(join(PUB, f)), f);
    const data = JSON.parse(read(f));
    assert.equal(data.slug, d.slug);
    assert.ok(data.items.length > 0, d.slug);
    for (const it of data.items) {
      assert.ok(it.answer.length > 0, it.id);
      assert.match(it.src, /^(mq|sol)$/);
      for (const b of [...it.question, ...it.answer, ...it.check, ...it.steps.flatMap((s) => s.body)]) {
        const img = b.eq || b.fig; if (img) assert.ok(existsSync(join(PUB, "physics101/sq", img)), img);
      }
    }
  }
});

test("Study Questions data has no em-dashes or review flags", () => {
  for (const d of DECKS) {
    const t = read(`physics101/sq/${d.slug}.json`);
    assert.doesNotMatch(t, /\u2014|\[NEEDS SOURCE\]|Flags for Tesla/, d.slug);
  }
});

test("held sets stay unwired: no opener, wrap-up, or Math Skill Handbook items", () => {
  for (const d of DECKS) assert.doesNotMatch(read(`physics101/sq/${d.slug}.json`), /"title":"(Module Opener|Module Wrap-Up|Math Skill Handbook)/i, d.slug);
});

test("the storybook links to this lesson's Study Questions", () => {
  const h = read("study-physics101-story.html");
  assert.match(h, /id="sqLink"[^>]*href="study-physics101-questions\.html"/);
  assert.match(h, /getElementById\("sqLink"\)\.href = "study-physics101-questions\.html\?"/);
  assert.ok(existsSync(join(PUB, "study-physics101-questions.html")));
});

test("answers sit behind a scribble that is erased, and reduced motion is honored", () => {
  const js = read("physics101/sq-page.js");
  assert.match(js, /Show answer/);
  assert.match(js, /sq-cover/);
  assert.match(js, /reduceMotion\(\)/);
  assert.match(js, /soundOn = false/);
});

test("Leo's Module 1 Lesson 4 page is wired for its problem", () => {
  const rich = JSON.parse(read("physics101/sq/rich/index.json"));
  assert.ok(rich["mq01-40"]);
  const ids = JSON.parse(read("physics101/sq/m01-l04.json")).items.map((i) => i.id);
  assert.ok(ids.includes("mq01-40"));
  for (const f of ["body.html", "leo.css", "leo.js", "bg.webp"]) assert.ok(existsSync(join(PUB, "physics101/sq/rich/mq01-40", f)), f);
  const body = read("physics101/sq/rich/mq01-40/body.html");
  assert.match(body, /id="reveal"/);
  assert.match(body, /id="play"/);
  assert.doesNotMatch(body, /\u2014/);
});
