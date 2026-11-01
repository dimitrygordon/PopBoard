// Physics 101 storybooks on the shared Astronomy Course engine: catalog, course registry, pages, and content rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";
import { DECKS as ASTRO } from "../public/astro-course/ac-catalog.js";
import { COURSES, courseId, themeKey, pageKey, standardsLine } from "../public/astro-course/ac-courses.js";
import { searchDeck } from "../public/astro-course/ac-render.js";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (f) => readFileSync(join(PUB, f), "utf8");

const LESSONS = {
  1: ["A Physics Toolkit", ["Methods of Science", "Mathematics and Physics", "Measurement", "Graphing Data"]],
  2: ["Representing Motion", ["Picturing Motion", "Where and When?", "Position-Time Graphs", "How Fast?"]],
  3: ["Accelerated Motion", ["Acceleration", "Motion with Constant Acceleration", "Free Fall"]],
  4: ["Forces in One Dimension", ["Force and Motion", "Weight and Drag Force", "Newton's Third Law"]],
  5: ["Displacement and Force in Two Dimensions", ["Vectors", "Friction", "Forces in Two Dimensions"]],
  6: ["Motion in Two Dimensions", ["Projectile Motion", "Circular Motion", "Relative Velocity"]]
};

test("catalog lists every module 1-6 lesson once, in course order, grouped by module", () => {
  const want = Object.entries(LESSONS).flatMap(([m, [, ls]]) => ls.map((t, i) => [+m, i + 1, t]));
  assert.equal(DECKS.length, want.length);
  DECKS.forEach((d, i) => {
    const [m, l, t] = want[i];
    assert.equal(d.title, t);
    assert.equal(d.q, m);
    assert.equal(d.lesson, l);
    assert.equal(d.module, LESSONS[m][0]);
    assert.equal(d.slug, `m${String(m).padStart(2, "0")}-l${String(l).padStart(2, "0")}`);
    assert.equal(d.key, d.slug.toUpperCase());
  });
  assert.equal(new Set(DECKS.map((d) => d.slug)).size, DECKS.length);
});

test("every lesson is a coming-soon placeholder with no lesson text yet", () => {
  for (const d of DECKS) {
    assert.equal(d.built, false, d.key);
    assert.equal(d.slides, 0, d.key);
    assert.deepEqual(d.pages, [], d.key);
    assert.ok(!existsSync(join(PUB, "physics101", "decks", d.slug)), "no deck folder yet for " + d.slug);
  }
});

test("course registry: Astronomy stays the default, Physics 101 has its own pages and keys", () => {
  assert.equal(courseId({ documentElement: { dataset: {} } }), "astronomy");
  assert.equal(courseId({ documentElement: { dataset: { course: "physics101" } } }), "physics101");
  assert.equal(courseId({ documentElement: { dataset: { course: "nope" } } }), "astronomy");
  const a = COURSES.astronomy, p = COURSES.physics101;
  // unchanged Astronomy keys, so saved pages and themes carry over
  assert.equal(themeKey(a), "popboard.astronomy-course.theme");
  assert.equal(pageKey(a, "d01"), "popboard.astronomy-course.page.d01");
  assert.equal(themeKey(p), "popboard.physics101.theme");
  assert.equal(pageKey(p, "m01-l01"), "popboard.physics101.page.m01-l01");
  assert.equal(p.param, "lesson");
  for (const c of [a, p]) for (const f of [c.library, c.story]) assert.ok(existsSync(join(PUB, f)), f);
  assert.equal(p.group(DECKS[0]), "Module 1");
  assert.equal(p.label(DECKS[0]), "Lesson 1");
  assert.equal(a.group(ASTRO[0]), "Q1");
  assert.equal(a.label(ASTRO[0]), "Deck 1");
});

