// Sandbox mode and dark theme for Build a Star, Black Hole Explorer and the
// EM Spectrum Explorer: contrast in both themes, deep links, slider sweeps,
// theme wiring, and no em-dashes in the changed files.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as SP from "../public/stars/stars-physics.js";
import * as BP from "../public/black-hole/bh-physics.js";
import * as EP from "../public/em-spectrum/emspec-physics.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

// ---------- WCAG contrast ----------
function lum(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function block(css, selector) {
  const i = css.indexOf(selector + " {");
  assert.ok(i >= 0, `missing ${selector} block`);
  const body = css.slice(i, css.indexOf("}", i));
  const out = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) out[m[1]] = m[2];
  return out;
}
function themes(cssPath) {
  const css = read(cssPath);
  const light = block(css, ":root");
  return { light, dark: { ...light, ...block(css, ':root[data-theme="dark"]') } };
}
function checkPairs(cssPath, pairs) {
  for (const [name, t] of Object.entries(themes(cssPath))) {
    for (const [fg, bg] of pairs) {
      assert.ok(t[fg] && t[bg], `${cssPath} ${name}: tokens ${fg}/${bg}`);
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `${cssPath} ${name}: ${fg} ${t[fg]} on ${bg} ${t[bg]} is ${r.toFixed(2)}:1`);
    }
  }
}

test("stars: text contrast at least 4.5:1 in light and dark", () => {
  checkPairs("public/stars/stars-theme.css", [["ink", "paper"], ["ink-2", "paper"], ["ink-3", "paper"], ["ink", "chip"], ["ink-2", "chip"], ["bar-text", "bar"]]);
});
test("black hole: text contrast at least 4.5:1 in light and dark", () => {
  checkPairs("public/black-hole/bh-theme.css", [["bh-ink", "bh-paper"], ["bh-ink-2", "bh-paper"], ["bh-ink-3", "bh-paper"], ["bh-accent-ink", "bh-paper"],
    ["bh-ink", "bh-wash"], ["bh-ink-2", "bh-wash"], ["bh-accent", "bh-sky"]]);
});
test("em spectrum: text contrast at least 4.5:1 in light and dark", () => {
  checkPairs("public/em-spectrum/emspec-theme.css", [["es-ink", "es-paper"], ["es-ink-dim", "es-paper"], ["es-caption", "es-paper"], ["es-ink", "es-card"],
    ["es-text", "es-chrome"], ["es-text", "es-btn"], ["es-dim", "es-chrome"], ["es-dim", "es-bg"]]);
});

