// Relativity "Lightspeed Ride" mode: aberration and Doppler math, the throttle, medals, page
// wiring, and that the Relativity Sandbox still loads by default.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/relativity/lightspeed/ls-model.js";
import { modeFromQuery, MODE_ALIASES } from "../public/relativity-physics.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["relativity/lightspeed/ls-ui.js", "relativity/lightspeed/ls-model.js", "relativity/lightspeed/ls-scene.js", "relativity/lightspeed/lightspeed-theme.css"];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b}`);

test("throttle: equal rapidity steps, tops out at 0.999 c, never reaches c", () => {
  assert.equal(M.sliderToBeta(0), 0); near(M.sliderToBeta(1), M.BETA_MAX, 1e-12);
  for (let s = 0; s <= 1; s += 0.05) near(M.betaToSlider(M.sliderToBeta(s)), s, 1e-9);
  const gain = (s) => M.sliderToBeta(s + 0.01) - M.sliderToBeta(s);
  assert.ok(gain(0.9) < gain(0.5) && gain(0.5) < gain(0.1), "each push adds less speed near c");
  near(M.gamma(M.BETA_MAX), 22.37, 0.01);
});

test("aberration: side star at 1/gamma, forward and back stay put, the sky only squeezes", () => {
  for (const b of [0.3, 0.9, 0.99]) {
    const c = M.aberrateCos(0, b); near(c, b, 1e-12); near(Math.sqrt(1 - c * c), 1 / M.gamma(b), 1e-12);
    near(M.aberrateCos(1, b), 1, 1e-12); near(M.aberrateCos(-1, b), -1, 1e-12);
    assert.ok(M.aberrateCos(-0.5, b) > -0.5, "stars move forward");
  }
  near(M.sideStarDeg(0.9), 25.84, 0.01);
});

test("Doppler: two forms agree, blue ahead, red behind, D = 1 on the predicted ring", () => {
  for (const b of [0.5, 0.9, 0.99]) for (const ct of [-1, -0.4, 0, 0.6, 1]) near(M.doppler(ct, b), M.dopplerShip(M.aberrateCos(ct, b), b), 1e-9);
  near(M.doppler(1, 0.6), 2, 1e-12); near(M.doppler(-1, 0.6), 0.5, 1e-12);
  const g = M.gamma(0.8); near(M.dopplerShip((1 - 1 / g) / 0.8, 0.8), 1, 1e-12);
  near(M.shiftedTemp(5800, 2), 11600, 1e-9); assert.equal(M.shiftedTemp(5800, 100), M.TEMP_RANGE.max);
  const [r1, , b1] = M.tempToRGB(3000), [r2, , b2] = M.tempToRGB(15000);
  assert.ok(r1 > b1 && b2 > r2, "cool is red, hot is blue");
});

test("cone fraction: analytic formula matches the sampled sky", () => {
  near(M.coneFraction(0, 45), (1 - Math.SQRT1_2) / 2, 1e-12); near(M.coneFraction(Math.SQRT1_2, 45), 0.5, 1e-12);
  const sky = M.makeSky();
  assert.equal(sky.length, M.STAR_COUNT);
  for (const b of [0, 0.5, 0.9, 0.99]) near(M.fractionInCone(M.view(sky, b)), M.coneFraction(b), 0.04, `beta ${b}`);
  assert.equal(M.fractionInCone(M.view(sky, 0.99, { aberration: false })), M.fractionInCone(M.view(sky, 0)), "aberration off");
  assert.ok(M.view(sky, 0.9, { dopplerOn: false }).every((s) => s.D === 1));
});

test("brightness: D^2 energy flux, capped 0.02 to 6", () => {
  assert.equal(M.BRIGHTNESS_POWER, 2);
  near(M.brightness(2), 4, 1e-12); near(M.brightness(0.5), 0.25, 1e-12); near(M.brightness(1.5), 2.25, 1e-12);
  assert.equal(M.brightness(10), 6); assert.equal(M.brightness(0.1), 0.02);
});

test("gold window: gamma 9.75 to 10.25 is beta 0.9947 to 0.9952, gamma 10 is 0.99499", () => {
  const b = (g) => Math.sqrt(1 - 1 / (g * g));
  near(b(9.75), 0.9947, 5e-5); near(b(10.25), 0.9952, 5e-5); near(b(10), 0.99499, 5e-6);
});

test("medals: Bronze at 0.5 c, Silver at half the sky in the cone, Gold holds gamma 10", () => {
  const [bronze, silver, gold] = M.GOALS;
  assert.ok(bronze.check({ type: "ride", beta: 0.5 })); assert.ok(!bronze.check({ type: "ride", beta: 0.49 }));
  assert.ok(silver.check({ type: "ride", fraction: M.coneFraction(0.72) })); assert.ok(!silver.check({ type: "ride", fraction: M.coneFraction(0.69) }));
  assert.ok(gold.check({ type: "ride", holdGold: 3 })); assert.ok(!gold.check({ type: "ride", holdGold: 2.9 }));
  assert.ok(!bronze.check({ type: "sandbox", beta: 0.9 }));
  const lo = M.betaToSlider(Math.sqrt(1 - 1 / 10.25 ** 2)), hi = M.betaToSlider(Math.sqrt(1 - 1 / 9.75 ** 2));
  assert.ok(lo - hi >= 0.005, "gamma 10 window is several slider steps wide");
});

test("mode param: lightspeed-ride is new and does not collide with the sandbox's modes", () => {
  assert.equal(M.MODE_PARAM, "lightspeed-ride");
  assert.ok(!(M.MODE_PARAM in MODE_ALIASES));
  for (const k of Object.keys(MODE_ALIASES)) assert.equal(modeFromQuery(k), MODE_ALIASES[k], k);
  assert.equal(modeFromQuery("light"), "lensing"); // ?mode=light still means light bending
});