test("library search finds lessons by title and module", () => {
  const hits = (q) => DECKS.filter((d) => searchDeck(d, q)).map((d) => d.slug);
  assert.deepEqual(hits("free fall"), ["m03-l03"]);
  assert.deepEqual(hits("Accelerated Motion"), ["m03-l01", "m03-l02", "m03-l03"]);
  assert.equal(hits("").length, DECKS.length);
  assert.deepEqual(hits("zzzz"), []);
});

test("pages name the course, reuse the engine, and have module filters", () => {
  const lib = read("study-physics101.html"), story = read("study-physics101-story.html");
  for (const h of [lib, story]) {
    assert.match(h, /<html[^>]*data-course="physics101"/);
    assert.match(h, /popboard\.physics101\.theme/);
    assert.match(h, /name="viewport"/);
    assert.match(h, /astro-course\/ac-theme\.css/);
    assert.match(h, /physics101\/p101\.css/);
  }
  assert.match(lib, /src="astro-course\/ac-library-ui\.js"/);
  assert.match(story, /src="astro-course\/ac-story\.js"/);
  for (let m = 1; m <= 6; m++) assert.match(lib, new RegExp(`data-q="${m}"`));
  assert.match(lib, /id="q" type="search"/);
  // one engine: no forked reader or library under physics101/
  assert.deepEqual(readdirSync(join(PUB, "physics101")).filter((f) => f.endsWith(".js")), ["p101-catalog.js"]);
});

test("Study library links to Physics 101 next to the Astronomy Course", () => {
  const study = read("study.html");
  const a = study.indexOf('file: "study-astronomy-course.html"'), p = study.indexOf('file: "study-physics101.html"');
  assert.ok(a > 0 && p > a);
});

test("Physics 101 files: no em-dashes, no mascot, no Firebase", () => {
  const files = ["study-physics101.html", "study-physics101-story.html", "physics101/p101-catalog.js", "physics101/p101.css", "astro-course/ac-courses.js"];
  for (const f of files) {
    const src = read(f);
    assert.ok(!src.includes("\u2014"), "em-dash in " + f);
    assert.ok(!/jasper/i.test(src), "mascot in " + f);
    assert.ok(!/firebase/i.test(src), "firebase in " + f);
  }
});

test("standards line: codes joined with a middle dot, empty when none, shown under the cover title", () => {
  assert.equal(standardsLine({ standards: ["PH.1.2", "PH.1.3"] }), "PH.1.2 \u00b7 PH.1.3");
  assert.equal(standardsLine({ standards: [" PH.1.2 ", ""] }), "PH.1.2");
  assert.equal(standardsLine({ standards: [] }), "");
  assert.equal(standardsLine({}), "");
  for (const d of DECKS) assert.ok(Array.isArray(d.standards), d.key);
  const lib = read("astro-course/ac-library-ui.js"), story = read("astro-course/ac-story.js"), css = read("physics101/p101.css");
  assert.match(lib, /<h2>\$\{esc\(d\.title\)\}<\/h2>\$\{standardsLine\(d\)/);
  assert.match(story, /<h2>\$\{esc\(meta\.title\)\}<\/h2>\$\{standardsLine\(meta\)/);
  assert.match(css, /\.stds[^{]*\{[^}]*--ac-note-font/);
});

test("library strips: short M# \u00b7 L# label, one color variable per module", () => {
  const p = COURSES.physics101;
  assert.equal(p.strip(DECKS[5]), "M2 \u00b7 L2");
  assert.equal(p.group(DECKS[5]) + " \u00b7 " + p.label(DECKS[5]), "Module 2 \u00b7 Lesson 2");
  assert.equal(COURSES.astronomy.strip, null);
  const css = read("physics101/p101.css");
  assert.match(css, /--p101-m1:\s*#E2B654/i);
  for (let m = 1; m <= 6; m++) assert.match(css, new RegExp(`data-q="${m}"\\] \\.strip \\{ background: var\\(--p101-m${m}\\)`));
});
