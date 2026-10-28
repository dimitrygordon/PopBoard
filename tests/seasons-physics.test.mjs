import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as P from "../public/seasons-physics.js";

const pub = (f) => readFileSync(new URL("../public/" + f, import.meta.url), "utf8");
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const defaults = () => Object.fromEntries(Object.entries(P.SLIDERS).map(([k, s]) => [k, s.value]));

test("solstice declination equals the tilt, equinox near 0", () => {
  const jun = P.declination(P.sunAt(P.dayOfYear(5, 21) + 0.5).lon, 23.44);
  near(jun, 23.44, 0.05, "June solstice");
  const dec = P.declination(P.sunAt(P.dayOfYear(11, 21) + 0.5).lon, 23.44);
  near(dec, -23.44, 0.05, "December solstice");
  near(P.declination(P.sunAt(P.dayOfYear(2, 20) + 0.6).lon, 23.44), 0, 0.3, "March equinox");
  near(P.declination(90, 60), 60, 1e-9, "tilt 60");
});

test("day length: equinox a little over 12 h, polar night and midnight sun", () => {
  const h = P.dayLength(42, 0); assert.ok(h > 12.05 && h < 12.2, `equinox ${h}`);
  assert.equal(P.dayLength(80, -23.44), 0);
  assert.equal(P.dayLength(80, 23.44), 24);
  near(P.dayLength(0, 23.44), 12.12, 0.05, "equator");
  near(P.dayLength(42, 23.44), 15.25, 0.1, "42N June");
});

test("noon altitude and spread factor", () => {
  near(P.noonAltitude(42, 23.44), 71.44, 1e-9, "42N June");
  near(P.noonAltitude(42, -23.44), 24.56, 1e-9, "42N Dec");
  near(P.spreadFactor(30), 2, 1e-9, "30 deg spreads light over 2x the area");
});

test("daily insolation: June pole beats equator, polar night is zero", () => {
  const R = 1.0167;
  const pole = P.dailyInsolation(90, 23.44, R), eq = P.dailyInsolation(0, 23.44, R);
  assert.ok(pole > eq, `pole ${pole} eq ${eq}`);
  near(pole, 1361 / R / R * Math.sin(23.44 * P.DEG), 2, "pole June");
  assert.equal(P.dailyInsolation(80, -23.44, 0.9833), 0);
});

test("perihelion early January, drifts later over millennia", () => {
  const t = P.perihelion2026(); assert.ok(t > 1 && t < 5, `perihelion t ${t}`);
  const d = P.perihelionDayOfYear(12500); assert.ok(d > 175 && d < 195, `12500 perihelion day ${d}`);
});

test("the four 2026 eclipses classify correctly", () => {
  for (const e of P.ECLIPSES_2026) {
    const s = P.eclipseState(e.t);
    assert.equal(e.kind === "solar" ? s.solar.type : s.lunar.type, e.expect, e.label);
  }
  const jan = P.eclipseState(P.nearestSyzygy(P.dayOfYear(0, 18), 0));
  assert.equal(jan.solar.type, "none", "Jan 18 new Moon is not an eclipse");
});

test("with Moon tilt 0 every new and full Moon is an eclipse", () => {
  const list = P.syzygies(0, 120, { inclinationDeg: 0 });
  assert.ok(list.length >= 7);
  for (const s of list) assert.notEqual(s.type, "none", `${s.kind} at ${s.t}`);
});

test("ecliptic limits are in the textbook range", () => {
  const L = P.eclipseLimits();
  near(L.solar, 17, 1.5, "solar"); near(L.lunarUmbral, 11, 1.5, "lunar umbral");
  near(P.ECLIPSE_YEAR_DAYS, 346.62, 0.01, "eclipse year");
});

