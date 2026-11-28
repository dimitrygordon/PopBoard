// Stellar Life Cycle VR v2 (round 13): mass is the only choice, one continuous timeline, a smooth log-radius dolly,
// model radii for every readout, Angelo's GLB node names, Leo's texture names, and the headset panel: grab, move,
// hit-test and poke exactly as Gravity Force, with no two blocks of text or buttons ever overlapping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { prepareTracks } from "../public/stellar-life/sl-data.js";
import { createFlow } from "../public/stellar-life/sl-flow.js";
import { uiModel, ONLY_CHOICE, PREDICT_HEAD, SPEEDS, PRESETS, GALLERY_TITLE, PREDICT_TOGGLE } from "../public/stellar-life/sl-ui.js";
import { buildQuillSurface, buildQuillHalo, buildQuillRim, buildQuillWind, buildProminence, buildWisps, QUILL } from "../public/stellar-life/sl-quill.js";
import { lookFor, bandTarget, springStep, dollyStep, FRAME, AU_RSUN, ORBIT_AU, MODEL_NODES, MODEL_BASE, TEX_STARS, texName, drawnBigger, GLOW, LIMB_QUAD, SIZES } from "../public/stellar-life/sl-world.js";

const pub = new URL("../public/", import.meta.url);
const read = (p) => readFileSync(new URL(p, pub), "utf8");
const S = JSON.parse(read("stellar-life/data/stages.json"));
const T = prepareTracks(JSON.parse(read("stellar-life/data/tracks.json")));
const RUN = ["0.2", "1", "3", "15", "40"];

function started(mass) {
  const f = createFlow(S, T, { predict: true }); f.pickMass(mass); f.answerHub("white dwarf"); [[3.74, 0.3], [3.56, 2.6], [4.45, -2.2]].forEach(([logT, logL]) => f.addPin({ logT, logL })); f.start(); return f;
}
const answerAll = (f) => { let p, g = 0; while ((p = f.pending()) && g++ < 8) f.commit(p.i, p.a.kind === "massMeter" ? (p.a.min + p.a.max) / 2 : p.a.choices[0]); };

test("science: mass is the only choice; no mid-life path choice anywhere; every question is a prediction", () => {
  const json = JSON.stringify(S);
  assert.ok(!/pathOrder/.test(json), "no path-order choice left in the stages");
  assert.ok(!/pathOrder|pathFirst/.test(read("stellar-life/sl-flow.js") + read("stellar-life/sl-ui.js") + read("stellar-life/sl-main.js")), "no path-choice code left");
  const ALL = [...S.hub, ...S.formation, ...Object.values(S.tracks).flat()];
  for (const st of ALL) for (const a of st.act || []) {
    if (a.code !== "P") continue;
    assert.ok(!a.kind || ["choice", "massMeter", "pins"].includes(a.kind) || a.choices, `${st.id}: ${a.kind}`);
  }
  // every question is shown under the head "Predict what happens next" (Tesla's question text itself is kept)
  for (const m of RUN) { const f = started(m); for (let i = 0; i < f.st.stages.length; i++) { f.enter(i); if (f.pending()) { const M = uiModel(f, { view: f.view() }); assert.equal(M.question.head, PREDICT_HEAD, `${m} ${f.stage().id}`); answerAll(f); } } }
  const hub = createFlow(S, T, { predict: true }); hub.pickMass("1"); assert.equal(uiModel(hub).question.head, PREDICT_HEAD, "hub end question");
  assert.match(ONLY_CHOICE, /only choice/); assert.match(PREDICT_HEAD, /^Predict/);
  const hp = ALL.find((h) => h.id === "H-Pick"); assert.match(hp.caption, /only choice/);
  const v5 = ALL.find((s) => s.id === "V5"); assert.ok(!(v5.act || []).some((a) => a.code === "P"), "V5 shows both paths, no choice");
});

