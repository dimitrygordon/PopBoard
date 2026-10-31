// Storybook v2 (pop-up pages): D01 pilot data and engine guard rails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { darkInk } from "../public/astro-course/ac-ink.js";

const PUB = new URL("../public/", import.meta.url).pathname;
const AC = PUB + "astro-course/";
const story = JSON.parse(readFileSync(AC + "decks/d01/v2/story.json", "utf8"));
const deck = JSON.parse(readFileSync(AC + "decks/d01/deck.json", "utf8"));
const ENGINE = ["ac-popup.js", "ac-pop3d.js", "ac-fx.js", "ac-sb-v2.js", "ac-ink.js", "ac-story.js", "ac-story.css"].map((f) => [f, readFileSync(AC + f, "utf8")]);

test("every D01 page has a v2 entry with expanded page text", () => {
  assert.equal(Object.keys(story.slides).length, deck.slides.length);
  for (const s of deck.slides) {
    const v = story.slides[String(s.n)];
    assert.ok(v, `page ${s.n}`);
    assert.match(v.text, /<h3>.+<\/h3>/, `page ${s.n} heading`);
    assert.ok(v.text.replace(/<[^>]+>/g, "").length > 150, `page ${s.n} body`);
  }
});

test("every cutout layer file exists and sits on the page", () => {
  for (const [n, s] of Object.entries(story.slides)) for (const l of s.layers) {
    assert.ok(existsSync(AC + "decks/d01/" + l.src), `${n}: ${l.src}`);
    const [x, y, w, h] = l.box;
    assert.ok(x >= -1 && y >= -1 && x + w <= 101 && y + h <= 101 && w > 0 && h > 0, `${n}: ${l.src} box`);
  }
});

test("Leo's D01 spec: sandboxes on 5, 8, 9, 12, 14, 17, 18, 19 and 3D set pieces on 5, 18, 21", () => {
  const sb = Object.entries(story.slides).filter(([, s]) => s.sandbox).map(([n]) => +n).sort((a, b) => a - b);
  assert.deepEqual(sb, [5, 8, 9, 12, 14, 17, 18, 19]);
  const three = Object.entries(story.slides).filter(([, s]) => s.three).map(([n]) => +n).sort((a, b) => a - b);
  assert.deepEqual(three, [5, 18, 21]);
  assert.equal(story.popupSpec, "v2");
  assert.ok(story.slides["24"].layers.every((l) => l.flat), "standards page is static and flat");
});

test("motion types are from the known set", () => {
  const ok = new Set(["none", "float", "spin", "orbit", "launch", "pulse", "drift", "twinkle", "path"]);
  for (const s of Object.values(story.slides)) for (const l of s.layers) assert.ok(ok.has(l.motion), l.motion);
});

test("entry timing: lines 0.6s, hatch 0.4s, 0.2s stagger, reduce-motion shows the final state", () => {
  const pop = ENGINE.find(([f]) => f === "ac-popup.js")[1];
  assert.match(pop, /sketch: 0\.6, color: 0\.4, pop: 0, stagger: 0\.2/);
  assert.match(pop, /reduceMotion\(\)/);
});

test("no em-dashes, no mascot, glows only via createRadialGradient", () => {
  for (const [f, src] of ENGINE) {
    assert.ok(!src.includes("\u2014"), `${f} em-dash`);
    assert.ok(!/jasper/i.test(src), `${f} mascot`);
    assert.ok(!/shadowBlur|drop-shadow\(|box-shadow:[^;]*\b0 0 \d+px [^;]*(gold|#e2b654|#f2c45a)/i.test(src), `${f} glow`);
  }
  assert.ok(!JSON.stringify(story).includes("\u2014"), "story.json em-dash");
});

test("one shared renderer, DPR capped, scenes disposed on turn", () => {
  const pop = ENGINE.find(([f]) => f === "ac-popup.js")[1];
  assert.equal((pop.match(/new THREE\.WebGLRenderer/g) || []).length, 1);
  assert.match(pop, /Math\.min\(devicePixelRatio \|\| 1, phone \? 1 : 1\.5\)/);
  assert.match(pop, /async function show\(s, opts = \{\}\) \{\n\s+dispose\(\);/);
});

test("dark paper maps deck ink to the dark palette and never touches art", () => {
  assert.equal(darkInk("#3D3D3D"), "var(--pop-ink)");
  assert.equal(darkInk("#3F6FA8"), "var(--pop-blue)");
  assert.equal(darkInk("#C9862A"), "var(--pop-gold)");
  assert.equal(darkInk("not a color"), null);
});

test("narration render script: words come from graph_chars, brackets become parentheses", async () => {
  const m = await import("../tools/render-narration.mjs");
  assert.deepEqual(m.wordsFrom({ graph_chars: ["H", "i", " ", "y", "o"], graph_times: [[0, 0.1], [0.1, 0.2], [0.2, 0.25], [0.3, 0.4], [0.4, 0.5]] }),
    [{ w: "Hi", start: 0, end: 0.2 }, { w: "yo", start: 0.3, end: 0.5 }]);
  const p = m.pages("## Slide 1\n### Head [aside]\nSome **bold** text\n## Slide 2\nNext");
  assert.equal(p["1"], "Head (aside)\n\nSome bold text");
  assert.equal(p["2"], "Next");
  const src = readFileSync(new URL("../tools/render-narration.mjs", import.meta.url), "utf8");
  assert.match(src, /process\.env\.XAI_API_KEY/);
  assert.match(src, /with_timestamps: true/);
  assert.ok(!/eleven/i.test(src));
});