test("pole stars across precession", () => {
  assert.equal(P.nearestPoleStar(2000).name, "Polaris"); assert.ok(P.nearestPoleStar(2000).sep < 1);
  assert.equal(P.nearestPoleStar(-2800).name, "Thuban");
  assert.equal(P.nearestPoleStar(14000).name, "Vega"); assert.ok(P.nearestPoleStar(14000).sep < 7);
  assert.equal(P.PRECESSION_YEARS_ROUNDED, 25800);
});

test("eclipse classifiers match the inline code in study-eclipses.html", () => {
  const html = pub("study-eclipses.html");
  const grab = (name) => { const i = html.indexOf("function " + name + "("); let j = html.indexOf("{", i), d = 0;
    for (let k = j; k < html.length; k++) { if (html[k] === "{") d++; else if (html[k] === "}" && --d === 0) return html.slice(i, k + 1); } };
  const names = ["degToRad", "radToDeg", "vec", "vSub", "vLen", "vNorm", "vDot", "vNeg", "angleBetween", "shadowCone", "umbraRadiusAt", "penumbraRadiusAt", "classifySolarEclipse", "classifyLunarEclipse"];
  const lib = new Function(names.map(grab).join("\n") + "\nreturn { classifySolarEclipse, classifyLunarEclipse };")();
  for (let t = 0; t < 365; t += 3.7) for (const inc of [0, 2, 5.15]) {
    const g = P.geometryAt(t, { inclinationDeg: inc });
    assert.equal(P.classifySolarEclipse(g).type, lib.classifySolarEclipse(g).type, `solar t=${t}`);
    assert.equal(P.classifyLunarEclipse(g).type, lib.classifyLunarEclipse(g).type, `lunar t=${t}`);
  }
});

test("moon phase helpers agree with the moon module", () => {
  near(P.illuminatedFraction(0), 0, 1e-9, "new"); near(P.illuminatedFraction(180), 1, 1e-9, "full");
  near(P.illuminatedFraction(90), 0.5, 1e-9, "quarter");
  assert.equal(P.phaseName(180), "Full Moon");
  assert.ok(pub("study-moon.html").length > 0);
});

test("?mode= deep links, including sandbox", () => {
  for (const m of P.MODES) assert.equal(P.modeFromSearch("?mode=" + m), m);
  assert.equal(P.modeFromSearch("?mode=sandbox"), "sandbox");
  assert.equal(P.modeFromSearch("?mode=free"), "sandbox");
  assert.equal(P.modeFromSearch(""), "seasons");
  assert.equal(P.modeFromSearch("?mode=nonsense"), "seasons");
  const p = P.paramsFromSearch("?tilt=60&lat=999&year=14000");
  assert.equal(p.tilt, 60); assert.equal(p.lat, 90); assert.equal(p.year, 14000);
});

test("no shown value jumps more than 2x between adjacent slider steps", () => {
  const ui = pub("seasons-ui.js");
  for (const mode of P.MODES) {
    const keys = Object.keys(P.SLIDERS);
    for (const key of keys) {
      const steps = P.sliderSteps(key);
      const stride = Math.max(1, Math.floor(steps.length / 400));
      const all = [];
      for (let i = 0; i < steps.length; i += stride) all.push([i, P.readouts(mode, { ...defaults(), mode, [key]: steps[i] })]);
      const scale = {};
      for (const [, rows] of all) for (const r of rows) if (typeof r.num === "number" && isFinite(r.num)) scale[r.label] = Math.max(scale[r.label] || 0, Math.abs(r.num));
      let prev = null;
      for (const [i, rows] of all) {
        if (prev) for (const r of rows) {
          const q = prev.find((x) => x.label === r.label);
          if (!q || typeof r.num !== "number" || typeof q.num !== "number" || !isFinite(r.num) || !isFinite(q.num) || r.noSweep) continue;
          const a = Math.abs(q.num), b = Math.abs(r.num);
          if (r.zeroOk && (Math.sign(q.num) !== Math.sign(r.num) || Math.min(a, b) < Math.max(1, 0.25 * scale[r.label]))) continue;
          if (Math.min(a, b) === 0) continue;
          assert.ok(Math.max(a, b) / Math.min(a, b) <= 2, `${mode} ${key}=${steps[i]} "${r.label}" ${q.num} -> ${r.num}`);
        }
        prev = rows;
      }
    }
  }
  assert.ok(ui.length);
});

