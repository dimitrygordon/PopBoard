// Physics 101, M1 L1 "Methods of Science": the first built lesson. Deck, art layers, Test it scenes,
// narration, and Leo's checks (p02 formulas, p10 listeners, p15/p18 labels, p17 text slots).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";
import { COURSES } from "../public/astro-course/ac-courses.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public"), D = join(PUB, "physics101/decks/m01-l01");
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const deck = json(join(D, "deck.json")), story = json(join(D, "v2/story.json")), art = json(join(D, "v2/art.json"));
const narr = readFileSync(join(ROOT, "tools/physics101/narration/m01-l01.md"), "utf8");
const TEST_IT = [4, 5, 8, 9, 13, 15, 16, 17, 20];
const OUTLINE = "/workspace/physics101/outline/m01-l01_outline.md";

test("M1 L1 is built: 20 pages in the catalog, deck, story and art", () => {
  const m = DECKS.find((d) => d.slug === "m01-l01");
  assert.equal(m.built, true); assert.equal(m.slides, 20);
  assert.equal(deck.slides.length, 20); assert.deepEqual(deck.slides.map((s) => s.n), [...Array(20)].map((_, i) => i + 1));
  assert.equal(Object.keys(story.slides).length, 20); assert.equal(Object.keys(art).length, 20);
});

test("every page has its layers on disk; bg, mid and fg are full-page planes", () => {
  for (const [pn, ls] of Object.entries(art)) {
    assert.ok(ls.some((l) => l.id === "bg") && ls.some((l) => l.id === "mid"), pn);
    for (const l of ls) {
      assert.ok(existsSync(join(D, "v2/art", l.src)), l.src);
      if (l.hint) assert.ok(existsSync(join(D, "v2/art", l.hint)), l.hint);
      const [x0, y0, x1, y1] = l.box; assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1600 && y1 <= 900 && x1 > x0 && y1 > y0, l.src);
    }
  }
});

test("labels line up: the fg labels and cutouts move with the mid art (one parallax factor)", () => {
  for (const [pn, ls] of Object.entries(art)) {
    const mid = ls.find((l) => l.id === "mid").f;
    for (const l of ls.filter((l) => l.id === "fg" || l.cut)) assert.equal(l.f, mid, `${pn} ${l.id}`);
  }
  // p18: the F_g labels are in the fg plane over the arrows; p15: the atom labels ride on their cutouts
  assert.ok(art.p18.find((l) => l.id === "fg")); assert.equal(art.p15.filter((l) => /^cut-atom-/.test(l.id)).length, 3);
});

test("Leo's p02 and p10: chalkboard formulas stay as drawn, the three listeners stay in the art", () => {
  assert.ok(art.p02.find((l) => l.id === "fg"), "p02 formulas are the drawn fg layer, not retyped");
  assert.ok(!art.p02.some((l) => l.cut)); assert.ok(!art.p10.some((l) => l.cut), "p10 art is untouched");
  assert.match(narr, /like E equals m c squared\./); assert.doesNotMatch(narr, /I equals V over R/);
});

