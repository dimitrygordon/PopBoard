// Dimitry's Friction Lesson: page list, art references, graph alignment helpers, narration manifest, and text rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const DIR = join(PUB, "friction-lesson");
const eng = await import(pathToFileURL(join(DIR, "fl-engine.js")).href);
const { PAGES, LAB_URL, TEST_LABELS, readingAt, VIDEO_READINGS, VIDEO_ZONES, squeeze, contactFraction, gapMin, fitLine, KDATA } = await import(pathToFileURL(join(DIR, "fl-pages.js")).href);
const pagesSrc = readFileSync(join(DIR, "fl-pages.js"), "utf8");
const files = ["fl-pages.js", "fl-engine.js", "fl-app.js", "fl.css"].map((f) => readFileSync(join(DIR, f), "utf8"))
  .concat(readFileSync(join(PUB, "study-friction-lesson.html"), "utf8"));

test("26 pages in deck order, each with a title, a build, and guide text for narration-off mode", () => {
  assert.equal(PAGES.length, 26);
  for (const p of PAGES) { assert.ok(p.title); assert.equal(typeof p.build, "function"); assert.ok(p.guide && p.guide.length > 10, p.title); }
  assert.equal(PAGES[1].black, true); // Learning Targets on a black page
});

test("no em-dashes anywhere; Jasper appears only on the cover", () => {
  for (const s of files) assert.ok(!s.includes("\u2014"));
  assert.deepEqual(readdirSync(join(DIR, "art")).filter((f) => /jasper/i.test(f)), ["cover_jasper_push.webp"]);
  assert.match(String(PAGES[0].build), /cover_jasper_push/);
  for (let i = 1; i < PAGES.length; i++) assert.ok(!/jasper/i.test(String(PAGES[i].build) + PAGES[i].side), `page ${i + 1}`);
  assert.match(readFileSync(join(PUB, "study.html"), "utf8"), /friction-lesson\/art\/cover_jasper_push\.webp/);
});

test("test toggles use one constant: Test A, Test B, Test C", () => {
  assert.deepEqual(TEST_LABELS, ["Test A", "Test B", "Test C"]);
  assert.match(String(PAGES[7].build), /TEST_LABELS/);
});

test("asperity model: more load presses deeper and grows the contact fraction", () => {
  let prevD = -1, prevC = -1;
  for (const g of [0, 100, 300, 800, 1700]) {
    const d = squeeze(g), c = contactFraction(d);
    assert.ok(d > prevD && c > prevC, `load ${g}`);
    assert.ok(c > 0 && c < 1);
    prevD = d; prevC = c;
  }
  assert.ok(squeeze(0) > gapMin());
});

test("kinetic sample data: best fit slope is mu k and runs near the origin", () => {
  const { m, b } = fitLine(KDATA.map((k) => [k.FN, k.Ff]));
  assert.ok(Math.abs(m - 0.40) < 0.02 && Math.abs(b) < 0.2);
  for (const k of KDATA) assert.ok(Math.abs(k.FN - k.mass / 1000 * 9.8) < 0.06);
});

test("video graph uses the scale readings held for review, with static, threshold, kinetic zones", () => {
  assert.equal(readingAt(0), VIDEO_READINGS[0][1]);
  assert.equal(readingAt(2.8), 18.0); // peak (static max) ruled at 18 N
  assert.equal(Math.max(...VIDEO_READINGS.map((r) => r[1])), 18.0);
  assert.equal(readingAt(5), 12.0); // steady pull (kinetic) ruled at 12 N
  const mid = readingAt(2.25); assert.ok(mid > 17.5 && mid < 17.8);
  assert.deepEqual(Object.keys(VIDEO_ZONES), ["static", "threshold", "kinetic"]);
  assert.equal(VIDEO_ZONES.static[1], VIDEO_ZONES.threshold[0]);
  assert.equal(VIDEO_ZONES.threshold[1], VIDEO_ZONES.kinetic[0]);
});

test("narration toggle is global, saved, and the Narrate button stays reachable", () => {
  const app = readFileSync(join(DIR, "fl-app.js"), "utf8"), html = readFileSync(join(PUB, "study-friction-lesson.html"), "utf8");
  assert.match(app, /popboard\.friction\.narration/);
  assert.match(app, /narr-off/);
  assert.match(html, /id="narrBtn"/); assert.match(html, /id="sayBtn"/); assert.match(html, /id="flGuide"/);
});

test("every art layer the pages reference exists as webp", () => {
  const names = new Set([...pagesSrc.matchAll(/img\("([a-z0-9_]+)"/g)].map((m) => m[1]));
  assert.ok(names.size >= 10);
  for (const n of names) {
    if (n.endsWith("_")) assert.ok(readdirSync(join(DIR, "art")).some((f) => f.startsWith(n)), n); // template prefix (swatch_${id})
    else assert.ok(existsSync(join(DIR, "art", n + ".webp")), n);
  }
});

test("the credited gecko photo is used", () => {
  assert.match(pagesSrc, /gecko_photo/);
  assert.match(pagesSrc, /Photo/i);
});

test("needle maps 0 N and 20 N to the drawn scale ticks", () => {
  // code-drawn strip over Leo's blank tube; the hook is on the left, so the reading grows leftward
  assert.equal(eng.needleX(0), 94);
  assert.equal(eng.needleX(20), 6);
  assert.ok(Math.abs(eng.needleX(10) - 50) < 1e-9);
  assert.equal(eng.needleX(-3), 94);
  assert.equal(eng.needleX(99), 6);
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

test("narration manifest covers all 26 pages with the zagan voice; a page without audio hides the player", () => {
  const m = JSON.parse(readFileSync(join(DIR, "narration", "manifest.json"), "utf8"));
  assert.equal(m.voice, "zagan");
  assert.equal(Object.keys(m.pages).length, 26);
  const app = readFileSync(join(DIR, "fl-app.js"), "utf8");
  assert.match(app, /if \(!entry \|\| !entry\.audio\) return;/);
});

test("Online Friction Lab link sits on pages 8 and 26", () => {
  assert.equal(LAB_URL, "https://popboard.us/study-friction");
  const s8 = String(PAGES[7].side), s33 = String(PAGES[25].side);
  assert.ok(s8.includes("LAB_URL") || s8.includes(LAB_URL) || /Online Friction Lab/.test(s8));
  assert.match(s33, /Try the Online Friction Lab/);
  assert.ok(existsSync(join(PUB, "study-friction.html")));
});

test("pages 11 and 14 video is an autoplaying muted loop with no captions", () => {
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
  for (let n = 1; n <= 26; n++) {
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