test("timeline: one continuous run that flows stage to stage, stops at each unanswered prediction, and has speeds", () => {
  for (const m of RUN) {
    const f = started(m); const n = f.span(); let guard = 0, stops = 0, lastT = -1;
    while (f.st.phase !== "done" && guard++ < 20000) {
      if (f.st.phase === "predict") { stops++; assert.equal(f.st.t, 0, "a prediction holds the stage at its start"); answerAll(f); continue; }
      const T0 = f.T(); f.tick(0.25); assert.ok(f.T() >= T0 - 1e-9, "time only moves forward while playing"); lastT = f.T();
    }
    assert.equal(f.st.phase, "done", m + " reaches the end without a Next button"); assert.equal(f.st.si, n - 1); assert.ok(lastT <= n + 1e-9);
    assert.ok(stops > 0, m + " still asks its predictions");
  }
  const f = started("1"); assert.deepEqual(SPEEDS, [0.5, 1, 2, 4]); answerAll(f);
  f.setSpeed(2); const t0 = f.st.t; f.tick(1); const d2 = f.st.t - t0; f.setSpeed(1); const t1 = f.st.t; f.tick(1); assert.ok(Math.abs(d2 - 2 * (f.st.t - t1)) < 1e-9, "speed 2x plays twice as fast");
  // scrub: forward stops at the start of the first unanswered prediction stage, and never marks anything
  const g = started("15"); answerAll(g); const r = g.scrubTo(g.span() - 0.01); const s = g.stage();
  if (g.st.phase === "predict") { assert.equal(g.st.t, 0); assert.ok(g.pending()); }
  assert.ok(r && typeof r === "object"); assert.ok(g.T() <= g.span()); assert.ok(s);
  g.scrubTo(0.5); assert.equal(g.st.si, 0, "scrubbing back works"); g.restart && g.restart();
});

test("radius readouts come from the model; the 15 Suns swell runs 11.4 to 789.8 Suns with Earth inside and Jupiter outside", () => {
  const f = started("15"); f.enter(f.st.stages.findIndex((s) => s.id === "H2")); answerAll(f);
  let lo = Infinity, hi = 0;
  for (let i = 0; i <= 200; i++) { f.setT(i / 200); const v = f.view(); const R = Math.pow(10, v.row.logR); const L = lookFor(v, "15", f.st); assert.ok(Math.abs(L.star.R - R) < 1e-9, "the drawn star is the model radius"); lo = Math.min(lo, R); hi = Math.max(hi, R); }
  assert.ok(Math.abs(lo - 11.4) < 0.6, "starts near 11.4 Suns: " + lo); assert.ok(Math.abs(hi - 789.8) < 3, "peaks near 789.8 Suns: " + hi);
  assert.ok(ORBIT_AU.Earth * AU_RSUN < hi && ORBIT_AU.Jupiter * AU_RSUN > hi, "Earth's orbit inside, Jupiter's outside");
  const main = read("stellar-life/sl-main.js") + read("stellar-life/sl-world.js"); assert.ok(!/Rshow/.test(main), "no eased display radius in readouts");
});