test("Test it on exactly the outline's sandbox pages, each with its scene module and gold touch outlines", () => {
  const pages = Object.entries(story.slides).filter(([, s]) => s.testIt).map(([n]) => +n).sort((a, b) => a - b);
  assert.deepEqual(pages, TEST_IT);
  assert.equal(COURSES.physics101.pageScenes, "physics101/scenes/");
  for (const n of TEST_IT) {
    const pn = "p" + String(n).padStart(2, "0"), f = join(PUB, "physics101/scenes/m01-l01", pn + ".js");
    assert.ok(existsSync(f), pn);
    const src = readFileSync(f, "utf8");
    assert.match(src, /export default function build\(ctx\)/, pn);
    for (const m of src.matchAll(/^import .* from "(.+)";$/gm)) assert.equal(m[1], "../kit.js", pn);
    const cuts = art[pn].filter((l) => l.cut);
    if (n !== 13) assert.match(src, /art\.touchable\(/, pn); // p13 runs on buttons only
    for (const c of cuts) assert.ok(c.hint, `${pn} ${c.id} has a touch outline`);
  }
  // the outlines are recolored to the gold pencil #E2B654 when the art is built
  assert.match(readFileSync(join(ROOT, "tools/physics101/build-lesson.py"), "utf8"), /GOLD = \(0xE2, 0xB6, 0x54\)/);
});

test("p17: four Figure 6 slots, verbatim, one font size that was measured to fit, inside the drawn frames", () => {
  const items = deck.slides[16].items;
  assert.equal(items.length, 4);
  const fit = json(join(ROOT, "tools/physics101/fit.json"))["m01-l01"].p17;
  const frames = [[555, 44, 1312, 191], [555, 262, 1312, 403], [555, 473, 1312, 614], [555, 684, 1312, 828]];
  items.forEach((it, i) => {
    assert.equal(it.p[0].r[0].sz, fit);
    const [x, y, w, h] = it.box, f = frames[i];
    assert.ok(x * 16 >= f[0] && y * 9 >= f[1] && (x + w) * 16 <= f[2] + 0.1 && (y + h) * 9 <= f[3] + 0.1, "slot " + (i + 1));
  });
  assert.match(items[2].p[0].r[0].x, /^Newton provided an explanation for why objects fall\./);
  assert.match(story.slides["17"].text, /class="p101-slots"/, "phones get the slots in the read panel too");
});

test("read panel: title, definition, read-aloud; no unsolved Check Your Progress problems in the storybook", () => {
  for (const [n, s] of Object.entries(story.slides)) {
    assert.match(s.text, /^<h3>.+<\/h3><p class="p101-def">/, n);
    assert.doesNotMatch(s.text, /p101-problem|data-problem|Check Your Progress/, n);
    assert.doesNotMatch(s.text, /Summarize the steps|Define the term hypothesis/, "no question text yet");
  }
});

test("outline wording is used exactly (when the outline is on this machine)", { skip: !existsSync(OUTLINE) }, () => {
  const md = readFileSync(OUTLINE, "utf8");
  for (const m of md.matchAll(/^## Page (\d+): (.+)\n[\s\S]*?\*\*Read-aloud text:\*\*\s*\n([\s\S]*?)\n\*\*Figures used/gm)) {
    const s = story.slides[m[1]];
    assert.equal(s.title, m[2].trim());
    for (const para of m[3].trim().split(/\n\n+/)) {
      assert.ok(narr.includes(para.trim()), `page ${m[1]} narration`);
      const esc = para.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      assert.ok(s.text.includes(esc), `page ${m[1]} panel`);
    }
  }
});

test("narration: zagan, rendered once to static files for all 20 pages, 5 s skips", () => {
  const A = join(PUB, "physics101/audio");
  assert.deepEqual(json(join(A, "manifest.json"))["m01-l01"], [...Array(20)].map((_, i) => i + 1));
  for (let n = 1; n <= 20; n++) {
    const j = json(join(A, "m01-l01", `s${n}.json`));
    assert.equal(j.voice, "zagan"); assert.ok(j.words.length > 40, "s" + n);
    assert.ok(existsSync(join(A, "m01-l01", `s${n}.mp3`)));
  }
  assert.equal(json(join(ROOT, "tools/narration.config.json")).voice, "zagan");
  assert.match(readFileSync(join(PUB, "astro-course/ac-narrate.js"), "utf8"), /const SKIP = 5;/);
  // the browser never calls TTS
  for (const f of ["ac-story.js", "ac-narrate.js"]) assert.doesNotMatch(readFileSync(join(PUB, "astro-course", f), "utf8"), /api\.x\.ai|XAI_API_KEY/);
});

test("no em-dashes and no secrets in the lesson's files", () => {
  const files = [join(D, "deck.json"), join(D, "v2/story.json"), join(D, "v2/art.json"), join(ROOT, "tools/physics101/narration/m01-l01.md"),
    join(ROOT, "tools/physics101/build-lesson.py"), join(PUB, "physics101/scenes/kit.js"), join(PUB, "physics101/p101.css"),
    ...readdirSync(join(PUB, "physics101/scenes/m01-l01")).map((f) => join(PUB, "physics101/scenes/m01-l01", f))];
  for (const f of files) { const s = readFileSync(f, "utf8"); assert.doesNotMatch(s, /\u2014/, f); assert.doesNotMatch(s, /xai-[A-Za-z0-9]{10,}/, f); }
});
