// Physics 101 Study Questions: every lesson has extra practice with answers, linked from its storybook.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (p) => readFileSync(join(PUB, p), "utf8");
const read_ = read;

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

test("storybook tab row is Read this page | Study Questions | Test it, with a lesson picker and a pencil doorway", () => {
  const h = read("study-physics101-story.html");
  const i = (id) => h.indexOf(`id="${id}"`);
  assert.ok(i("tabRead") > 0 && i("tabRead") < i("tabSq") && i("tabSq") < i("tabTest"));
  assert.match(h, /id="tabSq"[^>]*>Study Questions</);
  assert.match(h, /id="sqPick"/);
  assert.match(h, /id="sqDoor"[^>]*aria-label="Study Questions for this lesson"/);
  assert.match(h, /src="physics101\/sq-tab\.js"/);
  // reading stays pristine: problem cards render only into the Study Questions pane
  const readPane = h.slice(h.indexOf('id="readBox"'), h.indexOf("</section>", h.indexOf('id="readBox"')));
  assert.doesNotMatch(readPane, /sq-|Study Questions/);
  assert.ok(i("sqList") > i("sqPane") && i("sqList") < i("readBox"));
  const tab = read_("physics101/sq-tab.js");
  assert.match(tab, /renderLesson\(\$\("sqList"\)/);
  assert.match(tab, /tab=sq|"tab", "sq"/);
});

test("Practice Questions pill sits just left of the module filters and opens the library", () => {
  const h = read("study-physics101.html");
  assert.match(h, /<div class="lib-filter-row">\s*<a class="pq-btn" id="pqBtn" href="study-physics101-questions\.html">Practice Questions <svg[^]*?<\/a>\s*<div class="lib-filters"/);
  const css = read("physics101/sq-page.css");
  assert.match(css, /@media \(max-width: 600px\) \{ \.lib-filter-row \{ flex-direction: column/);
  const lib = read("study-physics101-questions.html");
  for (const id of ["sqQ", "sqMods", "sqLessons", "sqChips", "sqList"]) assert.match(lib, new RegExp(`id="${id}"`));
  const idx = JSON.parse(read("physics101/sq/index.json"));
  assert.equal(Object.keys(idx).length, 73);
});

test("Leo's M2 to M6 art is wired for problems that exist, and M7 to M24 art is held", () => {
  const art = JSON.parse(read("physics101/sq/art/index.json"));
  const ids = Object.keys(art);
  assert.equal(ids.length, 622);
  const all = new Set(DECKS.flatMap((d) => JSON.parse(read(`physics101/sq/${d.slug}.json`)).items.map((i) => i.id)));
  for (const id of ids) {
    assert.match(id, /^(mq|sol)0[2-6]-/);
    assert.ok(all.has(id), id);
    const svg = read(`physics101/sq/art/${id}.svg`);
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /\u2014|\[NEEDS SOURCE\]|Flags for Tesla/);
    if (art[id].drag) assert.match(svg, /class="sq-obj"/, id);
  }
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
