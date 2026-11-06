// Dimitry's DIY PBL Bookshare: page list, title, cover, script, no audio, no em-dashes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const DIR = join(PUB, "diy-pbl-bookshare");
const TITLE = "Dimitry's DIY Project Based Learning for Math and Science Bookshare";
const { PAGES, PAGE_COUNT } = await import(pathToFileURL(join(DIR, "bs-pages.js")).href);
const { SLIDES } = await import(pathToFileURL(join(DIR, "bs-data.js")).href);
const files = ["bs-pages.js", "bs-engine.js", "bs-app.js", "bs.css", "bs-data.js", "script.md"]
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .concat(readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8"));

test("18 pages with titles, builds, guides, and teleprompter script", () => {
  assert.equal(PAGE_COUNT, 18);
  assert.equal(PAGES.length, 18);
  assert.equal(SLIDES.length, 18);
  for (const p of PAGES) {
    assert.ok(p.title);
    assert.equal(typeof p.build, "function");
    assert.ok(p.guide && p.guide.length > 5, p.title);
    assert.match(p.side, /bs-script/);
    assert.match(p.side, /Script \(read aloud\)/);
  }
});

test("canonical title appears in HTML, card, module, and page bar", () => {
  const html = readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8");
  const study = readFileSync(join(PUB, "study.html"), "utf8");
  assert.match(html, new RegExp(TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /id="flTitle"/);
  assert.match(study, new RegExp(TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(study, /data-course="diy-pbl-bookshare"/);
  assert.match(study, /diy-pbl-bookshare\/art\/cover\.webp/);
  assert.ok(existsSync(join(DIR, "art", "cover.webp")));
});

test("slide 1 shows the real book cover and author name", () => {
  assert.ok(existsSync(join(DIR, "art", "book_cover.webp")));
  const src = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.match(src, /book_cover\.webp/);
  assert.match(src, /Heather Wolpert-Gawron/);
  assert.match(src, /Eye On Education/);
  assert.equal(SLIDES[0].kind, "title");
  assert.match(src, /function buildTitle/);
});

test("no audio controls or narration player; hide text and full screen remain", () => {
  const html = readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8");
  const app = readFileSync(join(DIR, "bs-app.js"), "utf8");
  assert.ok(!html.includes('id="narrBtn"'));
  assert.ok(!html.includes('id="sayBtn"'));
  assert.match(html, /id="textBtn"/);
  assert.match(html, /id="fsBtn"/);
  assert.match(app, /fl-full/);
  assert.match(app, /requestFullscreen/);
  assert.ok(!app.includes("new Audio"));
  assert.ok(!app.includes(".mp3"));
});

test("narration manifest has text for every page and no audio files required", () => {
  const m = JSON.parse(readFileSync(join(DIR, "narration", "manifest.json"), "utf8"));
  assert.equal(Object.keys(m.pages).length, 18);
  for (let n = 1; n <= 18; n++) {
    const e = m.pages[String(n)];
    assert.ok(e.text.length > 20, `page ${n}`);
    assert.equal(e.audio, null);
    assert.ok(!e.text.includes("\u2014"), `page ${n} em-dash`);
  }
});

test("no em-dashes in bookshare module sources", () => {
  for (const s of files) assert.ok(!s.includes("\u2014"), "em-dash found");
});

test("script.md exists with all 18 slides", () => {
  const script = readFileSync(join(DIR, "script.md"), "utf8");
  assert.match(script, /Total words/);
  for (let n = 1; n <= 18; n++) assert.match(script, new RegExp(`## Slide ${n}:`));
});

test("player has auto-advance, reduced motion, and theme toggle", () => {
  const all = files.join("\n");
  assert.match(all, /prefers-reduced-motion/);
  assert.match(all, /popboard\.diy-pbl\.auto/);
  assert.match(all, /themeBtn/);
});