test("sandbox exposes every slider and has readouts and a caption", () => {
  const ui = pub("seasons-ui.js");
  assert.match(ui, /sandbox: \["tilt", "date", "hour", "lat", "incl", "year"\]/);
  assert.ok(P.readouts("sandbox", defaults()).length >= 6);
  assert.ok(P.CAPTIONS.sandbox.length > 20);
});

test("wiring: Back pattern, gallery card, theme, 44px, reduced motion", () => {
  const ui = pub("seasons-ui.js"), css = pub("seasons-theme.css"), html = pub("study-seasons-eclipses.html"), study = pub("study.html");
  assert.match(ui, /location\.href = "study\.html" \+ location\.search/);
  assert.match(study, /seasons-eclipses/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /--se-hit: 44px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(html, /id="themeBtn"/);
});

test("light and dark text tokens keep 4.5:1 contrast", () => {
  const css = pub("seasons-theme.css");
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const get = (block, k) => (block.match(new RegExp(k + ":\\s*(#[0-9a-f]{6})")) || [])[1];
  const dark = css.slice(0, css.indexOf('html[data-theme="light"]')), light = css.slice(css.indexOf('html[data-theme="light"]'));
  for (const [blk, name] of [[dark, "dark"], [light, "light"]]) for (const fg of ["--se-text", "--se-dim"]) for (const bg of ["--se-space", "--se-panel"]) {
    const f = get(blk, fg) || get(dark, fg), b = get(blk, bg) || get(dark, bg);
    assert.ok(cr(f, b) >= 4.5, `${name} ${fg} on ${bg}: ${cr(f, b).toFixed(2)}`);
  }
});

test("no em-dashes in the new files", () => {
  for (const f of ["seasons-physics.js", "seasons-render.js", "seasons-ui.js", "seasons-theme.css", "study-seasons-eclipses.html"])
    assert.ok(!pub(f).includes("\u2014"), f);
  assert.ok(!readFileSync(new URL("../docs/seasons-eclipses-science.md", import.meta.url), "utf8").includes("\u2014"));
});

test("science fixes: size percent agrees with arcminute readouts on Aug 12 2026", () => {
  const e = P.ECLIPSES_2026.find((x) => x.id === "aug12"), d = Math.floor(e.t);
  const rows = P.readouts("eclipses", { ...defaults(), date: d, hour: (e.t - d) * 24 });
  const m = rows.find((r) => r.label === "Sun / Moon size in the sky").text.match(/([\d.]+)\u2032 \/ ([\d.]+)\u2032/);
  const pct = Math.round((Number(m[2]) / Number(m[1]) - 1) * 100);
  assert.equal(pct, 3);
  assert.match(rows.find((r) => r.label === "Moon compared with the Sun").text, new RegExp(`about ${pct}% wider`));
  assert.ok(rows.some((r) => /square to the shadow axis/.test(r.label)));
});
test("science fixes: noon Sun direction in the tropics, day length at 42N on the equinox", () => {
  assert.equal(P.noonDirection(42, 23.4), "due south");
  assert.equal(P.noonDirection(10, 23.4), "due north");
  assert.equal(P.noonDirection(23.4, 23.4), "overhead");
  assert.equal(P.noonDirection(-30, -23.4), "due north");
  assert.equal(P.fmtHours(P.dayLength(42, 0)), "12 h 09 min");
  const lim = P.eclipseLimits();
  assert.equal(Math.round(lim.solar), 17); assert.equal(Math.round(lim.lunarUmbral), 11);
  assert.equal(P.SLIDERS.tilt.value, 23.4);
});
