// Gravity Force Lab VR: scenes, page wiring and the spec's acceptance tests that can run without a headset.
//   node --test tests/gravity-force-vr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import * as S from "../public/gravity-force/gf-scenes.js";
import { parseState, canSetHelp, flags } from "../public/gravity-force/gf-state.js";
import { GF, stepMarble, bhHorizonText } from "../public/gravity-force/gf-sim.js";
import { MODEL_BASE, MODEL_FILES, PROP_SIZE, INK, CREAM, dialClockDeg, ROBOT } from "../public/gravity-force/gf-props.js";
import { READOUT, readPads, XRP, wrapLines } from "../public/gravity-force/gf-xr.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const lab = (qs = "") => S.createLab(parseState(qs));
const walk = (d) => readdirSync(new URL(d, pub)).flatMap((f) => statSync(new URL(d + f, pub)).isDirectory() ? walk(d + f + "/") : [d + f]);
const ALL_FILES = ["study-gravity-force.html", ...walk("gravity-force/")];
const GLBS = ALL_FILES.filter((f) => /\.(glb|gltf|blend|usdz|png|jpg)$/i.test(f) || /NOTES/i.test(f));
const NEW_FILES = ALL_FILES.filter((f) => !GLBS.includes(f));

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

test("no em or en dashes, only the four approved GLBs, no secrets in the new files", () => {
  for (const f of [...NEW_FILES, "../tests/gravity-force-vr.test.mjs"]) {
    const t = read(f); assert.ok(!/[\u2013\u2014]/.test(t), `dash in ${f}`);
    if (!f.startsWith("..")) assert.ok(!/(SWOLE_OWNER_PASSWORD|FIREBASE_LOGIN_CODE|XAI_API_KEY|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/.test(t), `secret-like text in ${f}`);
  }
  // Dimitry's exception (via Angelo, 2026-11-28): exactly the four meshopt GLBs, nothing else of Angelo's
  assert.deepEqual(GLBS.sort(), Object.values(MODEL_FILES).map((f) => "gravity-force/models/" + f).sort());
  assert.equal(MODEL_BASE, "models/", "relative to gf-props.js, so previews load the same files");
  const total = GLBS.reduce((a, f) => a + statSync(new URL(f, pub)).size, 0); assert.ok(total < 1.2e6, `GLBs total ${total} bytes`);
  for (const f of GLBS) { const b = readFileSync(new URL(f, pub)); assert.equal(b.toString("latin1", 0, 4), "glTF"); assert.match(b.toString("latin1", 20, 20 + b.readUInt32LE(12)), /EXT_meshopt_compression/); }
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
  for (const w of S.SCENE_WORLDS) assert.equal(S.s3Model(lab("scene=weigh&world=" + w)).figure, w === "ns" ? "robot" : "traveler", w);
  const e1 = S.s3Model(lab("scene=weigh&world=earth&help=1")).lines[0];
  assert.match(e1, /A 50 kg traveler like you/); assert.match(e1, /On Earth the pull on you is 491 N/);
  assert.match(S.s3Model(lab("scene=weigh&world=moon&help=1")).lines[0], /Your mass is still 50 kg/);
  assert.match(S.s3Model(lab("scene=weigh&world=ns&help=1")).lines[0], /Imagine the 50 kg robot here\. A real one would be crushed flat/);
  assert.ok(read("gravity-force/gf-panel.js").includes("Imagine a 50 kg robot on a neutron star"));
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
  assert.ok(S.objCard("bh").includes(bhHorizonText())); assert.equal(S.s5Model(lab("scene=well&obj=bh")).label, "Up close, Newton's law isn't accurate");
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
  let ev = readPads([pad("right", [0, 0, 0, 0, 1]), pad("left", [0, 0, 0, 0, 1], [0, 0, 0.9, 0])], prev);
  assert.ok(ev.fire); assert.ok(ev.pause); assert.equal(ev.chip, 1); assert.equal(ev.grip, undefined, "grip moves the panel, it does not pause");
  ev = readPads([pad("right", [0, 0, 0, 1, 1]), pad("left", [0, 0, 0, 0, 0], [0, 0, 0.9, 0])], prev);
  assert.ok(!ev.fire, "A fires once per press"); assert.ok(ev.nextScene); assert.equal(ev.chip, 0, "one chip step per flick");
  ev = readPads([pad("left", [0, 1, 0, 0, 0])], {});
  assert.equal(ev.pause, false, "left grip is not pause");
  const xr = read("gravity-force/gf-xr.js"), main = read("gravity-force/gf-main.js");
  assert.match(xr, /userData.handle/); assert.match(xr, /spawnInView/); assert.match(xr, /pinInWorld/); assert.match(xr, /hitHandle/);
  assert.match(main, /tryPanelGrab/); assert.match(main, /camEase/); assert.match(main, /Math\.exp\(-8/);
  assert.match(main, /bringPanel/); assert.match(main, /pinInWorld/);
  assert.match(main, /scene.add\(panel\.mesh\)/); assert.doesNotMatch(main, /camera\.add\(panel/);
  assert.doesNotMatch(main, /if \(!panelGrab\) panel\.(place|spawn)/);
});

test("S4 Moon stop: 384,400 km centre to centre, the same distance as S1 (Tesla's ruling)", () => {
  const r4 = S.s4Model(lab("scene=iss&alt=384400")).eq.r; const r1 = S.s1Model(lab("scene=pull")).eq.r;
  assert.equal(r4, r1); assert.equal(r4, GF.earthMoonM); assert.equal(S.s4AltKm(384400), 378029);
  const m = S.s4Model(lab("scene=iss&alt=384400&help=2")); assert.equal(m.readout.main, "0.027");
  assert.ok(m.lines.includes("0.00270 m/s^2. 0.135 N on the traveler.")); assert.ok(m.lines[0].includes("about 1/3,600"));
  assert.ok(S.controlsFor(lab("scene=iss")).some((c) => c.id === "alt:384400" && c.label === "Moon's distance"));
});

test("S5 sheet: no on-screen text gives the fast bend as a number of degrees", () => {
  for (const o of ["earth", "wd", "sun", "bh"]) for (const h of [0, 1, 2]) {
    const L = lab(`scene=well&obj=${o}&help=${h}`); for (const sp of ["slow", "medium", "fast"]) { S.act(L, "speed:" + sp); S.act(L, "flick"); }
    for (let i = 0; i < 400; i++) S.stepSheet(L, 1 / 60, stepMarble);
    const txt = JSON.stringify([S.sceneModel(L), S.controlsFor(L)]); assert.ok(!/\b41\b|degree|\u00B0/.test(txt), `${o} ${h}`);
  }
});

test("S5c Real or model? and S6 The Equation: views on top of the S5 and S1 scenes (Leo's round 8 sheet)", () => {
  const L = lab(""); const tabs = S.tabsFor(L); assert.deepEqual(tabs.map((t) => t.label), ["S1 Pull", "S2 Mass", "S3 Weigh", "S4 Station", "S5 Sheet", "S5c Sort", "S6 Equation"]);
  assert.ok(S.act(L, "view:sort")); assert.equal(L.url.scene, "well"); let m = S.sceneModel(L);
  assert.equal(m.title, "Real or model?"); assert.equal(m.kicker, "Gravity Lab | S5c"); assert.equal(m.predict, null); assert.equal(m.sort.length, 6); assert.equal(m.wrong.length, 5);
  for (const c of S.SORT_CARDS) S.act(L, `sort:${c.id}:model`); m = S.sceneModel(L); assert.equal(m.sortReveal.length, 6); assert.ok(m.result); assert.ok(!/wrong|incorrect/i.test(JSON.stringify(m.sortReveal)));
  assert.ok(S.act(L, "sortclear")); assert.equal(S.sceneModel(L).sortReveal.length, 0);
  assert.ok(S.act(L, "next")); assert.equal(L.view, "eq"); assert.equal(L.url.scene, "pull");
  m = S.sceneModel(L); assert.equal(m.title, "The Equation"); assert.equal(m.kicker, "Gravity Lab | S6"); assert.equal(m.force, "1.98 x 10^20 N"); assert.equal(m.result, undefined);
  S.act(L, "dist:x2"); m = S.sceneModel(L);
  assert.equal(m.force, "4.95 x 10^19 N"); assert.equal(m.forceSub, "1/4 of the start"); assert.equal(m.readout.second.main, "768,800 km");
  assert.deepEqual(m.tiles.map((t) => t.val), ["6.674 x 10^-11", "5.97 x 10^24 kg", "7.35 x 10^22 kg", "(7.69 x 10^8 m)^2"]);
  assert.equal(m.tiles[3].unit, "Twice the Earth to Moon distance (768,800 km)"); assert.equal(m.tiles[3].bubble, "r x2 so r^2 x4");
  assert.equal(S.pretty(m.force), "4.95 \u00D7 10\u00B9\u2079 N");
  S.act(L, "pin"); assert.equal(S.sceneModel(L).pins.length, 1);
  S.act(L, "predict:x1/4"); m = S.sceneModel(L); assert.equal(m.reveal.model, "x1/4"); assert.ok(m.result);
  assert.ok(S.act(L, "next")); assert.equal(L.url.scene, "pull"); assert.equal(L.view, null, "S6 wraps round to S1");
  assert.ok(S.act(L, "scene:mass")); assert.equal(L.view, null);
  const C = lab(""); assert.ok(S.act(C, "calm")); assert.equal(C.calm, true);
});

test("painted style: one cream label style sized on screen, ink outlines with 8 fps boil, robot v3.2 proportions", () => {
  const view = read("gravity-force/gf-view.js"), paint = read("gravity-force/gf-paint.js");
  assert.match(view, /phonePx: 15, deskPx: 16, xrPerM: 56 \/ 1280 \/ 1\.2/); assert.ok(15 >= 14);
  assert.match(view, /margin = 12/);
  assert.match(paint, /ink: 0x2A2420/); assert.match(paint, /boilFps: 8/); assert.match(paint, /outlinePx: 0\.8/);
  assert.match(paint, /skipOutline/); assert.match(paint, /shadow\|plinth/);
  assert.match(view, /contact_shadow/);
  assert.equal(S.S5_TEXT.bhLabel, "Up close, Newton's law isn't accurate");
  assert.equal(ROBOT.h, 1.267); assert.deepEqual(ROBOT.onScale, [0, 0.0485, -0.086]);
  assert.equal(PROP_SIZE.traveler.legs / PROP_SIZE.traveler.h, 0.5, "Angelo: traveler legs about half the height");
  const props = read("gravity-force/gf-props.js");
  assert.match(props, /hoodie/); assert.match(props, /jeans/); assert.match(props, /sneak/); assert.match(props, /noNoise/);
  assert.match(view, /color: 0x2A2420, ghost: 0x6B6158/);
  assert.match(view, /MeshBasicMaterial\(\{ color, toneMapped: false \}\)/);
});

test("headset text is never truncated: wrap keeps every word at 56 px, and S5c cards auto-fit their wrap", () => {
  const xr = read("gravity-force/gf-xr.js");
  assert.match(xr, /export function wrapLines/);
  assert.match(xr, /bodyPx = M.figure \? 56/);
  assert.doesNotMatch(xr, /if \(\+\+n >= maxLines\)/);
  assert.doesNotMatch(xr, /lines < [0-9]/);
  const colW = (XRP.W - 80 - 20) / 2, maxW = colW - 16, typ = 56;
  const measure = (t) => String(t).length * typ * 0.52;
  const texts = [
    ...S.SORT_CARDS.map((c) => c.text),
    S.S3_TEXT.words, S.S3_TEXT.scaleHelp,
    S.s3Model(lab("scene=weigh&world=moon&help=1")).lines[0],
    S.s3Model(lab("scene=weigh&world=ns&help=1")).lines[0],
    S.s3Model(lab("scene=weigh&world=earth&help=1")).lines[0],
  ];
  for (const text of texts) {
    const lines = wrapLines(measure, text, maxW);
    assert.equal(lines.join(" "), text, text);
    assert.ok(lines.every((ln) => ln.length), "no empty line");
  }
  const sixth = S.SORT_CARDS.find((c) => c.id === "c5").text;
  const lines = wrapLines(measure, sixth, maxW);
  assert.ok(lines.length >= 1); assert.equal(lines.join(" "), sixth);
  assert.match(sixth, /under the table/);
});
