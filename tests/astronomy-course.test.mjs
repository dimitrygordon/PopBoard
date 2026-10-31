// Astronomy Course storybooks: catalog, verbatim page text, Kepler sandbox math, and content rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/astro-course/ac-catalog.js";
import { renderSlide, readableHtml, boxText, searchDeck, slideText } from "../public/astro-course/ac-render.js";
import { periodYears, position, speedKmS, eccentricAnomaly } from "../public/astro-course/ac-kepler.js";
import { crater, transitionDiameter, G_MOON } from "../public/astro-course/ac-impact.js";
import { missionDose, RATE } from "../public/astro-course/ac-dose.js";
import { conjunctions, SYSTEMS } from "../public/astro-course/ac-sb-resonance.js";
import { EXTRAS, MODULES } from "../public/astro-course/ac-extras.js";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const AC = join(PUB, "astro-course");
const strip = (h) => h.replace(/<br>|<\/p>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const norm = (s) => String(s).replace(/[\v\u000b]/g, " ").replace(/\s+/g, " ").trim();

const ORDER = ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13", "D13b", "D14", "D15", "D16", "D17", "D17.5", "D18", "D19", "D20", "D21", "D22", "D23", "D24", "D24.5"];

test("catalog lists every deck series once, in course order, each with a cover", () => {
  assert.deepEqual(DECKS.map((d) => d.key), ORDER);
  for (const d of DECKS) {
    assert.ok(d.title && d.slides > 0 && d.pages.length === d.slides, d.key);
    assert.ok(existsSync(join(AC, "covers", d.slug + ".webp")), "cover " + d.slug);
  }
});

const built = DECKS.filter((d) => d.built);
test("at least one storybook is built", () => assert.ok(built.length >= 1));

for (const d of built) {
  const deck = JSON.parse(readFileSync(join(AC, "decks", d.slug, "deck.json"), "utf8"));
  test(`${d.key}: one page per slide, same order, all art present`, () => {
    assert.equal(deck.slides.length, d.slides);
    deck.slides.forEach((s, i) => {
      assert.equal(s.n, i + 1);
      if (s.bg) assert.ok(existsSync(join(AC, "decks", d.slug, s.bg)), s.bg);
      for (const it of s.items) if (it.t === "img") {
        const f = join(AC, "decks", d.slug, it.src);
        assert.ok(existsSync(f) && statSync(f).size > 500, it.src);
      }
    });
  });
  test(`${d.key}: rendered pages keep every word, in order (stage and large-print copy)`, () => {
    for (const s of deck.slides) {
      const want = s.items.filter((i) => i.t === "text").map((i) => norm(boxText(i).join(" "))).filter(Boolean);
      const stage = strip(renderSlide(s, { options: !!s.answer }));
      const read = strip(readableHtml(s));
      let at = 0, at2 = 0;
      for (const w of want) {
        const i = stage.indexOf(w, at); assert.ok(i >= 0, `stage ${d.key} p${s.n}: ${w}`); at = i + w.length;
        const j = read.indexOf(w, at2); assert.ok(j >= 0, `read ${d.key} p${s.n}: ${w}`); at2 = j + w.length;
      }
      assert.equal(norm(d.pages[s.n - 1]), norm(slideText(s).join(" ")), `catalog search text p${s.n}`);
    }
  });
  test(`${d.key}: no CORE/OPTIONAL labels, no em-dashes, answers point at real options`, () => {
    const all = deck.slides.map((s) => slideText(s).join(" ") + " " + (s.reveal || "")).join("\n");
    // labels only: a whole text box reading CORE or OPTIONAL (words like "Earth's core" are content)
    for (const s of deck.slides) for (const it of s.items) if (it.t === "text") assert.ok(!/^\s*\(?(CORE|OPTIONAL)\)?\s*$/.test(boxText(it).join(" ")), `label on ${s.n}`);
    assert.ok(!all.includes("\u2014"));
    for (const s of deck.slides) if (s.answer) assert.match(renderSlide(s, { options: true }), new RegExp(`data-opt="${s.answer}"`));
    const ex = EXTRAS[d.slug] || {};
    for (const [n, c] of Object.entries(ex.choices || {})) {
      const html = renderSlide(deck.slides[n - 1], { choices: c.options });
      for (const o of c.options) assert.ok(html.includes(`data-opt="${o}"`), o);
      assert.ok(c.options.includes(c.answer));
    }
    for (const k of Object.values(ex.tryIt || {})) {
      assert.ok(MODULES[k] && existsSync(join(PUB, MODULES[k].file)), k);
      assert.ok(existsSync(join(AC, "thumbs", k + ".webp")), "thumb " + k);
      assert.match(readFileSync(join(PUB, MODULES[k].file), "utf8"), /astro-course\/story-return\.js/, "Back to the story in " + k);
    }
  });
}

test("library search finds titles and words inside pages", () => {
  const d1 = DECKS[0];
  assert.equal(searchDeck(d1, "cosmic perspective").where, "title");
  const hit = searchDeck(d1, "redshift");
  assert.equal(hit.where, "page");
  assert.ok(d1.pages[hit.page - 1].toLowerCase().includes("redshift"));
  assert.equal(searchDeck(d1, "zzzqqq"), null);
});

test("Kepler sandbox: P^2 = a^3, equal areas, vis-viva", () => {
  assert.equal(periodYears(4), 8); // deck 1 page 20, answer B
  assert.ok(Math.abs(periodYears(1) - 1) < 1e-12);
  for (const e of [0, 0.3, 0.8]) for (const M of [0.1, 1, 3]) {
    const E = eccentricAnomaly(M, e); assert.ok(Math.abs(E - e * Math.sin(E) - M) < 1e-10);
  }
  // second law: equal time slices sweep equal areas
  const a = 2, e = 0.6, P = periodYears(a), N = 8, areas = [];
  for (let k = 0; k < N; k++) {
    let A = 0; const steps = 400;
    for (let j = 0; j < steps; j++) {
      const p = position(a, e, P * (k + j / steps) / N), q = position(a, e, P * (k + (j + 1) / steps) / N);
      A += (p.x * q.y - q.x * p.y) / 2;
    }
    areas.push(A);
  }
  const ideal = Math.PI * a * a * Math.sqrt(1 - e * e) / N;
  for (const A of areas) assert.ok(Math.abs(A - ideal) / ideal < 1e-3, `${A} vs ${ideal}`);
  assert.ok(Math.abs(speedKmS(1, 1) - 29.78) < 0.05); // Earth's mean orbital speed
});

test("Astronomy Course files: no em-dashes, no mascot, no Firebase", () => {
  const files = ["study-astronomy-course.html", "study-astronomy-story.html", ...readdirSync(AC).filter((f) => /\.(js|css)$/.test(f)).map((f) => "astro-course/" + f)];
  for (const f of files) {
    const src = readFileSync(join(PUB, f), "utf8");
    assert.ok(!src.includes("\u2014"), "em-dash in " + f);
    assert.ok(!/jasper/i.test(src), "mascot in " + f);
    assert.ok(!/firebase/i.test(src), "firebase in " + f);
  }
  const study = readFileSync(join(PUB, "study.html"), "utf8");
  assert.match(study, /study-astronomy-course\.html/);
});

test("Crater sandbox: Meteor Crater near 1.2 km, faster makes bigger, Moon goes complex later", () => {
  const m = crater(40, 12800, 7800);
  assert.ok(m.D > 900 && m.D < 1700, String(m.D));
  assert.equal(m.shape, "bowl");
  assert.ok(crater(40, 20000, 7800).D > m.D);
  assert.ok(transitionDiameter(G_MOON) > transitionDiameter());
  assert.notEqual(crater(2000, 20000, 3000).shape, "bowl");
});
test("Dose chart: transit rate, shelter lowers surface dose", () => {
  assert.ok(Math.abs(RATE.transit * 180 - 330) < 1e-9);
  const a = missionDose({ undergroundShare: 0 }), b = missionDose({ undergroundShare: 0.8 });
  assert.ok(b.surface < a.surface && b.transit === a.transit);
});
test("Resonance: 1:2 line-ups repeat at one spot, Pluto system near 3:2", () => {
  const c = conjunctions(1, 2, 4).map((x) => Math.round(x) % 360);
  assert.equal(new Set(c).size, 1);
  const [[, pn], [, pp]] = SYSTEMS.pluto.bodies;
  assert.ok(Math.abs(pp / pn - 1.5) < 0.02);
});
