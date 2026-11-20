import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { flight, constants, resolvePreset, l1Speeds, samplePath, placePath } from "../public/orbit-lab/ol-model.js";
import { bodyOrbit, emptyFocus, resolvePreset as kcPreset } from "../public/kepler-circles/kc-model.js";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const orbits = JSON.parse(read("public/orbit-lab/assets/orbits.json"));
const olLessons = JSON.parse(read("public/orbit-lab/assets/lesson-presets.json"));
const kepler = JSON.parse(read("public/kepler-circles/assets/kepler.json"));
const kcLessons = JSON.parse(read("public/kepler-circles/assets/lesson-presets.json"));

test("both modules are registered in the study library", () => {
  const html = read("public/study.html");
  assert.match(html, /id: "orbit-lab"/);
  assert.match(html, /file: "study-orbit-lab\.html"/);
  assert.match(html, /id: "kepler-circles"/);
  assert.match(html, /file: "study-kepler-circles\.html"/);
});

test("study pages use the shared back convention and do not sign anyone in", () => {
  for (const name of ["public/study-orbit-lab.html", "public/study-kepler-circles.html"]) {
    const html = read(name);
    assert.match(html, /data-study-back/);
    assert.match(html, /astro-course\/story-return\.js/);
    assert.doesNotMatch(html, /firebase|signInAnonymously|getAuth\(/);
  }
  assert.match(read("public/orbit-lab/ol-ui.js"), /study\.html"\s*\+\s*location\.search/);
  assert.match(read("public/kepler-circles/kc-ui.js"), /study\.html"\s*\+\s*location\.search/);
});

test("pages load shared layout, Jost, Leo colors, and reduced-motion rules", () => {
  for (const [htmlFile, cssFile] of [
    ["public/study-orbit-lab.html", "public/orbit-lab/orbit-lab.css"],
    ["public/study-kepler-circles.html", "public/kepler-circles/kepler-circles.css"]
  ]) {
    const html = read(htmlFile), css = read(cssFile);
    assert.match(html, /shared\/layout\/layout\.css/);
    assert.match(css, /font-family: "Jost"/);
    assert.match(css, /#000000|#000\b/);
    assert.match(css, /#4caf50/i);
    assert.match(css, /#cccccc/i);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /max-width: 390px/);
  }
});

test("deep-link preset ids resolve, including short aliases", () => {
  assert.equal(resolvePreset(olLessons, "l1-s8").mode, "cannon");
  assert.equal(resolvePreset(olLessons, "l1").id, "l1-s8");
  assert.equal(resolvePreset(olLessons, "l4-s6").mode, "scale");
  assert.equal(resolvePreset(olLessons, "l5-s8").mode, "cannon");
  assert.equal(kcPreset(kcLessons, "l2-s5").mode, "circles");
  assert.equal(kcPreset(kcLessons, "l3").mode, "ellipses");
  assert.equal(resolvePreset(olLessons, "l1-s8").url, "study-orbit-lab.html?preset=l1-s8");
  assert.equal(kcPreset(kcLessons, "l2-s5").url, "study-kepler-circles.html?preset=l2-s5");
});

test("L1 cap: 300 and 600 m/s lobs land, times differ by 0.218%, well under 1%", () => {
  const { GM, R } = constants(orbits);
  const { cap, slow, fast } = l1Speeds(olLessons);
  assert.equal(cap, 600);
  assert.equal(slow, 300);
  assert.equal(fast, 600);
  const h = olLessons.cannon.altitude_m;
  const s = flight(slow, h, GM, R);
  const f = flight(fast, h, GM, R);
  assert.equal(s.kind, "lob");
  assert.equal(f.kind, "lob");
  const dt = (f.t - s.t) / s.t * 100;
  assert.ok(dt < 0.25, `dt ${dt}`);
  assert.ok(Math.abs(dt - 0.217746) < 0.001, dt);
  assert.ok(Math.abs(s.t - 40.523473) < 1e-4);
  assert.ok(Math.abs(f.t - 40.611711) < 1e-4);
  assert.ok(Math.abs(s.range - 12151.964) < 0.1);
  assert.ok(Math.abs(f.range - 24356.849) < 0.1);
  // 0.5% constant drift still well under 1%
  for (const [gm, r] of [[GM * 1.005, R], [GM * 0.995, R], [GM, R * 1.005], [GM, R * 0.995], [6.67e-11 * 5.97e24, R]]) {
    const a = flight(slow, h, gm, r), b = flight(fast, h, gm, r);
    const d = (b.t - a.t) / a.t * 100;
    assert.ok(d < 1, `dt ${d} at drifted constants`);
    assert.ok(d < 0.3, `dt ${d} should stay well under 1%`);
  }
  assert.equal(flight(fast + 1, h, GM, R).kind, "lob");
  const vc = Math.sqrt(GM / (R + h));
  assert.equal(flight(vc, h, GM, R).kind, "circular");
  assert.equal(resolvePreset(olLessons, "l1-s8").lockOrbitEscape, true);
  assert.equal(resolvePreset(olLessons, "l1-s8").speedMax_m_s, 600);
});

test("L4 hides g and period by default; Hubble is optional", () => {
  const p = resolvePreset(olLessons, "l4-s6");
  assert.equal(p.showReadouts, false);
  assert.equal(p.readoutToggle, true);
  assert.deepEqual(p.bodies, ["ISS", "Hubble", "Moon"]);
  assert.equal(orbits.orbits.ISS.altitude_km, 400);
  assert.equal(orbits.orbits.Hubble.altitude_km, 480);
  assert.equal(orbits.constants.R_E, 6380000);
});

test("L5 has five rising shot fractions ending at circular, plus ISS/GPS/GEO", () => {
  const p = resolvePreset(olLessons, "l5-s8");
  assert.equal(p.shotFractionsOfCircular.length, 5);
  assert.equal(p.shotFractionsOfCircular[4], 1);
  assert.equal(p.hideCircularSpeedLabel, true);
  assert.deepEqual(p.satelliteKeys, ["ISS", "GPS", "GEO"]);
});

test("L2 never draws an outward force; L3 uses unit eccentricities and an empty focus", () => {
  const ui = read("public/kepler-circles/kc-ui.js");
  assert.match(ui, /Cut the inward pull/);
  assert.match(ui, /never draws an outward force|no outward force/i);
  assert.doesNotMatch(ui, /addArrow\([^)]*outward/i);
  assert.equal(kepler.earth.eccentricity, 0.017);
  assert.equal(kepler.mars.eccentricity, 0.093);
  const earth = bodyOrbit(kepler, "Earth");
  const mars = bodyOrbit(kepler, "Mars");
  const comet = bodyOrbit(kepler, "Halley");
  assert.equal(earth.e, 0.017);
  assert.equal(mars.e, 0.093);
  assert.ok(comet.e > 0.9);
  const f = emptyFocus(comet.a, comet.e);
  assert.ok(f.x < 0);
  assert.equal(kcPreset(kcLessons, "l3-s6").drawEmptyFocus, true);
  assert.equal(kcPreset(kcLessons, "l3-s6").sunAtFocus, true);
});

test("Tesla-verified constants are the ones the model uses, and L1 sample paths land", () => {
  const { GM, R } = constants(orbits);
  assert.equal(GM, 3.98e14);
  assert.equal(R, 6.38e6);
  const path = samplePath(300, 8000, GM, R, 32);
  assert.equal(path.kind, "lob");
  assert.ok(path.points.length >= 8);
  const last = path.points[path.points.length - 1];
  const rEnd = Math.hypot(last.x, last.y);
  assert.ok(Math.abs(rEnd - R) < 1, rEnd);
});

test("both modules import the vendored three.js and GLTFLoader, not a CDN copy", () => {
  const scene = read("public/orbit-lab/ol-scene.js") + read("public/kepler-circles/kc-scene.js") + read("public/gravity-orbits/go-load.js");
  assert.match(scene, /vendor\/three\/three\.module\.min\.js/);
  assert.match(scene, /vendor\/three\/GLTFLoader\.js/);
  assert.match(scene, /vendor\/three\/meshopt_decoder\.mjs/);
  assert.doesNotMatch(scene, /cdn\.jsdelivr|unpkg|cdnjs/);
});

test("L1 shows air time in whole seconds so both lobs read the same", () => {
  const p = resolvePreset(olLessons, "l1-s8");
  assert.equal(p.airTimeDecimals, 0);
  const at8 = olLessons.l1_cap.at_teaching_height_8_km;
  assert.equal(at8.slow.t_s.toFixed(p.airTimeDecimals), at8.fast.t_s.toFixed(p.airTimeDecimals));
  assert.match(read("public/orbit-lab/ol-ui.js"), /toFixed\(airTimeDecimals\(\)\)/);
});

test("shared asset map ships 2k/default GLBs and not 4k planet files", () => {
  const map = JSON.parse(read("public/gravity-orbits/asset-map.json"));
  const models = map.models;
  assert.equal(models.earth, "models/earth_2k.glb");
  assert.equal(models.moon, "models/moon_2k.glb");
  assert.equal(models.mars, "models/mars_2k.glb");
  assert.equal(models.jupiter, "models/jupiter_2k.glb");
  assert.equal(models.cannon, "models/newton_cannon.glb");
  assert.equal(models.skybox, "models/starmap_2020_4k.jpg");
  assert.equal(models.skyboxMobile, "models/starmap_2020_2k.jpg");
  for (const kind of Object.keys(models)) {
    assert.ok(existsSync(new URL("public/gravity-orbits/" + models[kind], root)), models[kind]);
  }
  const files = readdirSync(new URL("public/gravity-orbits/models/", root));
  assert.equal(files.filter((f) => f.includes("_4k.glb") || f.includes("earth_night")).length, 0);
  const loaders = read("public/orbit-lab/ol-model.js") + read("public/kepler-circles/kc-model.js");
  assert.match(loaders, /gravity-orbits\/go-assets\.js/);
  assert.match(read("public/orbit-lab/ol-scene.js"), /function placeholderGlobe/);
  assert.match(read("THIRD-PARTY-NOTICES.md"), /Solar System Scope/);
  assert.match(read("THIRD-PARTY-NOTICES.md"), /NASA \/ Ernie Wright/);
});

test("placePath remaps a physical lob onto a visual muzzle without changing the last radius ratio", () => {
  const { GM, R } = constants(orbits);
  const path = samplePath(300, 8000, GM, R, 32);
  const pose = { x: 1.25, y: 0, z: 0, radius: 1.25, direction: { x: 0, y: 1, z: 0 } };
  const pts = placePath(path.points, R, pose, 1);
  assert.equal(pts.length, path.points.length);
  const r0 = Math.hypot(pts[0].x, pts[0].y, pts[0].z) / R;
  const r1 = Math.hypot(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z) / R;
  assert.ok(Math.abs(r0 - 1.25) < 1e-6, r0);
  assert.ok(r1 < r0);
});