test("dolly: a smooth eased log-radius move both ways, never a jump, and the star settles at 30 to 45% of the view", () => {
  const allDirs = new Set();
  for (const m of RUN) {
    const f = started(m); const cam = { L: null, v: 0 }; const dt = 1 / 60; let guard = 0, maxStep = 0, maxDv = 0, prevV = 0, maxOver = 0, dirs = new Set();
    while (f.st.phase !== "done" && guard++ < 200000) {
      if (f.st.phase === "predict") answerAll(f);
      f.tick(dt * 2); const v = f.view(); if (!v || !v.stage) continue; const L = lookFor(v, m, f.st);
      if (cam.L == null) cam.L = Math.log10(L.hero) - Math.log10(0.38);
      const tgt = bandTarget(cam.L, L.hero, L.band); const L0 = cam.L; dollyStep(cam, tgt, dt);
      if (L.star.on && L.band === "star") maxOver = Math.max(maxOver, L.hero / Math.pow(10, cam.L));
      maxStep = Math.max(maxStep, Math.abs(cam.L - L0)); maxDv = Math.max(maxDv, Math.abs(cam.v - prevV)); prevV = cam.v; if (Math.abs(cam.v) > 0.05) dirs.add(Math.sign(cam.v));
    }
    assert.ok(maxStep <= FRAME.vmax * dt + 1e-9, `${m}: speed capped, no jump (${maxStep})`);
    assert.ok(maxDv <= FRAME.amax * dt + 1e-9, `${m}: velocity is continuous, acceleration capped (${maxDv})`);
    assert.ok(dirs.size > 0, `${m}: the camera moves`); for (const d of dirs) allDirs.add(d); if (m === "15" || m === "1") assert.ok(dirs.has(1) && dirs.has(-1), `${m}: the camera pulls back and moves in`);
    assert.ok(maxOver < 0.8, `${m}: the star never balloons past the frame while it swells (${maxOver.toFixed(2)})`);
  }
  // settled framing: drive to a steady target and check the fraction
  for (const [band, hero] of [["star", 1], ["star", 789.8], ["wide", 4e6]]) {
    const cam = { L: Math.log10(hero) + 3, v: 0 }; for (let i = 0; i < 1200; i++) springStep(cam, bandTarget(cam.L, hero, band), 1 / 60);
    const frac = hero / Math.pow(10, cam.L); const [a, b] = FRAME[band]; assert.ok(frac >= a - 1e-3 && frac <= b + 1e-3, `${band} ${hero}: ${frac}`);
  }
  assert.ok(FRAME.star[0] >= 0.40 && FRAME.star[1] <= 0.50 && FRAME.wide[0] >= 0.40 && FRAME.wide[1] <= 0.50, "40 to 50 percent of the frame height (Leo, round 2)");
  // on screen the band is a share of the frame height: frameK scales it, and the settled star still sits inside it
  const cam = { L: 3, v: 0 }; for (let i = 0; i < 1200; i++) springStep(cam, bandTarget(cam.L, 1, "star", 0.97), 1 / 60); const fr = 1 / Math.pow(10, cam.L) / 0.97;
  assert.ok(fr >= FRAME.star[0] - 1e-3 && fr <= FRAME.star[1] + 1e-3, "frameK band " + fr);
});

test("Angelo's GLB node names and Leo's texture names are wired; no GLB is committed", () => {
  assert.equal(MODEL_BASE, "models/");
  assert.deepEqual([...MODEL_NODES.protostar].sort(), ["core_anchor", "cloud_shell", "disk", "jet_n", "jet_s"].sort());
  assert.deepEqual([...MODEL_NODES.planetary_nebula].sort(), ["core_anchor", "shell_inner", "shell_outer", "halo"].sort());
  assert.deepEqual([...MODEL_NODES.supernova_remnant].sort(), ["core_anchor", "filaments", "shock_shell"].sort());
  assert.deepEqual([...MODEL_NODES.pulsar_beams].sort(), ["core_anchor", "beam_n", "beam_s", "field_lines", "spin_axis"].sort());
  assert.deepEqual([...MODEL_NODES.blackhole_disk].sort(), ["core_anchor", "disk", "photon_ring"].sort());
  assert.deepEqual([...TEX_STARS], ["sun", "rsg", "zams15", "rg", "protostar"]);
  assert.equal(texName("sun", 2, "2k"), "sun_v2_2k.webp");
  const world = read("stellar-life/sl-world.js"); for (const k of Object.keys(MODEL_NODES)) for (const n of MODEL_NODES[k]) assert.ok(world.includes(`"${n}"`), `placeholder node ${n} named in code`);
});

