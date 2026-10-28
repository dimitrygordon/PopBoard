import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import * as P from "../public/em-spectrum/emspec-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.abs(b);
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");

test("exact SI constants and hc in eV nm", () => {
  assert.equal(P.C, 299792458);
  assert.equal(P.H, 6.62607015e-34);
  assert.equal(P.EV, 1.602176634e-19);
  assert.ok(close(P.HC_EV_NM, 1239.84198, 1e-7));
});

test("c = lambda f holds across the whole slider", () => {
  for (let t = 0; t <= 1; t += 0.01) {
    const l = P.sliderToWavelength(t);
    assert.ok(close(l * P.frequencyFromWavelength(l), P.C, 1e-12));
    assert.ok(close(P.wavelengthFromFrequency(P.frequencyFromWavelength(l)), l, 1e-12));
  }
  assert.ok(close(P.frequencyFromWavelength(0.21), 1.4276e9, 1e-4));
});

test("linked log sliders: wavelength and frequency positions round-trip and mirror", () => {
  for (const l of [1e-13, 1e-10, 550e-9, 1e-3, 0.21, 1000]) {
    const t = P.wavelengthToSlider(l);
    assert.ok(close(P.sliderToWavelength(t), l, 1e-12));
    const f = P.frequencyFromWavelength(l);
    assert.ok(Math.abs(P.frequencyToSlider(f) - (1 - t)) < 1e-12);
    assert.ok(close(P.sliderToFrequency(P.frequencyToSlider(f)), f, 1e-12));
  }
  assert.equal(P.sliderToWavelength(-1), 1e-14);
  assert.equal(P.sliderToWavelength(2), 1e4);
});

test("E = h f in J and eV; green light is about 2.25 eV", () => {
  const f = P.frequencyFromWavelength(550e-9);
  assert.ok(close(P.photonEnergyJ(f), P.H * f, 1e-15));
  assert.ok(close(P.photonEnergyEV(f), 2.2543, 1e-4));
  assert.ok(close(P.energyFromWavelengthEV(1e-9), 1239.84, 1e-5));
  assert.ok(close(P.wavelengthFromEnergyEV(13.6), 91.165e-9, 1e-4));
  assert.ok(close(P.thermalEnergyEV(300), 0.025852, 1e-4));
  assert.ok(P.photonEnergyEV(P.frequencyFromWavelength(1e-12)) > 1e6);
});

test("bands tile the spectrum in order with no gaps", () => {
  assert.deepEqual(P.BAND_IDS, ["radio", "infrared", "visible", "ultraviolet", "xray", "gamma"]);
  for (let i = 1; i < P.BANDS.length; i++) assert.equal(P.BANDS[i].max, P.BANDS[i - 1].min);
  assert.equal(P.bandOf(0.21).id, "radio");
  assert.equal(P.bandOf(10e-6).id, "infrared");
  assert.equal(P.bandOf(550e-9).id, "visible");
  assert.equal(P.bandOf(700e-9).id, "infrared");
  assert.equal(P.bandOf(380e-9).id, "visible");
  assert.equal(P.bandOf(150e-9).id, "ultraviolet");
  assert.equal(P.bandOf(1e-10).id, "xray");
  assert.equal(P.bandOf(1e-12).id, "gamma");
  for (const b of P.BANDS) assert.equal(P.bandOf(b.center).id, b.id, b.id);
});

test("ionizing threshold sits in the UV", () => {
  assert.equal(P.isIonizing(P.energyFromWavelengthEV(550e-9)), false);
  assert.equal(P.isIonizing(P.energyFromWavelengthEV(100e-9)), true);
  const edge = P.wavelengthFromEnergyEV(P.IONIZING_EV);
  assert.equal(P.bandOf(edge).id, "ultraviolet");
});

