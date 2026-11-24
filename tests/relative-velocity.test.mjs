// Relative Velocity Exploration: Galilean physics, frame switch and module scaffold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import * as P from "../public/relative-velocity/rv-physics.js";
import { ART, BEADS, artFiles, artUrl, shown } from "../public/relative-velocity/rv-art.js";
import { STRINGS, PLACEHOLDER } from "../public/relative-velocity/rv-strings.js";

const pub = new URL("../public/", import.meta.url);
const read = (p) => readFileSync(new URL(p, pub), "utf8");
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-12, `${msg}: ${a} vs ${b}`);
const C = P.CONFIG;

test("river: still water, downstream and upstream are plain Galilean sums", () => {
  const vb = C.river.boatSpeed, u = C.river.flowRate;
  close(P.boatGround(1, vb, 0), vb, "still downstream");
  close(P.boatGround(-1, vb, 0), -vb, "still upstream");
  close(P.boatGround(1, vb, u), vb + u, "downstream");
  close(P.boatGround(-1, vb, u), -vb + u, "upstream");
  close(P.boatGround(1, 0.5, 0.2), 0.7, "0.50 + 0.20");
  close(Math.abs(P.boatGround(-1, 0.5, 0.2)), 0.3, "0.50 - 0.20");
  for (const L of [1, 1.5, 2, 3.5, 5]) {
    close(P.travelTime(L, P.boatGround(1, vb, 0), 1), L / vb, `still time L=${L}`);
    close(P.travelTime(L, P.boatGround(1, vb, u), 1), L / (vb + u), `down time L=${L}`);
    close(P.travelTime(L, P.boatGround(-1, vb, u), -1), L / (vb - u), `up time L=${L}`);
  }
  assert.equal(P.travelTime(2, P.boatGround(-1, 0.3, 0.3), -1), Infinity, "no headway when the flow matches the boat");
  assert.equal(P.travelTime(2, P.boatGround(-1, 0.2, 0.3), -1), Infinity, "swept backward never arrives");
  // beads (the leaf) move with the water
  const r = P.readout("river", { heading: 1, boatSpeed: vb, flow: u }, "shore");
  close(r.viewers.leaf, u, "leaf moves at the water speed");
});

test("lab helpers: averages, measured speed and percent difference", () => {
  close(P.average([4, 4.2, 3.8]), 4, "average");
  assert.ok(Number.isNaN(P.average([])));
  close(P.measuredSpeed(2, 4), 0.5, "L / t");
  close(P.percentDiff(0.7, 0.7), 0, "exact");
  close(P.percentDiff(0.77, 0.7), 10, "10 percent high");
});

test("truck: thrown backward at the truck's speed, the ball drops straight down in the ground frame", () => {
  for (let mph = 0; mph <= 40; mph++) {
    const p = { truckSpeedMph: mph, throwSpeedMph: mph, throwDir: -1, released: true };
    const r = P.readout("truck", p, "ground");
    assert.equal(r.objGround, 0, `${mph} mph: ball/ground is exactly 0`);
    close(r.objMedium, -P.toMs(mph), "ball/truck backward");
    const a = P.ballAfterRelease(0, 12, r.objGround, C.truck.releaseHeight);
    const b = P.ballAfterRelease(P.fallTime(C.truck.releaseHeight), 12, r.objGround, C.truck.releaseHeight);
    assert.equal(a.x, b.x, "lands right under the release point");
    assert.ok(b.landed && b.y === 0);
    // the truck sees it fly backward at the throw speed
    close(P.readout("truck", p, "truck").objViewer, -P.toMs(mph), "truck frame");
  }
  const d = P.readout("truck", { truckSpeedMph: 25, throwSpeedMph: 25, throwDir: -1, released: true }, "ground");
  assert.equal(d.unit, "mph");
  close(P.toMph(d.mediumGround), 25, "25 mph truck");
  close(P.toMs(1), 0.44704, "exact mph");
  close(P.fallTime(1.5), Math.sqrt(3 / P.G), "fall time");
});