test("art is 3D: spheres plus an animated quill overlay built as geometry; no camera-facing card anywhere", () => {
  const world = read("stellar-life/sl-world.js");
  // only text labels and the limb group turn to the viewer; the limb group holds 3D ribbons with depth (tested below), no card
  const facing = world.split("\n").filter((l) => /quaternion\.copy\(q\)/.test(l)); assert.ok(facing.every((l) => /(lab|labIn|labOut|limbG)\.quaternion\.copy\(q\)/.test(l)), "only text labels and the limb group turn: " + facing.length);
  assert.ok(!/HALO_FRAG|LENS_FRAG|THREE\.Points|T\.Points|new T\.Sprite/.test(world), "no flat halo, lens card, point sprites or sprites in the art");
  for (const n of ["quill_surface", "quill_halo", "quill_rim", "quill_wind", "photon_ring"]) assert.ok(world.includes(`"${n}"`), n + " is built");
  const h = buildQuillHalo(); const rim = buildQuillRim(); const sf = buildQuillSurface(); const w = buildQuillWind();
  assert.ok(h.n >= 3 && h.n <= 12 && rim.n > 200 && sf.n > 400 && w.n >= 10, "stroke counts: only a few limb strokes");
  // no fur (Leo, round 2): limb and wind strokes lie TANGENT to the limb, 1.0 to 1.13 R, never pointing outward
  const radii = (b, kind) => { const out = []; for (let i = 0; i < b.pos.length / 3; i++) if (b.uvk[i * 3 + 2] === kind) out.push(Math.hypot(b.pos[i * 3], b.pos[i * 3 + 1], b.pos[i * 3 + 2])); return out; };
  const radialDot = (b) => { let m = 0; for (let i = 0; i < b.pos.length / 3; i++) { const p = [b.pos[i * 3], b.pos[i * 3 + 1]], t = [b.tan[i * 3], b.tan[i * 3 + 1]]; const r = Math.hypot(...p), tl = Math.hypot(...t) || 1; m = Math.max(m, Math.abs((p[0] * t[0] + p[1] * t[1]) / r / tl)); } return m; };
  const hr = radii(h, QUILL.HALO); assert.ok(Math.min(...hr) > 1.0 && Math.max(...hr) < 1.09, `limb strokes ${Math.min(...hr)} to ${Math.max(...hr)}`);
  assert.ok(radialDot(h) < 0.2, "limb strokes are tangent: " + radialDot(h)); assert.ok(radialDot(w) < 0.2, "wind strokes are tangent: " + radialDot(w));
  assert.ok(Math.max(...h.col.filter((_, i) => i % 4 === 3)) <= 0.25, "limb strokes are low alpha");
  // the prominence is a painted H-alpha braid rooted on the limb, about 0.3 R tall, with real depth (not a flat card)
  const pr = buildProminence(); const prr = radii(pr, QUILL.PROM); assert.ok(Math.min(...prr) < 1.03 && Math.max(...prr) > 1.25 && Math.max(...prr) < 1.4, `prominence ${Math.min(...prr)} to ${Math.max(...prr)}`);
  const zs = []; for (let i = 0; i < pr.pos.length / 3; i++) zs.push(pr.pos[i * 3 + 2]); assert.ok(Math.max(...zs) - Math.min(...zs) > 0.04, "the braid twists in depth");
  assert.match(world, /"#FF5A6A"/); assert.match(world, /"#FF7A8E"/);
  const wi = buildWisps(); assert.ok(wi.n >= 5 && wi.n <= 10, "5 to 10 red supergiant wisps"); const wr = radii(wi, QUILL.PROM); assert.ok(Math.max(...wr) < 1.1, "wisps are short");
  // the glow is a bloom shell (spec sigmas and weights), not stroke spikes
  assert.deepEqual(GLOW.sun.w, [0.30, 0.24, 0.13, 0.05]); assert.deepEqual(GLOW.sun.s.map((x) => Math.round(x * 400)), [5, 20, 70, 220]); assert.equal(GLOW.sun.fade, 0.6);
  assert.ok(world.includes('"bloom_shell"') && /BLOOM_FRAG/.test(world), "bloom shell built"); assert.deepEqual(LIMB_QUAD.a, [0.40, 0.47, 0.56]);
  const rr = radii(rim, QUILL.RIM); assert.ok(Math.min(...rr) > 1.0 && Math.max(...rr) < 1.02, "rim on the surface");
  const sr = radii(sf, 0); assert.ok(Math.abs(Math.min(...sr) - 1) < 0.01 && Math.abs(Math.max(...sr) - 1) < 0.01, "surface quills lie on the sphere");
  const rimInk = rim.col.filter((_, i) => i % 4 === 0); assert.ok(Math.max(...rimInk) <= QUILL.ink * 1.1 + 1e-9, "rim ink is the star hue x 0.35 (multiply only)");
  const q = read("stellar-life/sl-quill.js"); assert.match(q, /uBoilT \* 8\.0/, "quills boil at 8 fps"); assert.match(q, /uBoil/, "Calm lines holds the boil");
});