test("atmosphere: radio and optical windows open, the rest closed", () => {
  for (const l of [1e-13, 1e-10, 1e-8, 150e-9, 250e-9]) assert.equal(P.transmission(l), 0, String(l));
  for (const l of [450e-9, 550e-9, 650e-9, 0.02, 0.21, 5]) assert.ok(P.transmission(l) > 0.7, String(l));
  assert.ok(P.transmission(10e-6) > 0.5, "10 um window");
  assert.ok(P.transmission(6.5e-6) < 0.05, "water band");
  assert.ok(P.transmission(100e-6) < 0.05, "far IR");
  assert.equal(P.transmission(100), 0, "ionosphere");
  for (let t = 0; t <= 1; t += 0.001) {
    const v = P.transmission(P.sliderToWavelength(t));
    assert.ok(v >= 0 && v <= 1);
    assert.ok(close(P.opacity(P.sliderToWavelength(t)) + v, 1, 1e-12));
  }
  for (let i = 1; i < P.TRANSMISSION.length; i++) assert.ok(P.TRANSMISSION[i][0] > P.TRANSMISSION[i - 1][0]);
});

test("atmosphere stop altitudes match which bands reach the ground", () => {
  for (const id of P.BAND_IDS) {
    const a = P.ATMOSPHERE[id];
    assert.ok(a && a.by.length > 10, id);
    if (a.reaches === true) assert.equal(a.stopKm, 0, id);
    else assert.ok(a.stopKm > 0, id);
  }
  assert.ok(P.ATMOSPHERE.ultraviolet.stopKm > P.LAYERS_KM.troposphere && P.ATMOSPHERE.ultraviolet.stopKm < P.LAYERS_KM.stratosphere);
  assert.equal(P.altitudeToArtY(0), P.ART_Y.ground);
  assert.equal(P.altitudeToArtY(12), P.ART_Y.troposphere);
  assert.equal(P.altitudeToArtY(50), P.ART_Y.stratosphere);
  let prev = 2;
  for (let km = 0; km <= 150; km += 1) { const y = P.altitudeToArtY(km); assert.ok(y < prev); prev = y; }
});

test("telescopes: one per band and diffraction limits", () => {
  for (const id of P.BAND_IDS) assert.equal(P.telescopeFor(id).band, id);
  assert.ok(close(P.diffractionLimitArcsec(0.21, 100), 528.45, 1e-4));
  assert.ok(close(P.diffractionLimitArcsec(550e-9, 2.4), 0.05767, 1e-3));
  assert.ok(close(P.diffractionLimitArcsec(2e-6, 6.5), 0.07743, 1e-3));
  assert.equal(P.telescopeFor("xray").optics, "grazing");
  assert.equal(P.telescopeFor("gamma").D, null);
  assert.equal(P.telescopeFor("radio").where, "ground");
  for (const id of ["ultraviolet", "xray", "gamma"]) assert.equal(P.telescopeFor(id).where, "space");
});

test("every object has a caption for every band and its art ships", () => {
  for (const o of P.OBJECTS) for (const id of P.BAND_IDS) {
    assert.ok(o.views[id] && o.views[id].length > 10, `${o.id} ${id}`);
    assert.ok(existsSync(new URL(`em-spectrum/assets/${o.art}-${id}-mask.webp`, pub)), `${o.art}-${id}`);
  }
  for (const t of P.TELESCOPES) assert.ok(existsSync(new URL(`em-spectrum/assets/${t.art}.webp`, pub)), t.art);
  for (const s of P.SCALE) assert.ok(existsSync(new URL(`em-spectrum/assets/scale-${s.id}.webp`, pub)), s.id);
  assert.equal(P.nearestScale(550e-9).id, "cell");
  assert.equal(P.nearestScale(1e-10).id, "atom");
});