test("frame switch: the chosen viewer is at rest and the readout identity holds", () => {
  const cases = {
    river: [{ heading: 1, boatSpeed: 0.5, flow: 0.2 }, { heading: -1, boatSpeed: 0.5, flow: 0.2 }, { heading: 1, boatSpeed: 0.5, flow: 0 }],
    truck: [{ truckSpeedMph: 25, throwSpeedMph: 25, throwDir: -1, released: true }, { truckSpeedMph: 30, throwSpeedMph: 10, throwDir: 1, released: true }, { truckSpeedMph: 25, throwSpeedMph: 25, throwDir: 0, released: true }],
    walkway: [{ beltSpeed: 0.65, walkSpeed: 1.4, walkDir: 1 }, { beltSpeed: 0.65, walkSpeed: 1.4, walkDir: -1 }, { beltSpeed: 0.65, walkSpeed: 1.4, walkDir: 0 }],
    kart: [{ kartSpeedMph: 40, boostSpeedMph: 20, rivalSpeedMph: 50, boostOn: true }, { kartSpeedMph: 40, boostSpeedMph: 20, rivalSpeedMph: 50, boostOn: false }],
  };
  for (const [scene, list] of Object.entries(cases)) {
    for (const p of list) {
      const ground = P.readout(scene, p, P.FRAMES[scene][0]);
      for (const f of P.FRAMES[scene]) {
        const r = P.readout(scene, p, f);
        close(r.viewers[f], 0, `${scene}/${f}: viewer at rest`);
        close(r.objViewer, r.objMedium + r.mediumViewer, `${scene}/${f}: v(obj/viewer) = v(obj/medium) + v(medium/viewer)`);
        close(r.objViewer, ground.objGround - r.viewerGround, `${scene}/${f}: subtract the viewer`);
        close(r.objGround, r.objMedium + r.mediumGround, `${scene}/${f}: ground sum`);
        for (const k of P.FRAMES[scene]) close(r.viewers[k], ground.viewers[k] - r.viewerGround, `${scene}/${f}: ${k} seen by ${f}`);
      }
    }
  }
  close(P.readout("walkway", cases.walkway[1], "floor").objGround, -0.75, "against the belt");
  close(P.toMph(P.readout("kart", cases.kart[0], "rival").objViewer), 10, "kart 60 mph vs rival 50 mph");
  assert.equal(P.frameShift(5, 2), 3);
});

test("config holds Dimitry's defaults in one block", () => {
  assert.equal(C.truck.truckSpeedMph, 25);
  assert.equal(C.truck.throwSpeedMph, 25);
  assert.equal(C.truck.throwDir, -1);
  assert.equal(C.river.lengthMin, 1);
  assert.equal(C.river.lengthMax, 3);
  // Bow-anchored boat: the gates are centered on the 5 m channel and the whole hull must fit behind
  // the start gate going either way, at every length the slider allows.
  const ppm = (1376.5 - 223) / 5, b = ART.boat;
  const hull = ((b.anchor[0] - b.stern) * b.show[0]) / b.png[0] / ppm;
  assert.ok(hull > 0.8 && hull < 0.9, "hull " + hull);
  for (let L = C.river.lengthMin; L <= C.river.lengthMax + 1e-9; L += C.river.lengthStep) assert.ok((5 - L) / 2 >= hull, "fits at L=" + L);
  assert.ok(C.river.flowRate < C.river.boatSpeed, "upstream runs always make headway in the lab");
  assert.ok(C.river.flowRateMax < C.river.boatSpeed, "and in free runs");
  assert.deepEqual(Object.keys(P.FRAMES), ["river", "truck", "walkway", "kart"]);
  assert.deepEqual(P.FRAMES.river, ["shore", "leaf", "boat"]);
  assert.deepEqual(P.FRAMES.truck, ["ground", "truck", "ball"]);
  assert.deepEqual(P.FRAMES.walkway, ["floor", "belt", "walker"]);
  assert.deepEqual(P.FRAMES.kart, ["track", "rival", "kart"]);
});

