// Physics 101 Study Questions: every lesson has extra practice with answers, linked from its storybook.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
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
        const img = b.eq || b.fig; if (img) assert.match(img, /^data:image\/webp;base64,[A-Za-z0-9+/]{40}/, it.id);
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
  assert.match(h, /<div class="lib-filter-row">\s*<a class="pq-btn" id="pqBtn" href="study-physics101-questions\.html">Practice Questions <svg[^]*?<\/a>\s*(?:<button type="button" class="pq-btn cq-open" id="cqBtn"[^]*?<\/button>\s*)?<div class="lib-filters"/);
  const css = read("physics101/sq-page.css");
  assert.match(css, /@media \(max-width: 600px\) \{ \.lib-filter-row \{ flex-direction: column/);
  const lib = read("study-physics101-questions.html");
  for (const id of ["sqQ", "sqMods", "sqLessons", "sqChips", "sqList"]) assert.match(lib, new RegExp(`id="${id}"`));
  const idx = JSON.parse(read("physics101/sq/index.json"));
  assert.equal(Object.keys(idx).length, 74); // 73 lessons + math-skills
});

const PACK = new Map();
const packs = (id) => { const m = id.slice(id.startsWith("mq") ? 2 : 3, id.indexOf("-")); if (!PACK.has(m)) PACK.set(m, JSON.parse(read(`physics101/sq/art/${m === "ms" ? "ms" : "m" + m}.json`))); return PACK.get(m); };

test("Study Questions assets stay packed: public/ under Cloudflare Pages' 20,000-file cap", () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(join(d, e.name)) : 1), 0);
  const n = walk(PUB); assert.ok(n < 19000, `${n} files under public/`);
  assert.deepEqual(readdirSync(join(PUB, "physics101/sq/art")).filter((f) => !/^(index|m\d\d|ms)\.json$/.test(f)), []);
  // only images a rich page links to directly stay loose
  assert.deepEqual(readdirSync(join(PUB, "physics101/sq/img")), ["mq-01-e14.webp"]);
  for (const f of readdirSync(join(PUB, "physics101/sq/art"))) assert.ok(statSync(join(PUB, "physics101/sq/art", f)).size < 20e6, f);
});

test("Leo's M2 to M24 art plus Math Skills, opener and wrap-up packs are wired for problems that exist", () => {
  const art = JSON.parse(read("physics101/sq/art/index.json"));
  const ids = Object.keys(art);
  assert.equal(ids.length, 3418);
  const where = new Map([...DECKS.map((d) => d.slug), "math-skills"].flatMap((s) => JSON.parse(read(`physics101/sq/${s}.json`)).items.map((i) => [i.id, i.where])));
  const all = new Set(where.keys());
  const n = { opener: 0, wrap: 0, math: 0, lesson: 0 };
  for (const id of ids) n[where.get(id)]++;
  assert.deepEqual(n, { opener: 104, wrap: 182, math: 88, lesson: 3044 });
  for (const id of ids) {
    assert.match(id, /^(mq|sol)(0[1-9]|1\d|2[0-4]|ms)-/);
    assert.ok(all.has(id), id);
    const svg = packs(id)[id];
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

test("tapping a question expands its worked solution, on Study Questions cards and Read this page examples", () => {
  const core = read("physics101/sq-core.js");
  assert.match(core, /export function bindWorked\(head, box/);
  assert.match(core, /setAttribute\("aria-expanded"/);
  assert.match(core, /box\.hidden = true/);
  assert.match(core, /bindWorked\(el\.querySelector\("\.sq-pin"\), ol\)/);
  assert.match(core, /if \(reduceMotion\(\)\) \{ steps\.forEach\(reveal\)/);
  // Socrates walkthroughs are not written: an empty step list shows a marked placeholder, never invented prose
  assert.match(core, /PLACEHOLDER: step-by-step walkthrough to come\./);
  const w = read("physics101/worked.js");
  assert.match(w, /Example Problem/);
  assert.match(w, /\^Step \[a-z\]\+/);
  assert.match(w, /bindWorked\(pin, ol\)/);
  assert.match(w, /Show answer/);
  assert.match(read("physics101/sq-tab.js"), /watchReadText\(\$\("readText"\)\)/);
  assert.match(read("physics101/sq-page.css"), /\.sq-expand \{[^}]*min-height: 44px/);
});
