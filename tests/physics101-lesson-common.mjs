// Shared checks for Physics 101 lessons built by tools/physics101/build-lesson.py (M1 L2 onward).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const json = (f) => JSON.parse(readFileSync(f, "utf8"));

export function lessonTests({ slug, pages, testIt, buttonOnly = [], audio = false }) {
  const D = join(PUB, "physics101/decks", slug), SC = join(PUB, "physics101/scenes", slug);
  const deck = json(join(D, "deck.json")), story = json(join(D, "v2/story.json")), art = json(join(D, "v2/art.json"));
  const narr = readFileSync(join(ROOT, "tools/physics101/narration", slug + ".md"), "utf8");
  const OUTLINE = `/workspace/physics101/outline/${slug}_outline.md`;
  const L = slug.toUpperCase();

  test(`${L} is built: ${pages} pages in the catalog, deck, story and art`, () => {
    const m = DECKS.find((d) => d.slug === slug);
    assert.equal(m.built, true); assert.equal(m.slides, pages);
    assert.equal(deck.slides.length, pages); assert.deepEqual(deck.slides.map((s) => s.n), [...Array(pages)].map((_, i) => i + 1));
    assert.equal(Object.keys(story.slides).length, pages); assert.equal(Object.keys(art).length, pages);
  });

  test(`${L}: every layer is on disk inside the page, cutouts ride with the mid art and have gold outlines`, () => {
    for (const [pn, ls] of Object.entries(art)) {
      assert.ok(ls.some((l) => l.id === "bg") && ls.some((l) => l.id === "mid"), pn);
      const mid = ls.find((l) => l.id === "mid").f;
      for (const l of ls) {
        assert.ok(existsSync(join(D, "v2/art", l.src)), l.src);
        if (l.hint) assert.ok(existsSync(join(D, "v2/art", l.hint)), l.hint);
        const [x0, y0, x1, y1] = l.box; assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1600 && y1 <= 900 && x1 > x0 && y1 > y0, l.src);
        if (l.id === "fg" || l.cut) assert.equal(l.f, mid, `${pn} ${l.id}`);
        if (l.cut) assert.ok(l.hint, `${pn} ${l.id} has a touch outline`);
      }
    }
  });

  test(`${L}: Test it on exactly the outline's sandbox pages, each with a kit-only scene that uses Leo's cutouts`, () => {
    const got = Object.entries(story.slides).filter(([, s]) => s.testIt).map(([n]) => +n).sort((a, b) => a - b);
    assert.deepEqual(got, testIt);
    for (const n of testIt) {
      const pn = "p" + String(n).padStart(2, "0"), f = join(SC, pn + ".js");
      assert.ok(existsSync(f), pn);
      const src = readFileSync(f, "utf8");
      assert.match(src, /export default function build\(ctx\)/, pn);
      for (const m of src.matchAll(/^import .* from "(.+)";$/gm)) assert.equal(m[1], "../kit.js", pn);
      if (!buttonOnly.includes(n)) assert.match(src, /art\.touchable\(/, pn);
      for (const c of art[pn].filter((l) => l.cut)) assert.ok(src.includes(`"${c.id.replace(/^cut-/, "")}"`) || /art\.box\(/.test(src), `${pn} uses ${c.id}`);
    }
    assert.deepEqual(readdirSync(SC).map((f) => +f.slice(1, 3)).sort((a, b) => a - b), testIt, "no stray scene files");
  });

  test(`${L} read panel: title, definition, read-aloud; no unsolved problems`, () => {
    for (const [n, s] of Object.entries(story.slides)) {
      assert.match(s.text, /^<h3>.+<\/h3><p class="p101-def">/, n);
      assert.doesNotMatch(s.text, /p101-problem|data-problem|Check Your Progress|Practice Problems/, n);
    }
  });

  test(`${L}: outline wording is used exactly`, { skip: !existsSync(OUTLINE) }, () => {
    const md = readFileSync(OUTLINE, "utf8"); let k = 0;
    for (const m of md.matchAll(/^## Page (\d+): (.+)\n[\s\S]*?\*\*Read-aloud text:\*\*\s*\n([\s\S]*?)\n\*\*(?:Figures used|Test it)/gm)) {
      const s = story.slides[m[1]]; k++;
      assert.equal(s.title, m[2].trim());
      for (const para of m[3].trim().split(/\n+/)) {
        assert.ok(narr.includes(para.trim()), `page ${m[1]} narration`);
        const esc = para.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        assert.ok(s.text.includes(esc), `page ${m[1]} panel`);
      }
    }
    assert.equal(k, pages);
  });

  test(`${L} narration: ${audio ? "zagan, rendered for every page" : "not rendered (outline not Tesla-cleared)"}`, () => {
    const A = join(PUB, "physics101/audio"), man = json(join(A, "manifest.json"));
    if (!audio) { assert.equal(man[slug], undefined); assert.ok(!existsSync(join(A, slug))); return; }
    assert.deepEqual(man[slug], [...Array(pages)].map((_, i) => i + 1));
    for (let n = 1; n <= pages; n++) {
      const j = json(join(A, slug, `s${n}.json`));
      assert.equal(j.voice, "zagan"); assert.ok(j.words.length > 20, "s" + n);
      assert.ok(existsSync(join(A, slug, `s${n}.mp3`)));
    }
  });

  test(`${L}: the outline's Flags for Tesla section is never in the story or the narration`, () => {
    for (const s of Object.values(story.slides)) assert.doesNotMatch(s.text, /Flags? for Tesla/i);
    assert.doesNotMatch(narr, /Flags? for Tesla/i);
    for (const s of Object.values(story.slides)) assert.doesNotMatch(s.text, /\bNote: the original example/);
  });

  test(`${L}: no em-dashes and no secrets`, () => {
    const files = [join(D, "deck.json"), join(D, "v2/story.json"), join(D, "v2/art.json"), join(ROOT, "tools/physics101/narration", slug + ".md"),
      ...readdirSync(SC).map((f) => join(SC, f))];
    for (const f of files) { const s = readFileSync(f, "utf8"); assert.doesNotMatch(s, /\u2014/, f); assert.doesNotMatch(s, /xai-[A-Za-z0-9]{10,}/, f); }
  });
}