test("deep links parse mode, band and object with aliases and fallbacks", () => {
  assert.deepEqual(P.parseQuery(""), { mode: "wave", band: null, object: null });
  assert.deepEqual(P.parseQuery("?mode=sky&band=x-ray&object=sun"), { mode: "sky", band: "xray", object: "sun" });
  assert.equal(P.parseQuery("?mode=Atmosphere").mode, "atmosphere");
  assert.equal(P.parseQuery("?mode=photon").mode, "energy");
  assert.equal(P.parseQuery("?mode=telescope&band=ir").band, "infrared");
  assert.deepEqual(P.parseQuery("?mode=nope&band=nope&object=nope"), { mode: "wave", band: null, object: null });
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
});

test("formatting picks sensible units", () => {
  assert.equal(P.formatLength(550e-9), "550 nm");
  assert.equal(P.formatLength(0.21), "21 cm");
  assert.equal(P.formatFrequency(5.45e14), "545 THz");
  assert.equal(P.formatEnergyEV(2.25), "2.25 eV");
  assert.equal(P.formatEnergyEV(12398.4), "12.4 keV");
  assert.equal(P.sci(299792458), "3 \u00d7 10\u2078");
  assert.equal(P.sci(1.602e-19, 4), "1.602 \u00d7 10\u207b\u00b9\u2079");
});

test("page, gallery card and module files follow the study pattern", () => {
  const html = read("study-em-spectrum.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /em-spectrum\/emspec-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  const ui = read("em-spectrum/emspec-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /prefers-reduced-motion/);
  const phys = read("em-spectrum/emspec-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "em-spectrum"/);
  assert.match(gallery, /file: "study-em-spectrum\.html"/);
  assert.match(read("em-spectrum/emspec-theme.css"), /--es-hit: 44px/);
  const files = ["study-em-spectrum.html", ...readdirSync(new URL("em-spectrum/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "em-spectrum/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/em-spectrum-science.md", import.meta.url), "utf8"), /\u2014/);
  // only WebP art ships
  for (const n of readdirSync(new URL("em-spectrum/assets/", pub))) assert.match(n, /\.webp$/);
});

test("science captions: band boundaries, X-ray Sun, gamma stop", () => {
  assert.match(P.BAND_BOUNDARY_NOTE, /^Boundaries between bands are conventions, not sharp edges\./);
  assert.match(P.BAND_BOUNDARY_NOTE, /by source/);
  assert.match(P.objectById("sun").views.xray, /coronal holes/);
  assert.match(P.ATMOSPHERE.gamma.by, /Gamma rays are more penetrating, so they reach lower before the air stops them\./);
  assert.ok(P.ATMOSPHERE.gamma.stopKm < P.ATMOSPHERE.xray.stopKm);
});

test("no em-dashes in em-spectrum sources", async () => {
  const fs = await import("node:fs");
  for (const f of ["emspec-physics.js", "emspec-ui.js", "emspec-render.js"]) {
    const s = fs.readFileSync(new URL(`../public/em-spectrum/${f}`, import.meta.url), "utf8");
    assert.ok(!s.includes("\u2014"), f);
  }
});

test("art anchors match MANIFEST", () => {
  const A = P.ART_ANCHORS;
  assert.equal(A.sun.xrayCoronaMedianR, 321); assert.equal(A.sun.diskR, 300); assert.deepEqual(A.sun.center, [512, 512]);
  assert.deepEqual(A.galaxy.halfAxes, [447, 284]); assert.deepEqual(A.galaxy.radioHalfAxes, [479, 312]);
  assert.deepEqual(A.crab.halfAxes, [416, 288]); assert.deepEqual(A.crab.radioHalfAxes, [416, 300]); assert.equal(A.crab.tiltDeg, -20);
  assert.deepEqual(A.reflector.center, [476, 511]);
  assert.ok(A.reflector.eyepieceTip[1] < 512, "eyepiece near the front (top) end");
  assert.equal(P.artRecenter("telescope-optical-reflector"), "translate(3.52%, 0.10%)");
  assert.equal(P.artRecenter("telescope-radio-dish"), "");
});