test("art slots: Leo's set as webp, one file per object, light and dark backdrops", () => {
  for (const n of ["channel", "ruler", "boat", ...BEADS, "truck", "basketball", "walkway", "walker", "kart", "kart-rival", "boost-pad", "stopwatch", "valve-knob", "clipboard"]) assert.ok(ART[n], n);
  for (const s of ["river", "truck", "walkway", "kart"]) assert.ok(ART["bg-" + s].themed && ART["bg-" + s].tiles, s + " is a themed, seamless tile");
  assert.equal(ART["bg-river"].src, "bg_lab_{theme}.png", "the lab repeats bg_lab_*, never the with_channel files");
  // backdrops repeat directly: one 1600 px image per pattern, no mirrored copy
  const ui = read("relative-velocity/rv-ui.js");
  const bd = ui.slice(ui.indexOf("function backdrop("), ui.indexOf("function tilePattern("));
  assert.match(bd, /width: 1600, height: 900/);
  assert.doesNotMatch(bd, /scale\(-1|3200|flip/);
  const shipped = readdirSync(new URL("relative-velocity/art/", pub));
  for (const f of artFiles()) assert.ok(shipped.includes(f + ".webp"), "missing " + f);
  for (const f of shipped) assert.ok(artFiles().includes(f.replace(/\.webp$/, "")) && f.endsWith(".webp"), "unused " + f);
  assert.equal(artUrl("bg-river", "dark"), "relative-velocity/art/bg-river-dark.webp");
  assert.equal(artUrl("boat", "dark"), "relative-velocity/art/boat.webp");
  // the channel never exceeds 1200 px on the 1600 px stage, and keeps Leo's aspect ratio
  assert.ok(shown("channel").w <= 1200);
  for (const [n, a] of Object.entries(ART)) if (a.show) assert.ok(Math.abs(a.show[0] / a.show[1] - a.png[0] / a.png[1]) / (a.png[0] / a.png[1]) < 0.02 || n === "boost-pad", "aspect " + n);
  const readme = read("relative-velocity/README.md");
  for (const f of artFiles()) assert.match(readme, new RegExp(f.replace(/[-]/g, "\\-") + "\\.webp"), "README lists " + f);
});

test("strings: one file for Socrates, every data-str key resolves", () => {
  assert.equal(PLACEHOLDER, true);
  const html = read("study-relative-velocity.html");
  const keys = [...html.matchAll(/data-str="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 10);
  for (const k of keys) assert.match(String(k.split(".").reduce((o, x) => o && o[x], STRINGS)), /\S/, k);
  assert.match(read("relative-velocity/rv-strings.js"), /SOCRATES: every entry below is a PLACEHOLDER/);
});

test("page, card, link and files follow the study pattern", () => {
  const html = read("study-relative-velocity.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /relative-velocity\/rv-ui\.js/);
  assert.match(html, /popboard\.relative-velocity\.theme/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  // Lab first, then the Explore group
  const lab = html.indexOf('data-scene="river"'), explore = html.indexOf('data-str="exploreHeading"');
  assert.ok(lab > 0 && explore > lab);
  for (const s of ["truck", "walkway", "kart"]) assert.ok(html.indexOf(`data-scene="${s}"`) > explore, s);
  const ui = read("relative-velocity/rv-ui.js");
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.doesNotMatch(read("relative-velocity/rv-physics.js") + read("relative-velocity/rv-config.js"), /\bdocument\.|\bwindow\.|localStorage/);
  const css = read("relative-velocity/rv.css");
  assert.match(css, /--rv-paper: #FCF7EB/);
  assert.match(css, /:root\[data-theme="dark"\] \{\s*--rv-paper: #1F1D1A/);
  assert.match(css, /--rv-obj: #6FA3E0/);
  assert.match(css, /prefers-reduced-motion/);
  // gallery card sits with the motion modules, right after Projectile Motion
  const gallery = read("study.html");
  const card = gallery.split('id: "projectile"')[1].split('id: "em-fields"')[0];
  assert.match(card, /id: "relative-velocity"/);
  assert.match(card, /file: "study-relative-velocity\.html"/);
  assert.match(read("_redirects"), /^\/relative-velocity\/art\/\*\s+\/404\.html\s+404$/m);
  // Physics 101 M6 L3 Try it card
  const map = JSON.parse(read("physics101/tryit/map.json"));
  assert.deepEqual(map["m06-l03"].map((r) => r.id), ["relative-velocity"]);
  const tryit = read("physics101/tryit.js");
  assert.match(tryit, /"relative-velocity": \["Relative Velocity Exploration", "study-relative-velocity\.html", "physics101\/tryit\/thumbs\/study-relative-velocity\.webp", "physics101\/tryit\/thumbs\/study-relative-velocity-dark\.webp"\]/);
  for (const t of ["study-relative-velocity.webp", "study-relative-velocity-dark.webp"]) assert.ok(existsSync(new URL("physics101/tryit/thumbs/" + t, pub)), t);
  // no em dashes in anything this module ships
  const files = ["study-relative-velocity.html", "relative-velocity/README.md", ...readdirSync(new URL("relative-velocity/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "relative-velocity/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(card, /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./relative-velocity.test.mjs", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./relative-velocity-browser.py", import.meta.url), "utf8"), /\u2014/);
});
