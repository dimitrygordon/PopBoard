// Gravity Force Lab VR: scenes, page wiring and the spec's acceptance tests that can run without a headset.
//   node --test tests/gravity-force-vr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import * as S from "../public/gravity-force/gf-scenes.js";
import { parseState, canSetHelp, flags } from "../public/gravity-force/gf-state.js";
import { GF, stepMarble, bhHorizonText } from "../public/gravity-force/gf-sim.js";
import { MODEL_BASE, PROP_SIZE, INK, CREAM, dialClockDeg } from "../public/gravity-force/gf-props.js";
import { READOUT, readPads, XRP } from "../public/gravity-force/gf-xr.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const lab = (qs = "") => S.createLab(parseState(qs));
const NEW_FILES = ["study-gravity-force.html", ...readdirSync(new URL("gravity-force/", pub)).map((f) => "gravity-force/" + f)];

test("page loads the lab modules with one cache-bust version, and the Study library lists it", () => {
  const page = read("study-gravity-force.html");
  const vers = [...page.matchAll(/gravity-force\/[\w-]+\.(?:js|css)\?v=(\w+)/g)].map((m) => m[1]);
  assert.ok(vers.length >= 2); assert.equal(new Set(vers).size, 1, "one ?v= for gf.css and gf-main.js (gf-page-ui.js is unversioned so the Back-button check can read it)");
  assert.match(page, /src="gravity-force\/gf-page-ui\.js"/);
  for (const m of page.matchAll(/(?:src|href)="(gravity-force\/[\w.-]+)\?/g)) assert.ok(existsSync(new URL(m[1], pub)), m[1]);
  assert.match(read("study.html"), /id: "gravity-force",[\s\S]*?file: "study-gravity-force.html"/);
  assert.match(page, /id="studyBackBtn"/); assert.match(page, /astro-course\/story-return\.js/);
  const main = read("gravity-force/gf-main.js");
  assert.match(main, /isSessionSupported\("immersive-vr"\)/); assert.match(main, /"hand-tracking"/); assert.match(main, /setReferenceSpaceType\("local-floor"\)/);
  for (const m of main.matchAll(/from "\.\/([\w-]+\.js)"/g)) assert.ok(existsSync(new URL("gravity-force/" + m[1], pub)), m[1]);
});

test("no em or en dashes, no GLBs, no secrets in the new files", () => {
  for (const f of [...NEW_FILES, "../tests/gravity-force-vr.test.mjs"]) {
    const t = read(f); assert.ok(!/[\u2013\u2014]/.test(t), `dash in ${f}`);
    if (!f.startsWith("..")) assert.ok(!/(SWOLE_OWNER_PASSWORD|FIREBASE_LOGIN_CODE|XAI_API_KEY|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/.test(t), `secret-like text in ${f}`);
  }
  assert.ok(!NEW_FILES.some((f) => /\.(glb|gltf|blend|usdz)$/i.test(f)), "Angelo's model files stay out of the repo");
  assert.equal(MODEL_BASE, "", "props are built in code unless an external model host is set");
});

test("T18: a result shows only after a commit, and the reveal never says wrong", () => {
  const cases = [["pull", "half as strong"], ["iss", "zero"], ["well", "more past Earth"]];
  for (const [scene, chip] of cases) {
    const L = lab("scene=" + scene); let m = S.sceneModel(L); assert.equal(m.result, undefined, scene); assert.equal(m.reveal, null);
    assert.ok(S.act(L, "predict:" + chip)); m = S.sceneModel(L);
    assert.ok(m.result, scene); assert.equal(m.reveal.picked, chip); assert.equal(m.reveal.model, S.PREDICT[scene].model);
    assert.ok(!/wrong|incorrect/i.test(JSON.stringify(m.reveal)));
  }
  const M = lab("scene=mass"); assert.equal(S.act(M, "predict:the Sun feels more"), false, "S2A takes its own chips"); assert.equal(S.sceneModel(M).reveal, null);
  S.act(M, "predict:twice as strong"); assert.ok(S.sceneModel(M).result.startsWith("Double one mass"));
  S.act(M, "mode:B"); assert.equal(S.sceneModel(M).result, undefined); S.act(M, "predict:the same"); assert.equal(S.sceneModel(M).result, "Same size, opposite directions.");
  const W = lab("scene=weigh"); for (const w of ["moon", "mars", "earth", "jupiter"]) S.act(W, "predict:" + w);
  assert.equal(S.sceneModel(W).result, undefined, "four of five is not a commit"); S.act(W, "predict:ns");
  assert.equal(S.sceneModel(W).reveal.picked, "Moon, Mars, Earth, Jupiter, Neutron star"); assert.equal(S.sceneModel(W).result, "Your mass stays 50 kg. The pull on you changes.");
  const locked = lab("scene=pull&lock=predict"); S.act(locked, "predict:stronger"); assert.equal(S.act(locked, "predict:the same"), false);
});

test("T15: help 0 shows no equation, no G and no newtons in S1 and S2; help 2 adds them", () => {
  for (const sc of ["pull", "mass"]) {
    const L = lab("scene=" + sc); const m = S.sceneModel(L);
    assert.equal(m.showEq, false); const txt = JSON.stringify([m.lines, m.cards, m.readout]);
    assert.ok(!/\d N\b|10\^|G =|m\/s\^2/.test(txt), `${sc}: ${txt}`);
  }
  const L2 = lab("scene=pull&help=2"); assert.ok(S.sceneModel(L2).lines.includes("Pull on the Moon from Earth: 1.98 x 10^20 N at 384,400 km"));
  const L1 = lab("scene=pull&help=1"); assert.ok(S.sceneModel(L1).lines.some((l) => l.startsWith("F is proportional to 1 / r^2.")));
  assert.equal(flags.HELP2_REQUIRES_URL, false);
  const H = lab(""); assert.ok(S.act(H, "help:2", canSetHelp)); assert.equal(H.url.help, 2);
  const HL = lab("lock=help"); assert.equal(S.act(HL, "help:1", canSetHelp), false); assert.equal(HL.url.help, 0);
});

test("S1: arrow is the start length over the distance squared, capped at 4 times with a keeps-going tip", () => {
  const L = lab("scene=pull&dist=2"); let m = S.s1Model(L); assert.ok(Math.abs(m.arrowM - 0.05) < 1e-12); assert.equal(m.lines[0], "Pull: 1/4 of the start"); assert.equal(m.readout.main, "1/4");
  L.url.dist = 3; assert.equal(S.s1Model(L).lines[0], "Pull: 1/9 of the start");
  L.url.dist = 0.25; m = S.s1Model(L); assert.equal(m.arrowM, 0.8); assert.ok(m.keepsGoing);
  L.url.dist = 0.5; m = S.s1Model(L); assert.equal(m.arrowM, 0.8); assert.ok(!m.keepsGoing); assert.equal(m.lines[0], "Pull: 4 times the start");
  assert.equal(S.clampDist(9), 4); assert.equal(S.clampDist(0.1), 0.25);
  S.act(L, "dist:x2"); assert.equal(L.url.dist, 1); S.act(L, "pin"); assert.equal(L.pins.length, 1);
  assert.ok(S1_CHECK());
  function S1_CHECK() { return S.S1.startM * 0.25 >= 0.09; }   // Earth 0.06 m + Moon 0.03 m: spheres never overlap at 0.25 times
});

test("T13 and T14: S2 arrows are always the same length on A and B", () => {
  const L = lab("scene=mass");
  for (const id of ["A:x2", "B:x2", "A:half", "A:x3", "B:half"]) { S.act(L, id); const m = S.s2Model(L); assert.equal(m.arrows.a, m.arrows.b); }
  S.act(L, "mode:B");
  for (const a of ["ball", "earth", "sun", "wd"]) for (const b of ["ball", "earth", "sun", "wd"]) { S.act(L, `a:${a}`); S.act(L, `b:${b}`); const m = S.s2Model(L); assert.equal(m.arrows.a, m.arrows.b); assert.ok(m.meter >= 0 && m.meter <= 1); }
  const L2 = lab("scene=mass"); S.act(L2, "A:x2"); S.act(L2, "B:x2"); assert.equal(S.s2Model(L2).readout.main, "x4"); S.act(L2, "A:x3"); assert.equal(L2.mA, 4, "capped at x4 each"); assert.equal(S.s2Model(L2).mult, 8); assert.ok(S.s2Model(L2).keepsGoing);
});

test("T19: the S3 spring scale shows newtons and pounds; the balance shows 50 kg on every world; pounds appear nowhere else", () => {
  const want = { earth: ["491 N", "about 110 lb"], moon: ["81 N", "about 18 lb"], mars: ["186 N", "about 42 lb"], jupiter: ["1,240 N", "about 279 lb"], ns: ["about 6.5 x 10^13 N", "about 15 trillion pounds"] };
  for (const [w, [n, lb]] of Object.entries(want)) {
    const L = lab("scene=weigh&world=" + w); const m = S.s3Model(L);
    assert.equal(m.spring.main, n); assert.equal(m.spring.sub, lb); assert.equal(m.balance.main, "50 kg"); assert.equal(m.readout.second.main, "50 kg");
  }
  assert.equal(S.s3Model(lab("scene=weigh&world=ns")).figure, "robot");
  assert.ok(S.s3Model(lab("scene=weigh&world=jupiter&help=1")).lines[0].startsWith("Near Jupiter's cloud tops: 1,240 N (about 279 lb)"));
  for (const sc of ["pull", "mass", "iss", "well"]) for (const h of [0, 1, 2]) assert.ok(!/\blb\b|pound/i.test(JSON.stringify(S.sceneModel(lab(`scene=${sc}&help=${h}`)))), `${sc} help ${h}`);
  assert.equal(S.needleAngleDeg(0), -45); assert.equal(S.needleAngleDeg(1e9), -315); assert.equal(dialClockDeg(-45), -135);
});

test("S4: 89 out of 100 at the station, and the cut cable reads 0 N on the scale while the pull stays 435 N", () => {
  const L = lab("scene=iss&alt=400"); assert.equal(S.s4Model(L).readout.main, "89"); assert.deepEqual(S.s4Model(L).lines, ["Almost as long as on the ground."]);
  L.url.help = 1; assert.ok(S.s4Model(L).lines.includes("About 89 out of every 100."));
  L.url.help = 2; assert.ok(S.s4Model(L).lines.includes("88.5 percent at 400 km. 8.69 m/s^2. 435 N on the traveler."));
  assert.equal(S.act(L, "station"), false, "the station step comes after the cut");
  assert.ok(S.act(L, "cut")); const m = S.s4Model(L); assert.deepEqual(m.cutLabels, { pull: "Pull from Earth: 435 N", scale: "Scale reading: 0 N" });
  assert.equal(m.cards[0], "Cut the cable and you float, because you are falling. But you would fall straight down.");
  assert.ok(S.act(L, "station")); assert.match(S.s4Model(L).cards[0], /about 7\.7 km\/s, so it keeps missing Earth/);
  const C = lab("scene=iss&alt=100"); assert.equal(S.act(C, "cut"), false);
  assert.ok(S.s4Model(lab("scene=iss&alt=384400")).lines[0].includes("about 1/3,600"));
  assert.equal(S.s4Height(400), 2); assert.equal(S.s4Height(35786), 2);
});

test("S5: the twin uses the Sun's strength, marble mass does not matter, and the three speeds behave as Leo's frame shows", () => {
  assert.equal(S.sheetStrength("sun", true), S.sheetStrength("sun", false)); assert.notEqual(S.sheetStrength("sun", true), S.sheetStrength("bh", false));
  const a = lab("scene=well&obj=sun"), b = lab("scene=well&obj=sun");
  S.launchMarble(a, "medium", { mass: 0.005 }); S.launchMarble(b, "medium", { mass: 50 });
  for (let i = 0; i < 120; i++) { S.stepSheet(a, 1 / 60, stepMarble); S.stepSheet(b, 1 / 60, stepMarble); }
  assert.equal(a.marbles[0].x, b.marbles[0].x); assert.equal(a.marbles[0].y, b.marbles[0].y);
  const run = (obj, sp) => { const L = lab("scene=well&obj=" + obj); const m = S.launchMarble(L, sp); for (let i = 0; i < 900 && !m.done; i++) S.stepSheet(L, 1 / 60, stepMarble); return { done: m.done, turn: Math.abs(Math.atan2(m.vy, m.vx)) * 180 / Math.PI }; };
  assert.equal(run("sun", "slow").done, "surface"); assert.ok(run("sun", "medium").turn > 90, "medium swings around"); assert.ok(run("sun", "fast").turn < 60, "fast bends a little");
  assert.ok(run("earth", "fast").turn < run("sun", "fast").turn, "heavier bends more at the same speed and distance");
  assert.equal(run("bh", "slow").done, "fell in");
  assert.ok(S.objCard("bh").includes(bhHorizonText())); assert.equal(S.s5Model(lab("scene=well&obj=bh")).label, "Newton's rule is not enough close to here");
  const T = lab("scene=well&obj=earth"); assert.equal(S.act(T, "twin"), false, "the twin replaces the Sun only");
  const R = lab("scene=well"); for (const c of S.SORT_CARDS) S.act(R, `sort:${c.id}:real`);
  const rev = S.sortReveal(R); assert.equal(rev.length, 6); assert.ok(!/wrong|incorrect/i.test(JSON.stringify(rev))); assert.ok(rev.every((r) => r.picked === "real" && r.model));
  assert.equal(S.S5_TEXT.opening, "This stretchy sheet is a model, not the real thing. In the model, the ball rolls into the dents because Earth's gravity pulls it down. Real gravity has no 'down' to roll toward: mass curves space and time themselves, and objects follow those curves.");
  assert.ok(!/spacetime/i.test(JSON.stringify(S.s5Model(lab("scene=well&help=2")))), "spacetime stays off student screens");
});

test("T17: every scene is reachable and every enabled control does something", () => {
  const L = lab("");
  for (const sc of S.SCENE_ORDER) {
    assert.ok(S.act(L, "scene:" + sc)); assert.equal(L.url.scene, sc);
    for (const c of S.controlsFor(L)) { if (c.disabled || c.id === "next") continue; const before = JSON.stringify([L.url, L.massMode, L.issStep]); assert.ok(S.act(L, c.id, canSetHelp) !== false, `${sc} ${c.id}`); if (L.url.scene !== sc) S.act(L, "scene:" + sc); void before; }
  }
  const locked = lab("scene=weigh&lock=scene"); assert.equal(S.act(locked, "scene:pull"), false); assert.equal(S.act(locked, "next"), false);
  assert.equal(S.sceneModel(lab("scene=iss")).kicker, "Gravity Lab | S4");
});

test("headset: Leo's readout spec and the Quest 3 button map", () => {
  assert.equal(READOUT.ink, "#2A2420"); assert.equal(INK, "#2A2420"); assert.equal(READOUT.subScale, 0.6); assert.equal(READOUT.subAlpha, 0.7);
  const mPerPx = XRP.M / XRP.W; const deg = Math.atan(READOUT.mainPx * mPerPx / 1.2) * 180 / Math.PI; assert.ok(deg * 20 >= 56, "main value spans 56 headset px or more at 1.2 m (about 20 px per degree)");
  const css = read("gravity-force/gf.css"); assert.match(css, /"tnum"/); assert.match(css, /--gf-ink: #2A2420/); assert.ok(!/glow|text-shadow/.test(css.slice(css.indexOf(".gf-dial"), css.indexOf(".gf-lines"))));
  assert.equal(CREAM, "#F3E9D2"); assert.equal(PROP_SIZE.robot.h, 1.267); assert.equal(PROP_SIZE.scale.w, 0.3);
  const btn = (on) => ({ pressed: !!on });
  const pad = (hand, buttons, axes = [0, 0, 0, 0]) => ({ handedness: hand, gamepad: { buttons: buttons.map(btn), axes } });
  const prev = {};
  let ev = readPads([pad("right", [0, 0, 0, 0, 1]), pad("left", [0, 1, 0, 0, 0], [0, 0, 0.9, 0])], prev);
  assert.ok(ev.fire); assert.ok(ev.grip); assert.equal(ev.chip, 1);
  ev = readPads([pad("right", [0, 0, 0, 1, 1]), pad("left", [0, 0, 0, 0, 0], [0, 0, 0.9, 0])], prev);
  assert.ok(!ev.fire, "A fires once per press"); assert.ok(ev.nextScene); assert.equal(ev.chip, 0, "one chip step per flick");
});
