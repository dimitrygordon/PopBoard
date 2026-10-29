import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/rocket-mission/lander/ml-model.js";
import * as P from "../public/rocket-mission/rocket-physics.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const doc = (n) => readFileSync(new URL(`../docs/${n}`, import.meta.url), "utf8");
const FILES = ["study-rocket-mission.html", "rocket-mission/lander/ml-ui.js", "rocket-mission/lander/ml-model.js", "rocket-mission/lander/ml-scene.js", "rocket-mission/lander/lander-theme.css"];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b}`);

test("Mars gravity, engine and fuel numbers", () => {
  assert.equal(M.BODIES.mars.g, 3.71); assert.equal(M.BODIES.moon.g, 1.62); assert.equal(M.BODIES.earth.g, 9.81);
  near(M.mdot(M.LANDER), 6000 / (225 * 9.80665), 1e-12); near(M.burnTime(M.LANDER), 73.5, 0.1);
  near(M.twr(M.LANDER, M.BODIES.mars.g), 2.02, 0.01); assert.ok(M.twr(M.LANDER, M.BODIES.earth.g) < 1);
});
test("engine off: free fall matches v^2 = v0^2 + 2 g h with thin Mars air barely mattering", () => {
  const L = M.createLander(); L.state = "flying"; L.cfg.air = false; L.vx = 0;
  const h = M.altitude(L); M.step(L, 60);
  assert.equal(L.state, "crashed"); near(L.result.down, Math.sqrt(12 ** 2 + 2 * 3.71 * h), 0.4);
  const A = M.createLander(); A.state = "flying"; A.vx = 0; M.step(A, 60);
  assert.ok(A.result.down < L.result.down && L.result.down - A.result.down < 1.5, "air slows the fall only a little");
});
test("thrust: straight up beats gravity; tilt sends sin(theta) of it sideways; fuel burns at mdot", () => {
  const L = M.createLander(); L.state = "flying"; L.cfg.air = false; L.vx = 0; L.vy = 0; L.firing = true;
  M.stepOnce(L); near(L.vy, (6000 / 800 - 3.71) * M.DT, 1e-6); near(L.fuel, 200 - M.mdot(M.LANDER) * M.DT, 1e-9);
  const T = M.createLander(); T.state = "flying"; T.cfg.air = false; T.vx = 0; T.vy = 0; T.tilt = T.tiltTarget = 30; T.firing = true;
  M.stepOnce(T); near(T.vx, 6000 / 800 * 0.5 * M.DT, 1e-6);
  const E = M.createLander(); E.state = "flying"; E.fuel = 0; E.firing = true; E.vy = 0; M.stepOnce(E); assert.ok(E.vy < 0, "no fuel, no thrust");
  const R = M.createLander(); R.state = "flying"; R.tiltTarget = 90; M.step(R, 0.25); near(R.tilt, 15, 1e-6); M.step(R, 2); assert.ok(R.tilt <= M.LANDER.maxTilt);
});
test("touchdown rules: safe, soft, on the pad, and each way to crash", () => {
  assert.deepEqual(M.judge(0, -1.2, 0, true), { safe: true, soft: true, onPad: true, why: null });
  assert.equal(M.judge(0, -3, 0, true).safe, true); assert.equal(M.judge(0, -2, 0, true).soft, false);
  assert.equal(M.judge(0, -3.1, 0, true).why, "fast"); assert.equal(M.judge(1.6, -1, 0, true).why, "sideways"); assert.equal(M.judge(0, -1, 11, true).why, "tilted");
  assert.equal(M.judge(0, -1, 0, false).onPad, false);
});
test("the ground follows Leo's terrain strip and the pad sits on it", () => {
  assert.equal(M.PROFILE.length, 128);
  near(M.terrainAt(0), M.terrainAt(M.WORLD.w), 1e-9, "the strip tiles");
  assert.ok(Math.abs(M.PAD_BASE - M.terrainAt(M.PAD.x)) < 5 && M.PAD_TOP > M.terrainAt(M.PAD.x));
  for (let x = M.PAD.x - M.PAD.w / 2; x <= M.PAD.x + M.PAD.w / 2; x += 1) assert.ok(M.terrainAt(x) <= M.PAD_TOP, "no rock pokes through the pad");
  assert.equal(M.groundAt(M.PAD.x), M.PAD_TOP);
});
test("autopilot lands softly on the pad with fuel to spare: Gold is reachable", () => {
  const L = M.fly(M.createLander(), 200);
  assert.equal(L.state, "landed"); assert.ok(L.result.onPad && L.result.soft);
  assert.ok(M.GOALS.every((g) => g.check({ type: "landing", ...L.result })));
  near(M.altitude(L), 0, 0.05, "resting on the pad");
});
test("medals: bronze anywhere, silver on the pad, gold soft with 60% of the fuel", () => {
  const [b, s, g] = M.GOALS, ev = (o) => ({ type: "landing", safe: true, soft: true, onPad: true, fuelFrac: 0.7, ...o });
  assert.ok(b.check(ev({ onPad: false })) && !b.check(ev({ safe: false, soft: false, onPad: false })));
  assert.ok(s.check(ev({ soft: false })) && !s.check(ev({ onPad: false })));
  assert.equal(M.FUN.goldFuel, 0.6); assert.equal(M.LIMITS.softV, 1.5);
  assert.ok(g.check(ev({ fuelFrac: 0.6 })) && !g.check(ev({ fuelFrac: 0.59 })) && !g.check(ev({ soft: false })));
});
test("sandbox: other worlds and engines, clamped; the weak Earth lander cannot stop", () => {
  const c = M.sandboxConfig({ body: "pluto", thrust: 1e9, fuel: -5, alt: 9999 });
  assert.equal(c.body, "mars"); assert.equal(c.thrust, M.SANDBOX.thrust.max); assert.equal(c.fuel, M.SANDBOX.fuel.min); assert.equal(c.start.alt, M.SANDBOX.alt.max);
  const moon = M.fly(M.createLander(M.sandboxConfig({ body: "moon" })), 300); assert.equal(moon.state, "landed");
  const earth = M.fly(M.createLander(M.sandboxConfig({ body: "earth" })), 300); assert.equal(earth.state, "crashed");
  const inf = M.createLander(M.sandboxConfig({ infinite: true })); inf.state = "flying"; inf.firing = true; M.step(inf, 5); assert.equal(inf.fuel, M.LANDER.fuel);
});
test("the existing rocket modes are untouched and the new mode does not collide", () => {
  assert.deepEqual([...P.MODES], ["thrust", "equation", "staging", "launch", "orbits", "hohmann", "sandbox"]);
  assert.ok(!("mars-lander" in P.MODE_ALIASES)); assert.equal(P.parseQuery("?mode=mars").mode, "hohmann");
  const html = read("study-rocket-mission.html");
  assert.match(html, /get\("mode"\) !== "mars-lander"/); assert.match(html, /import\("\.\/rocket-mission\/rocket-ui\.js"\)/);
  assert.match(html, /popboard\.rocket\.lander\.theme/);
  assert.match(read("rocket-mission/rocket-ui.js"), /mode=mars-lander/);
  assert.match(read("rocket-mission/rocket-ui.js"), /\.toolbar \.tool\[data-show\]/);
});
test("house rules: caption 12px, toast in the panel, sheet built at half after the controls fill, themes, sandbox, hooks", () => {
  const ui = read("rocket-mission/lander/ml-ui.js"), css = read("rocket-mission/lander/lander-theme.css"), scene = read("rocket-mission/lander/ml-scene.js");
  assert.match(scene, /CAPTION_GAP = 12/); assert.match(ui, /r\.bottom \+ CAPTION_GAP/);
  assert.match(ui, /<section class="ml-controls"[^]*id="mlToast"[^]*<\/section>/); assert.ok(!/position: fixed/.test(css.match(/\.ml-toast \{[^}]*\}/)[0]));
  assert.match(ui, /start: 1/); assert.match(ui, /dataset\.snap = "half"/);
  assert.ok(ui.indexOf("renderMode(); readout();\nphoneSync()") > 0, "controls are filled before the sheet is created");
  for (const m of ["mission", "sandbox"]) assert.match(ui, new RegExp(`data-mode="${m}"`));
  assert.match(css, /\[data-theme="light"\]/); assert.match(ui, /window\.__lander/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(scene, /createRadialGradient/); assert.ok(!/globalCompositeOperation|shadowBlur/.test(scene + ui));
});
test("Leo's art is shipped as WebP and drawn", () => {
  for (const f of ["lander", "engine-plume", "landing-pad", "terrain-strip"]) assert.ok(existsSync(new URL(`rocket-mission/lander/assets/${f}.webp`, pub)), f);
});
test("docs, study card, cleared by Tesla", () => {
  const sci = doc("rocket-mission-science.md").split("## Mars Lander mode")[1];
  const fc = doc("fun-challenges.md").split("## Rocket & Mission: Mars Lander")[1].split("\n## ")[0];
  const model = read("rocket-mission/lander/ml-model.js");
  for (const t of [sci, fc, model, readFileSync(new URL(import.meta.url), "utf8").replace(/"TODO-" \+ "TESLA"/g, "")]) assert.ok(!t.includes("TODO-" + "TESLA"));
  assert.ok((sci.match(/Cleared by Tesla 2026-10-29/g) || []).length >= 10 && /Cleared by Tesla 2026-10-29/.test(fc) && /Cleared by Tesla 2026-10-29/.test(model));
  const air = "Mars air is less than 2% as dense as Earth's, so it barely slows the lander.";
  assert.ok(sci.includes(air) && M.MODEL_NOTE.includes(air)); assert.ok(!/1% as thick/.test(sci + model));
  assert.match(fc, /\| Gold \|[^\n]*60% fuel left/); assert.match(read("rocket-mission/lander/ml-ui.js"), /60% of the fuel left/);
  assert.match(read("study.html").split('id: "rocket-mission"')[1].split("}")[0], /Mars Lander mode/);
});
test("no em-dashes and no off-limits mascot name in module copy", () => {
  const card = read("study.html").split('id: "rocket-mission"')[1].split("}")[0];
  for (const t of [...FILES.map(read), card, doc("rocket-mission-science.md").split("## Mars Lander mode")[1], doc("fun-challenges.md").split("## Rocket & Mission: Mars Lander")[1].split("\n## ")[0]]) {
    assert.ok(!t.includes("\u2014")); assert.ok(!new RegExp("ja" + "sper", "i").test(t));
  }
});

// ---------- Leo: draw scale and the landed pan (scene maths with a stub canvas) ----------
async function stubScene(reduced = false) {
  globalThis.Image = class { set src(v) { queueMicrotask(() => this.onload?.()); } };
  globalThis.matchMedia = () => ({ matches: reduced });
  const S = await import("../public/rocket-mission/lander/ml-scene.js");
  const calls = [], ctx = new Proxy({}, { get: (_, k) => k === "createRadialGradient" || k === "createLinearGradient" ? () => ({ addColorStop() {} }) : k === "drawImage" ? (...a) => calls.push(a) : () => {}, set: () => true });
  const sc = S.createScene({ getContext: () => ctx, width: 390, height: 600, clientWidth: 390, clientHeight: 600 });
  return { S, sc, calls };
}
test("Leo: lander and pad are drawn 1.5x, anchored where the physics puts them", async () => {
  const { S, sc } = await stubScene();
  assert.equal(S.DRAW_SCALE, 1.5);
  const v = sc.setBox({ x: 0, y: 0, w: 390, h: 400 }), k = v.k;
  const L = M.createLander(); L.x = M.PAD.x; L.y = M.PAD_TOP + M.feetDrop(); L.tilt = 0;
  const lr = sc.landerRect(L), pr = sc.padRect();
  near(lr.w, M.LANDER.w * k * 1.5, 1e-9); near(lr.h, M.LANDER.h * k * 1.5, 1e-9);
  near(pr.w, M.PAD.w * k, 1e-9, "pad drawn at its scoring width"); near(pr.top, sc.scr(0, M.PAD_TOP).y, 1e-9, "pad top on the model surface");
  near(lr.top + lr.h * M.ART.footY, sc.scr(0, M.PAD_TOP).y, 1e-9, "feet stay on the pad");
  // physics unchanged
  assert.equal(M.LANDER.w, 24); assert.equal(M.PAD.w, 90); assert.equal(M.NOT_TO_SCALE, "Lander and pad not to scale.");
});
test("Leo: after touchdown the view eases so the ground sits at the lower third; reduced motion snaps", async () => {
  const { S, sc } = await stubScene(false), box = { x: 0, y: 20, w: 390, h: 400 };
  sc.setBox(box);
  const L = M.fly(M.createLander(), 200), g = M.groundAt(L.x), groundY = () => sc.scr(L.x, g).y;
  assert.ok(groundY() > box.y + box.h * S.GROUND_AT + 5, "before landing the ground sits low on a phone");
  sc.panTo(true, false, g); const y0 = groundY();
  sc.draw(L, { dt: 0.05 }); const y1 = groundY();
  assert.ok(y1 < y0 && y1 > box.y + box.h * S.GROUND_AT + 1, "moves a little each frame (smooth)");
  for (let i = 0; i < 60; i++) sc.draw(L, { dt: 0.05 });
  near(groundY(), box.y + box.h * S.GROUND_AT, 0.5, "ground at two thirds down");
  sc.panTo(false, true); near(groundY(), sc.scr(0, 0).y - g * sc.view.k, 1e-9); near(sc.view.pan, 0, 1e-9, "reset snaps back");
  globalThis.matchMedia = () => ({ matches: true });
  sc.panTo(true, false, g); sc.draw(L, { dt: 0.016 });
  near(groundY(), box.y + box.h * S.GROUND_AT, 1e-9, "reduced motion: one frame, no easing");
  const ui = read("rocket-mission/lander/ml-ui.js");
  assert.match(ui, /function finish\(\) \{[^}]*scene\.panTo\(true, prefers\.reducedMotion, groundAt\(L\.x\)\)/);
  assert.match(ui, /function reset\(\) \{[^}]*scene\.panTo\(false, true\)/);
});

test("on the pad means the full drawn 90 m pad: just inside the edge counts, just outside does not", () => {
  const land = (dx) => { const L = M.createLander(); L.state = "flying"; L.tilt = 0; L.vx = 0; L.vy = -1;
    const half = Math.max(...M.feet({ ...L, x: 0, y: 0 }).map((p) => Math.abs(p.x)));
    L.x = M.PAD.x + M.PAD.w / 2 - half + dx; L.y = M.PAD_TOP + M.feetDrop(); M.touchdown(L); return L.result; };
  assert.equal(M.PAD.w, 90);
  assert.equal(land(-0.1).onPad, true, "outer footpad 0.1 m inside the drawn edge");
  assert.equal(land(0.1).onPad, false, "outer footpad 0.1 m past the drawn edge");
});
