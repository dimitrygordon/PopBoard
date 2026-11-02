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

test("module openers sit in each module's first lesson, wrap-ups in its last (Dimitry approved)", () => {
  const mods = new Map();
  for (const d of DECKS) mods.set(d.q, [...(mods.get(d.q) || []), d]);
  let open = 0, wrap = 0;
  for (const ls of mods.values()) {
    const lo = Math.min(...ls.map((d) => d.lesson)), hi = Math.max(...ls.map((d) => d.lesson));
    for (const d of ls) {
      const items = JSON.parse(read(`physics101/sq/${d.slug}.json`)).items;
      for (const it of items) {
        assert.ok(["opener", "lesson", "wrap"].includes(it.where), it.id);
        if (it.where === "opener") { open++; assert.equal(d.lesson, lo, it.id); }
        if (it.where === "wrap") { wrap++; assert.equal(d.lesson, hi, it.id); }
      }
      // within each set, openers lead the lesson and wrap-ups close it
      const w = items.map((i) => i.where);
      const rank = { opener: 0, lesson: 1, wrap: 2 };
      for (let i = 1; i < w.length; i++) if (items[i].src === items[i - 1].src) assert.ok(rank[w[i - 1]] <= rank[w[i]], `${d.slug} order`);
    }
  }
  assert.equal(open, 104); assert.equal(wrap, 182);
});

test("Math Skill Handbook is a course-level Math Skills set in the tab picker and the library", () => {
  const data = JSON.parse(read("physics101/sq/math-skills.json"));
  assert.equal(data.slug, "math-skills");
  assert.equal(data.items.length, 88);
  for (const it of data.items) { assert.equal(it.where, "math"); assert.ok(it.answer.length > 0, it.id); }
  assert.doesNotMatch(JSON.stringify(data), /\u2014|\[NEEDS SOURCE\]/);
  assert.ok(JSON.parse(read("physics101/sq/index.json"))["math-skills"]);
  assert.match(read("physics101/sq-core.js"), /MATH = \{ slug: "math-skills", title: "Math Skills"/);
  assert.match(read("physics101/sq-tab.js"), /<optgroup label="Course"><option value="\$\{MATH\.slug\}">/);
  const page = read("physics101/sq-page.js");
  assert.match(page, /href="\?lesson=\$\{MATH\.slug\}"/);
  assert.match(page, /lessonSlug === MATH\.slug/);
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
  assert.equal(Object.keys(idx).length, 74); // 73 lessons + math-skills
});

test("Leo's M2 to M24 art is wired for problems that exist", () => {
  const art = JSON.parse(read("physics101/sq/art/index.json"));
  const ids = Object.keys(art);
  assert.equal(ids.length, 3044);
  const all = new Set(DECKS.flatMap((d) => JSON.parse(read(`physics101/sq/${d.slug}.json`)).items.map((i) => i.id)));
  for (const id of ids) {
    assert.match(id, /^(mq|sol)(0[2-9]|1\d|2[0-4])-/);
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