test("page wiring: pre-paint theme, picked UI, sandbox untouched by default", () => {
  const html = read("study-relativity.html");
  assert.match(html, /get\("mode"\) !== "lightspeed-ride"/);
  assert.match(html, /popboard\.relativity\.lightspeed\.theme/);
  assert.match(html, /import\("\.\/relativity\/lightspeed\/ls-ui\.js"\)/);
  assert.match(html, /else import\("\.\/relativity-ui\.js"\)/);
  assert.ok(!/src="relativity-ui\.js"/.test(html));
  for (const id of ["mode-sr", "mode-gravity", "mode-curvature", "mode-clocks", "mode-lensing", "mode-guided", "betaRange", "gravityCanvas"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(read("relativity-ui.js"), /mode=lightspeed-ride/);
  for (const f of FILES) assert.ok(existsSync(new URL(f, pub)), f);
  assert.ok(existsSync(new URL("relativity/assets/lightspeed/cockpit-frame.webp", pub)));
});

test("UI requirements: sandbox, themes, sheet after controls, captions 12px, toasts in the panel, hooks", () => {
  const ui = read("relativity/lightspeed/ls-ui.js"), scene = read("relativity/lightspeed/ls-scene.js"), css = read("relativity/lightspeed/lightspeed-theme.css");
  assert.match(ui, /data-mode="sandbox"/);
  assert.match(css, /html\.ls-mode\[data-theme="light"\]/); assert.match(ui, /Paper/);
  const start = ui.slice(ui.indexOf("// ---------- start"));
  assert.ok(start.indexOf("renderMode()") < start.indexOf("phoneSync()"), "controls filled before the sheet is built");
  assert.match(ui, /start: 1/);
  assert.match(scene, /CAPTION_GAP = 12/); assert.match(ui, /a\.y \+ a\.h \+ CAPTION_GAP/);
  assert.match(ui, /id="lsToast"[^>]*>/); assert.ok(ui.indexOf('id="lsToast"') > ui.indexOf('id="lsControls"'), "toast lives in the controls");
  assert.match(ui, /window\.__lightspeed/);
  const hooks = ui.slice(ui.indexOf("window.__lightspeed"));
  for (const k of ["setBeta", "setEffect", "setCompare", "setSlider"]) assert.match(hooks, new RegExp(`${k}\\([^)]*\\) \\{[^}]*sync\\(\\)`), k);
  assert.match(ui, /prefers\.reducedMotion/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
});

test("docs, study card, and package script", () => {
  const sci = readFileSync(new URL("../docs/relativity-science.md", import.meta.url), "utf8");
  assert.ok(!sci.includes("TODO-TESLA")); assert.ok((sci.match(/Cleared by Tesla 2026-10-29/g) || []).length >= 10);
  assert.match(sci, /Brightness on screen scales as D\^2 \(the energy flux from a point-like star\), capped between 0\.02 and 6 so the picture stays readable\./);
  assert.match(sci, /McKinley & Doherty, Am\. J\. Phys\. 47, 309 \(1979\)/); assert.match(sci, /Rybicki & Lightman/);
  const fc = readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8"), sec = fc.slice(fc.indexOf("## Relativity: Lightspeed Ride"), fc.indexOf("## Shared layer constants"));
  assert.ok(!sec.includes("TODO-TESLA")); assert.match(sec, /0\.9947 to 0\.9952/); assert.match(sec, /0\.99499/);
  assert.match(readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8"), /## Relativity: Lightspeed Ride/);
  assert.match(read("study.html").split('id: "relativity"')[1].split("}")[0], /Lightspeed Ride/);
  assert.match(readFileSync(new URL("./package.json", import.meta.url), "utf8"), /relativity-lightspeed\.test\.mjs/);
});

test("Paper keeps black space and true star colors in the windshield", () => {
  const scene = read("relativity/lightspeed/ls-scene.js");
  const dark = scene.match(/: \{ page: "#0b0f17", sky: "(#[0-9a-f]+)"/), light = scene.match(/\? \{ page: "#f3efe4", sky: "(#[0-9a-f]+)"/);
  assert.ok(dark && light); assert.equal(light[1], dark[1]); assert.equal(light[1], "#03050b");
  assert.ok(!/pal\.light \?/.test(scene) && !/if \(pal\.light/.test(scene), "no Paper-only star styling");
});

test("phones: full-width cockpit and the half stop right under the caption", () => {
  const ui = read("relativity/lightspeed/ls-ui.js");
  assert.match(ui, /phone\.matches \? \{ x: 0, y: top, w: innerWidth,/);
  assert.match(ui, /room = capB > 0 \? Math\.floor\(innerHeight - capB - CAPTION_GAP\)/);
  assert.match(ui, /const half = Math\.max\(peek \+ 1, room\)/);
});

test("no em-dashes and no off-limits mascot name in the new copy", () => {
  const card = read("study.html").split('id: "relativity"')[1].split("}")[0].split("Lightspeed Ride mode")[1];
  const docs = ["relativity-science.md", "fun-challenges.md"].map((f) => readFileSync(new URL("../docs/" + f, import.meta.url), "utf8"));
  const section = docs[1].slice(docs[1].indexOf("## Relativity: Lightspeed Ride"), docs[1].indexOf("## Shared layer constants"));
  for (const t of [...FILES.map(read), card, docs[0], section]) { assert.ok(!t.includes("\u2014")); assert.ok(!new RegExp("ja" + "sper", "i").test(t)); }
});
