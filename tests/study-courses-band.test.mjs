// Study library: the Courses band (Astronomy Course, Physics 101) sits above the module search.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const html = readFileSync(join(PUB, "study.html"), "utf8");

test("Courses band comes before the search box and the module grid", () => {
  const band = html.indexOf('id="coursesBand"');
  assert.ok(band > 0);
  assert.ok(band < html.indexOf('id="searchInput"'));
  assert.ok(band < html.indexOf('id="cardGrid"'));
  assert.match(html, /<h2 id="coursesHeading">Courses<\/h2>/);
});

test("Courses band links both course libraries with existing cover art", () => {
  assert.match(html, /href="study-astronomy-course\.html"/);
  assert.match(html, /href="study-physics101\.html"/);
  for (const src of html.matchAll(/class="course-card[^]*?<img src="([^"]+)"/g)) {
    assert.ok(existsSync(join(PUB, src[1])), src[1]);
  }
});

test("module grid skips the two courses; other modules stay", () => {
  assert.match(html, /var COURSE_IDS = \["astronomy-course", "physics101"\];/);
  assert.match(html, /BUILTIN_MODULES\.filter\(function\(m\) \{ return COURSE_IDS\.indexOf\(m\.id\) === -1; \}\)/);
});

test("Physics 101 accent dots match p101.css module accents", () => {
  const css = readFileSync(join(PUB, "physics101/p101.css"), "utf8");
  const fromCss = [...css.matchAll(/--p101-m(\d+): (#[0-9A-Fa-f]{6})/g)].map((m) => m[2]);
  const fromHtml = JSON.parse(html.match(/var P101_ACCENTS = (\[[^\]]+\])/)[1]);
  assert.equal(fromHtml.length, 24);
  assert.deepEqual(fromHtml, fromCss);
});
