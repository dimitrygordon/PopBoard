// Dimitry's Friction Lesson: page list, art references, graph alignment helpers, narration manifest, and text rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const DIR = join(PUB, "friction-lesson");
const eng = await import(pathToFileURL(join(DIR, "fl-engine.js")).href);
const { PAGES, LAB_URL } = await import(pathToFileURL(join(DIR, "fl-pages.js")).href);
const pagesSrc = readFileSync(join(DIR, "fl-pages.js"), "utf8");
const files = ["fl-pages.js", "fl-engine.js", "fl-app.js", "fl.css"].map((f) => readFileSync(join(DIR, f), "utf8"))
  .concat(readFileSync(join(PUB, "study-friction-lesson.html"), "utf8"));

test("33 pages in deck order, each with a title and a build", () => {
  assert.equal(PAGES.length, 33);
  for (const p of PAGES) { assert.ok(p.title); assert.equal(typeof p.build, "function"); }
});

test("no em-dashes and no Jasper anywhere in the module", () => {
  for (const s of files) { assert.ok(!s.includes("\u2014")); assert.ok(!/jasper/i.test(s)); }
  assert.ok(!readdirSync(join(DIR, "art")).some((f) => /jasper/i.test(f)));
});

test("every art layer the pages reference exists as webp", () => {
  const names = new Set([...pagesSrc.matchAll(/img\("([a-z0-9_]+)"/g)].map((m) => m[1]));
  assert.ok(names.size >= 10);
  for (const n of names) {
    if (n.endsWith("_")) assert.ok(readdirSync(join(DIR, "art")).some((f) => f.startsWith(n)), n); // template prefix (swatch_${id})
    else assert.ok(existsSync(join(DIR, "art", n + ".webp")), n);
  }
});

test("micro_contact and the credited gecko photo are used", () => {
  assert.match(pagesSrc, /img\("micro_contact"/);
  assert.match(pagesSrc, /gecko_photo/);
  assert.match(pagesSrc, /Photo/i);
});

test("needle maps 0 N and 20 N to the drawn scale ticks", () => {
  assert.equal(eng.needleX(0), 23.9);
  assert.equal(eng.needleX(20), 75.2);
  assert.ok(Math.abs(eng.needleX(10) - 49.55) < 1e-9);
  assert.equal(eng.needleX(-3), 23.9);
  assert.equal(eng.needleX(99), 75.2);
});

test("graph wipes stay inside the shared canvas and run left to right", () => {
  for (const box of [eng.STATIC_BOX, eng.KINETIC_BOX]) for (const v of Object.values(box)) {
    for (const x of v) assert.ok(x >= 0 && x <= 1);
  }
  const [x0, y0] = eng.risePoint(0), [x1, y1] = eng.risePoint(1);
  assert.deepEqual([x0, y0], eng.STATIC_BOX.rise_origin);
  assert.ok(Math.abs(x1 - eng.STATIC_BOX.peak[0]) < 1e-9 && Math.abs(y1 - eng.STATIC_BOX.peak[1]) < 1e-9);
  assert.ok(eng.riseWipeRight(0.5) > x0 && eng.riseWipeRight(0.5) < x1);
});

test("narration manifest covers all 33 pages with the zagan voice; a page without audio hides the player", () => {
  const m = JSON.parse(readFileSync(join(DIR, "narration", "manifest.json"), "utf8"));
  assert.equal(m.voice, "zagan");
  assert.equal(Object.keys(m.pages).length, 33);
  const app = readFileSync(join(DIR, "fl-app.js"), "utf8");
  assert.match(app, /if \(!entry \|\| !entry\.audio\) return;/);
});

test("Online Friction Lab link sits on pages 8 and 33", () => {
  assert.equal(LAB_URL, "https://popboard.us/study-friction");
  const s8 = String(PAGES[7].side), s33 = String(PAGES[32].side);
  assert.ok(s8.includes("LAB_URL") || s8.includes(LAB_URL) || /Online Friction Lab/.test(s8));
  assert.match(s33, /Try the Online Friction Lab/);
  assert.ok(existsSync(join(PUB, "study-friction.html")));
});

test("page 17 video is an autoplaying muted loop with no captions", () => {
  assert.match(pagesSrc, /friction-drop\.mp4/);
  for (const a of ["autoplay", "muted", "loop", "playsinline"]) assert.match(pagesSrc, new RegExp(a));
  assert.ok(existsSync(join(DIR, "media", "friction-drop.mp4")));
});

test("player has full screen, hide text, auto-advance, and reduced motion", () => {
  const all = files.join("\n");
  assert.match(all, /requestFullscreen/);
  assert.match(all, /prefers-reduced-motion/);
  assert.match(all, /popboard\.friction\.auto/);
  assert.match(all, /fl-full/);
});

test("every page has narration text and a rendered mp3, with no em-dashes", () => {
  const m = JSON.parse(readFileSync(join(DIR, "narration", "manifest.json"), "utf8"));
  for (let n = 1; n <= 33; n++) {
    const e = m.pages[String(n)];
    assert.ok(e.text.length > 20, `page ${n} text`);
    assert.ok(!e.text.includes("\u2014"), `page ${n} em-dash`);
    assert.equal(e.audio, `p${n}.mp3`);
    assert.ok(existsSync(join(DIR, "narration", e.audio)), e.audio);
  }
});

test("auto-advance waits for narration to end", () => {
  const app = readFileSync(join(DIR, "fl-app.js"), "utf8");
  assert.match(app, /if \(!state\.auto \|\| !state\.animDone \|\| state\.speaking/);
  assert.match(app, /a\.onended = \(\) => \{[^}]*state\.speaking = false; maybeAdvance\(\);/);
});