test("guided by default (Dimitry, round 14): a gallery preset plays its whole life with no click; predictions are optional", () => {
  for (const m of RUN) {
    const f = createFlow(S, T); assert.equal(f.st.predict, false, "predictions are off by default");
    assert.ok(f.playPreset(m), m + ": a preset starts at once, with no hub question or pins"); assert.equal(f.st.screen, "stage");
    let guard = 0; const seen = new Set();
    while (f.st.phase !== "done" && guard++ < 400000) { assert.notEqual(f.st.phase, "predict", `${m}: never waits for a prediction`); assert.equal(f.pending(), null); seen.add(f.st.si); f.tick(1 / 30); }
    assert.equal(f.st.phase, "done", `${m}: the life reaches its end by itself`); assert.equal(seen.size, f.st.stages.length, `${m}: every stage played`);
    const M = uiModel(f); assert.equal(M.question, null); assert.ok(!M.buttons.some((b) => /^(next|choice|meter|end)/.test(b.id)), "no click-through buttons");
  }
  // the gallery: five presets, one per fate the model shows, in mass order; each names its mass and fate
  const g = createFlow(S, T); const H = uiModel(g); assert.equal(H.title, GALLERY_TITLE); assert.deepEqual(H.masses.map((x) => x.id), ["0.2", "1", "3", "15", "40"]);
  assert.deepEqual(PRESETS.map((p) => p.fate), ["white dwarf, predicted", "white dwarf", "white dwarf", "neutron star", "black hole"]);
  for (const p of PRESETS) assert.ok(T[p.id], "preset mass has a model track: " + p.id);
  const tg = H.toggles.find((t) => t.id === "predict"); assert.ok(tg && tg.on === false && tg.label === PREDICT_TOGGLE, "a tucked-away predictions toggle, off");
  // turning predictions on restores the T1 flow (the timeline waits at a prediction)
  const p = createFlow(S, T); p.setPredict(true); p.pickMass("1"); assert.equal(p.st.hubStep, "end"); assert.equal(p.start(), false, "with predictions on, the hub prediction comes first");
  const main = read("stellar-life/sl-main.js"); assert.match(main, /life\.tileStar\(/, "gallery tiles are our own 3D star spheres"); assert.ok(!/scenes\.glow\(/.test(main.split("// ---------------- scale bar")[0]), "no flat glow cards in the gallery");
});

test("star bakes map like Leo's README: u = 0.5 faces +Z, seam at -Z, u grows toward +X, row 0 is +Y (no mirror, no quarter turn)", () => {
  const w = read("stellar-life/sl-world.js"); assert.match(w, /vec2 uv = vec2\(atan\(n\.x, n\.z\) \/ 6\.2831853 \+ 0\.5 \+ uRot, 1\.0 - acos\(clamp\(n\.y, -1\.0, 1\.0\)\) \/ 3\.14159265\)/);
  const uOf = (x, z) => Math.atan2(x, z) / (2 * Math.PI) + 0.5; assert.equal(uOf(0, 1), 0.5); assert.equal(uOf(1, 0), 0.75); assert.ok(Math.abs(uOf(0, -1) - 1) < 1e-9, "seam at -Z");
  // Leo: direction = (cos lat sin lon, sin lat, cos lat cos lon), lon = (u - 0.5) 2 pi
  for (const u of [0.1, 0.3, 0.5, 0.7, 0.9]) { const lon = (u - 0.5) * 2 * Math.PI; assert.ok(Math.abs(uOf(Math.sin(lon), Math.cos(lon)) - u) < 1e-9); }
});

test("the 'drawn bigger than scale' chip fires whenever the drawn-size floor is in use (xr < minX)", () => {
  assert.equal(drawnBigger(FRAME.minX * 0.999), true); assert.equal(drawnBigger(FRAME.minX / 2), true); assert.equal(drawnBigger(FRAME.minX / 3.5), true);
  assert.equal(drawnBigger(FRAME.minX), false); assert.equal(drawnBigger(0.4), false);
  const world = read("stellar-life/sl-world.js"); assert.ok(!/minX \/ 3\)/.test(world), "no minX / 3 threshold left");
  assert.equal((world.match(/drawnBigger\(/g) || []).length >= 2, true, "both chips (star and neutron star) use it");
  // the neutron star is tiny on screen: its framing hero is 7 radii, so it spans about 13 percent of the frame height
  assert.ok(Math.abs(lookFor({ stage: { scene: "ns" }, t: 0.5 }, "15").hero / SIZES.ns - 7) < 1e-9);
});

// ---------------- headset panel (same harness as tests/gf-xr-panel.test.mjs) ----------------
function stubCanvas() {
  if (globalThis.document) return;
  const mk = () => { const st = { font: "600 30px Inter" }; return new Proxy(st, { get(t, p) { if (p === "measureText") return (s) => ({ width: String(s).length * 0.56 * (+(/(\d+(?:\.\d+)?)px/.exec(t.font) || [0, 30])[1]) }); if (p === "createLinearGradient" || p === "createRadialGradient") return () => ({ addColorStop() {} }); if (p in t) return t[p]; return () => {}; }, set(t, p, v) { t[p] = v; return true; } }); };
  globalThis.document = { createElement: () => { const c = { width: 0, height: 0 }; const g = mk(); c.getContext = () => g; return c; } };
}
const { XRPanel, XRP, XRL, PANEL_SPAWN, panelInputAt, overlaps } = await (stubCanvas(), import("../public/stellar-life/sl-xrpanel.js"));
const HM = XRP.M * XRP.H / XRP.W;
function makePanel() { const panel = new XRPanel(THREE); panel.mesh.visible = true; return panel; }
const yawQ = (yaw, pitch = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
/** Run the panel's per-frame update until it spawns, as the XR loop does. */
function spawnAt(panel, head, q = yawQ(0)) { for (let i = 0; i < 20 && !panel.spawned; i++) panel.frame(head, q); return panel; }
const ZERO = new THREE.Vector3(0, 0, 0);
function chipWorld(panel, hit) { const cx = (hit.x + hit.w / 2) / XRP.W, cy = (hit.y + hit.h / 2) / XRP.H; panel.mesh.updateMatrixWorld(); return panel.mesh.localToWorld(new THREE.Vector3((cx - 0.5) * XRP.M, (0.5 - cy) * HM, 0.002)); }
function handleWorld(panel) { panel.mesh.updateMatrixWorld(); return panel.handle.getWorldPosition(new THREE.Vector3()); }
function aimAt(target, from) { const origin = from.clone(); return { origin, dir: target.clone().sub(origin).normalize() }; }
function faceDot(panel, head) { panel.mesh.updateMatrixWorld(); const z = new THREE.Vector3(0, 0, 1).transformDirection(panel.mesh.matrixWorld); return z.dot(head.clone().sub(panel.mesh.position).normalize()); }

function drawState(panel, f, extra = {}) { const M = uiModel(f, { view: f.st.screen === "stage" ? f.view() : undefined, ...extra }); panel.draw(M, { view: "normal", pins: f.st.pins, ghosts: [], help: 0 }, 0, true); return M; }

test("panel: grab by the handle only, move it, it faces you, hit-tests follow it, a drag never clicks, buttons click by ray, pinch and poke", () => {
  const panel = makePanel(); const f = started("1"); drawState(panel, f);
  const head = new THREE.Vector3(0, 1.6, 0); spawnAt(panel, head);
  const btn = panel.hits.find((h) => h.id !== "scrub" && h.id !== "hr"); assert.ok(btn, "the panel has a button");
  const before = aimAt(chipWorld(panel, btn), head);
  assert.equal(panelInputAt(panel, before.origin, before.dir, null, "select").click, btn.id, "trigger or pinch on a button clicks it");
  const hAim = aimAt(handleWorld(panel), head); const g = panelInputAt(panel, hAim.origin, hAim.dir, null, "select");
  assert.equal(g.grab, true, "a ray on the handle grabs"); assert.equal(g.click, undefined, "grabbing does not click");
  const near = panelInputAt(panel, before.origin, before.dir, handleWorld(panel), "select"); assert.equal(near.click, btn.id); assert.equal(near.grab, undefined, "being near the handle does not steal a click");
  assert.equal(panelInputAt(panel, before.origin, before.dir, handleWorld(panel), "grip").grab, true, "grip near the handle grabs");
  const body = aimAt(chipWorld(panel, { x: 500, y: 700, w: 10, h: 10 }), head); assert.ok(!panelInputAt(panel, body.origin, body.dir, null, "select").grab, "a ray on the panel body never grabs");
  const ctrl = new THREE.Group(); ctrl.position.copy(handleWorld(panel)); ctrl.lookAt(head); ctrl.updateMatrixWorld();
  panel.beginGrab(ctrl); ctrl.position.set(0.9, 0.45, -0.7); ctrl.updateMatrixWorld(); panel.followGrab(ctrl); panel.endGrab(head); for (let i = 0; i < 30; i++) panel.frame(head, yawQ(0));
  assert.ok(panel.mesh.position.x > 0.4 && panel.mesh.position.y < 1.0, "moved low and to the side"); assert.ok(faceDot(panel, head) > 0.92, "faces the student after the move");
  assert.equal(panelInputAt(panel, before.origin, before.dir, null, "select").click, undefined, "the old ray misses");
  const moved = aimAt(chipWorld(panel, btn), head); assert.equal(panelInputAt(panel, moved.origin, moved.dir, null, "select").click, btn.id, "hit-test follows the moved panel");
  assert.equal(panel.poke(chipWorld(panel, btn)), btn.id, "a fingertip poke clicks"); assert.equal(panel.poke(handleWorld(panel)), null, "a poke on the handle is not a click");
  const mh = aimAt(handleWorld(panel), head); const sg = panelInputAt(panel, mh.origin, mh.dir, null, "select"); assert.equal(sg.grab, true); assert.equal(sg.click, undefined);
});

test("panel is WORLD-LOCKED: it spawns once front and centre inside the view, then never moves with the head", () => {
  const panel = new XRPanel(THREE); panel.reset(); assert.equal(panel.mesh.visible, false);
  // the first frames carry no real pose yet (origin, identity): no spawn there
  panel.frame(ZERO, new THREE.Quaternion()); panel.frame(ZERO, new THREE.Quaternion()); assert.equal(panel.spawned, false, "waits for the real viewer pose");
  const head = new THREE.Vector3(0.4, 1.62, -0.3), q = yawQ(0.7, -0.1); spawnAt(panel, head, q); assert.ok(panel.spawned && panel.mesh.visible);
  const d = panel.mesh.position.clone().sub(head); const flat = Math.hypot(d.x, d.z);
  assert.ok(flat >= 0.9 && flat <= 1.1, "0.9 to 1.1 m ahead: " + flat); assert.ok(d.y < 0 && d.y > -0.5, "slightly below eye level: " + d.y);
  // inside a Quest-like view frustum (about 90 degrees vertical), all four corners
  const cam = new THREE.PerspectiveCamera(90, 1, 0.05, 100); cam.position.copy(head); cam.quaternion.copy(q); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  panel.mesh.updateMatrixWorld(); const hw = XRP.M / 2, hh = HM / 2;
  for (const [x, y] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, 0]]) { const p = panel.mesh.localToWorld(new THREE.Vector3(x, y, 0)).project(cam); assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z < 1, `corner ${x},${y} in view: ${p.x.toFixed(2)},${p.y.toFixed(2)}`); }
  assert.ok(faceDot(panel, head) > 0.95, "faces the student at spawn");
  // walk around and look everywhere: the panel does not move or turn
  const pos0 = panel.mesh.position.clone(), q0 = panel.mesh.quaternion.clone();
  for (let i = 0; i < 240; i++) { const h = new THREE.Vector3(Math.sin(i * 0.1) * 1.5, 1.2 + 0.5 * Math.cos(i * 0.07), Math.cos(i * 0.13) * 1.5); panel.frame(h, yawQ(i * 0.21, Math.sin(i * 0.05) * 0.8)); }
  assert.ok(panel.mesh.position.distanceTo(pos0) < 1e-9, "position is pinned in world space"); assert.ok(panel.mesh.quaternion.angleTo(q0) < 1e-9, "orientation is pinned too");
  // a grab moves it; on release it stays exactly where it was let go (turned to face the student), and head motion still does nothing
  const ctrl = new THREE.Group(); ctrl.position.copy(handleWorld(panel)); ctrl.updateMatrixWorld(); panel.beginGrab(ctrl); ctrl.position.add(new THREE.Vector3(-0.8, -0.3, 0.2)); ctrl.updateMatrixWorld(); panel.followGrab(ctrl);
  const head2 = new THREE.Vector3(0, 1.6, 0); panel.endGrab(head2); const pos1 = panel.mesh.position.clone(); assert.ok(pos1.distanceTo(pos0) > 0.5, "the grab moved it");
  for (let i = 0; i < 120; i++) panel.frame(new THREE.Vector3(i * 0.01, 1.6, 0), yawQ(-i * 0.05)); assert.ok(panel.mesh.position.distanceTo(pos1) < 1e-9, "pinned after release");
  assert.ok(faceDot(panel, head2) > 0.95, "faces the student after release");
  // bring panel here (left thumbstick press): front and centre of the current pose
  const head3 = new THREE.Vector3(2, 1.5, 2), q3 = yawQ(Math.PI); panel.bringHere(head3, q3); const d3 = panel.mesh.position.clone().sub(head3);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q3); assert.ok(Math.abs(Math.hypot(d3.x, d3.z) - PANEL_SPAWN.dist) < 1e-6 && d3.x * fwd.x + d3.z * fwd.z > 0.9, "brought in front of the new pose");
  const main = read("stellar-life/sl-main.js"); assert.ok(!/panel\.place\(|captureOffset|defaultPose/.test(main + read("stellar-life/sl-xrpanel.js")), "no head-follow code from Gravity Force"); assert.match(main, /buttons\[3\]/, "left thumbstick press is wired");
});