// ---------- theme wiring ----------
for (const [slug, html, ui] of [
  ["stars", "public/study-stars.html", "public/stars/stars-ui.js"],
  ["black-hole", "public/study-black-hole.html", "public/black-hole/bh-ui.js"],
  ["em-spectrum", "public/study-em-spectrum.html", "public/em-spectrum/emspec-ui.js"]
]) {
  test(`${slug}: theme follows the system, toggle saves popboard.${slug}.theme`, () => {
    const h = read(html), u = read(ui);
    assert.match(h, /<meta name="color-scheme" content="light dark">/);
    assert.match(h, new RegExp(`localStorage\\.getItem\\("popboard\\.${slug}\\.theme"\\)`));
    assert.match(h, /prefers-color-scheme: dark/);
    assert.match(h, /id="themeBtn"/); assert.match(h, /id="themeLabel"/);
    assert.match(u, new RegExp(`"popboard\\.${slug}\\.theme"`));
    assert.match(u, /localStorage\.setItem\(THEME_KEY/);
    assert.match(u, /prefers-color-scheme: dark/);
    // Halos are baked into the art: no glow, outline or shadow rims added in code.
    assert.doesNotMatch(u, /shadowBlur|drop-shadow/);
  });
}

// ---------- sandbox deep links ----------
test("stars: ?mode=sandbox opens the sandbox; other modes unchanged", () => {
  for (const q of ["?mode=sandbox", "?mode=free", "?mode=play", "?mode=SANDBOX"]) assert.equal(SP.modeFromSearch(q), "sandbox", q);
  assert.equal(SP.modeFromSearch(""), "build");
  assert.equal(SP.modeFromSearch("?mode=build"), "build");
  assert.match(read("public/study-stars.html"), /data-mode="sandbox"/);
});
test("black hole: ?mode=sandbox opens the sandbox; it is the last tab", () => {
  for (const q of ["?mode=sandbox", "?mode=free", "?mode=play"]) assert.equal(BP.modeFromSearch(q), "sandbox", q);
  assert.equal(BP.modeFromSearch(""), "horizon");
  assert.equal(BP.MODES[BP.MODES.length - 1].id, "sandbox");
  const ui = read("public/black-hole/bh-ui.js");
  assert.match(ui, /sandbox: "Free play/);
  assert.match(ui, /case "sandbox"/);
});
test("em spectrum: ?mode=sandbox opens the sandbox with band and object", () => {
  for (const q of ["?mode=sandbox", "?mode=free", "?mode=play"]) assert.equal(EP.parseQuery(q).mode, "sandbox", q);
  assert.deepEqual(EP.parseQuery("?mode=sandbox&band=uv&object=crab"), { mode: "sandbox", band: "ultraviolet", object: "crab" });
  assert.ok(EP.MODES.includes("sandbox"));
  const h = read("public/study-em-spectrum.html");
  assert.match(h, /data-mode="sandbox"/); assert.match(h, /data-show="sandbox"/);
});

// ---------- slider sweep for the new EM sandbox sliders ----------
function sweepOk(seq, label) {
  for (let i = 0; i < seq.length; i++) {
    for (const [k, v] of Object.entries(seq[i])) {
      if (v === null) continue;
      assert.ok(Number.isFinite(v) && v !== 0, `${label} step ${i} ${k} = ${v}`);
      if (i === 0 || seq[i - 1][k] === null) continue;
      const p = seq[i - 1][k];
      assert.ok(Math.sign(p) === Math.sign(v), `${label} step ${i} ${k} flips sign`);
      const r = Math.abs(v / p);
      assert.ok(r < 2 && r > 0.5, `${label} step ${i} ${k}: ${p} to ${v}`);
    }
  }
}
test("em spectrum sandbox: every slider step moves each shown number less than 2x", () => {
  const n = EP.SANDBOX_SLIDERS.lambda.steps;
  for (const lB of [EP.sliderToWavelength(0), 550e-9, 0.21, EP.sliderToWavelength(1)]) {
    sweepOk(Array.from({ length: n + 1 }, (_, i) => EP.sandboxShown(EP.sliderToWavelength(i / n), lB)), `lambda (B ${lB})`);
    sweepOk(Array.from({ length: n + 1 }, (_, i) => EP.sandboxShown(299792458 / EP.sliderToFrequency(i / n), lB)), `freq (B ${lB})`);
  }
  for (const lA of [EP.sliderToWavelength(0), 550e-9, EP.sliderToWavelength(1)]) {
    sweepOk(Array.from({ length: n + 1 }, (_, i) => EP.sandboxShown(lA, EP.sliderToWavelength(i / n))), `photon B (A ${lA})`);
  }
  const s = EP.sandboxShown(550e-9, 0.21);
  assert.ok(Math.abs(s.lambda * s.f - 299792458) < 1);
  assert.ok(Math.abs(s.eV - EP.energyFromWavelengthEV(550e-9)) < 1e-12);
  assert.ok(s.ratio >= 1);
});
test("black hole sandbox: no new sliders (mass, spin, dist sweeps already covered)", () => {
  assert.deepEqual(Object.keys(BP.SLIDERS).sort(), ["dist", "mass", "spin"]);
});

// ---------- no em-dashes ----------
test("no em-dashes in changed files", () => {
  for (const f of ["public/study-stars.html", "public/stars/stars-ui.js", "public/stars/stars-render.js", "public/stars/stars-theme.css", "public/stars/stars-physics.js",
    "public/study-black-hole.html", "public/black-hole/bh-ui.js", "public/black-hole/bh-render.js", "public/black-hole/bh-theme.css", "public/black-hole/bh-physics.js",
    "public/study-em-spectrum.html", "public/em-spectrum/emspec-ui.js", "public/em-spectrum/emspec-render.js", "public/em-spectrum/emspec-theme.css", "public/em-spectrum/emspec-physics.js",
    "docs/stars-science.md", "docs/black-hole-science.md", "docs/em-spectrum-science.md", "tests/retrofit-sandbox-dark.test.mjs"]) {
    assert.doesNotMatch(read(f), /\u2014/, f);
  }
});