test("panel: the timeline is a scrub target that reports a fraction", () => {
  const panel = makePanel(); const f = started("1"); answerAll(f); drawState(panel, f); const head = new THREE.Vector3(0, 1.6, 0); spawnAt(panel, head);
  const tl = panel.hits.find((h) => h.id === "scrub"); assert.ok(tl, "timeline is hittable while playing");
  const a = aimAt(chipWorld(panel, { x: tl.x + tl.w * 0.75 - 1, y: tl.y, w: 2, h: tl.h }), head); const c = panelInputAt(panel, a.origin, a.dir, null, "select").click;
  assert.match(c, /^scrub:/); assert.ok(Math.abs(parseFloat(c.slice(6)) - 0.75) < 0.03, c);
});

test("panel: no text, button, timeline or diagram box overlaps another, in any state, for every mass", () => {
  const panel = makePanel(); let checked = 0;
  const check = (label) => {
    const B = panel.boxes; checked++;
    for (const b of B) { assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= XRP.W + 0.5 && b.y + b.h <= XRP.H + 0.5, `${label}: ${b.kind} inside the panel`); if (b.kind === "text" || b.kind === "readout" || b.kind === "hr") assert.ok(b.y + b.h <= XRL.ctlTop + 1, `${label}: content stays above the control band`); }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) assert.ok(!overlaps(B[i], B[j]), `${label}: ${B[i].kind} overlaps ${B[j].kind} ${JSON.stringify([B[i], B[j]])}`);
  };
  const h = createFlow(S, T, { predict: true }); drawState(panel, h); check("hub pick"); h.pickMass("15"); drawState(panel, h); check("hub end"); h.answerHub("neutron star"); drawState(panel, h); check("hub pins");
  for (const m of RUN) {
    const f = started(m);
    for (let i = 0; i < f.st.stages.length; i++) {
      f.enter(i); const id = f.stage().id; if (f.pending()) { drawState(panel, f); check(`${m} ${id} predict`); answerAll(f); }
      for (const t of [0, 0.5, 0.8, 1]) { f.setT(t); drawState(panel, f, { calm: t > 0.6 }); check(`${m} ${id} t=${t}`); f.st.help = 1; drawState(panel, f); check(`${m} ${id} t=${t} numbers on`); f.st.help = 0; }
    }
  }
  assert.ok(checked > 150, "checked " + checked + " panel states");
});
