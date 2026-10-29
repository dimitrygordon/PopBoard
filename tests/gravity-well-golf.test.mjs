import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as G from "../public/gravity-well-golf/gwg-physics.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const TESLA = "This stretchy sheet is a model, not the real thing. In the model, the ball rolls into the dents because Earth's gravity pulls it down. Real gravity has no 'down' to roll toward: mass curves space and time themselves, and objects follow those curves.";

test("Tesla's caveat is verbatim and shown on first load and behind '?'", () => {
  assert.equal(G.CAVEAT, TESLA);
  const html = read("study-gravity-well-golf.html"), ui = read("gravity-well-golf/gwg-ui.js");
  assert.match(html, /id="helpBtn"/); assert.match(html, /id="caveat"/);
  assert.match(ui, /helpBtn"\)\.addEventListener\("click", openCaveat\)/);
  assert.match(ui, /if \(!store\.get\(CAVEAT_KEY\)\) openCaveat\(\)/);
});
test("model labels: Newtonian 1/r^2, cup is game friction, 'curved spacetime', no bare 'dent in space'", () => {
  assert.match(G.MODEL_LABEL, /Newtonian/); assert.match(G.MODEL_LABEL, /1\/r\u00b2/);
  assert.match(G.CUP_LABEL, /game friction, not gravity/);
  const copy = read("study-gravity-well-golf.html") + read("gravity-well-golf/gwg-ui.js") + read("study.html");
  assert.ok(!/dent in space/i.test(copy)); assert.match(copy, /curved spacetime/);
});
test("pull is inverse-square far from a mass", () => {
  const m = [{ kind: "star", x: 0, y: 0 }];
  const a1 = Math.hypot(...Object.values(G.accel(10, 0, m))), a2 = Math.hypot(...Object.values(G.accel(20, 0, m)));
  assert.ok(Math.abs(a1 / a2 - 4) < 0.01, `${a1 / a2}`);
  const a = G.accel(3, 4, m); assert.ok(a.ax < 0 && a.ay < 0); // toward the mass
  assert.ok(Number.isFinite(Math.hypot(...Object.values(G.accel(0, 0, m))))); // softened at the center
});
test("frictionless orbit keeps its energy (no spiral in or out)", () => {
  const m = [{ kind: "star", x: 0, y: 0 }], r = 3, gm = G.KINDS.star.gm;
  const b = { x: r, y: 0, vx: 0, vy: Math.sqrt(gm * r * r / Math.pow(r * r + G.P.soften ** 2, 1.5)) };
  const e0 = G.energy(b, m); let rMin = Infinity, rMax = 0;
  for (let i = 0; i < 240 * 20; i++) { G.step(b, null, { masses: m, friction: false }); const d = Math.hypot(b.x, b.y); rMin = Math.min(rMin, d); rMax = Math.max(rMax, d); }
  assert.ok(Math.abs(G.energy(b, m) - e0) / Math.abs(e0) < 1e-3); assert.ok(rMin > 2.9 && rMax < 3.1, `${rMin} ${rMax}`);
});
test("friction (game rule) stops a ball on an empty field; cup captures slow balls only", () => {
  assert.equal(G.simulate({ x: -5, y: 0 }, { vx: 1, vy: 0 }, { x: 7, y: 4 }, { masses: [] }).result, "stop");
  assert.equal(G.simulate({ x: -5, y: 0 }, G.puttVelocity(-0.6, 0), G.COURSE[0].cup, { masses: [] }).result, "cup");
  const fast = { x: G.COURSE[0].cup.x - 0.3, y: 0, vx: 8, vy: 0 };
  assert.ok(!G.step(fast, G.COURSE[0].cup, { masses: [] }).some((e) => e.type === "cup"));
});
test("walls and masses bounce the ball back with restitution", () => {
  const b = { x: G.W / 2 - G.BALL_R - 0.001, y: 0, vx: 2, vy: 0 };
  const ev = G.step(b, null, { masses: [], friction: false }); assert.ok(ev.some((e) => e.type === "wall")); assert.ok(b.vx < 0);
  const m = [{ kind: "moon", x: 0, y: 0 }], R = G.massRadius("moon") + G.BALL_R;
  const c = { x: -R - 0.001, y: 0, vx: 3, vy: 0 }; const e2 = G.step(c, null, { masses: m, friction: false });
  assert.ok(e2.some((e) => e.type === "hit")); assert.ok(c.vx < 0);
});
test("putt speed is capped and opposite to the pull", () => {
  const v = G.puttVelocity(10, 0); assert.ok(Math.abs(Math.hypot(v.vx, v.vy) - G.P.maxPutt) < 1e-9); assert.ok(v.vx < 0);
});
test("9-hole course: pars set, every hole has a hole-in-one line", () => {
  assert.equal(G.COURSE.length, 9);
  const lines = [[-0.6, 0], [-0.8889, -0.1408], [-0.8374, 0.3299], [-0.8746, -0.4848], [-0.1526, 0.7853], [-1.3, 0], [0.3078, 0.394], [-1.0155, -0.9637], [-1.2328, -0.4125]];
  G.COURSE.forEach((h, i) => {
    assert.ok(h.par >= 1);
    for (const m of h.masses) assert.ok(G.canPlace(m.kind, m.x, m.y, { ...h, masses: h.masses.filter((x) => x !== m) }), `hole ${h.n} ${m.kind}`);
    assert.equal(G.simulate(h.tee, G.puttVelocity(...lines[i]), h.cup, { masses: h.masses }).result, "cup", `hole ${h.n}`);
  });
});
test("score names", () => {
  assert.equal(G.scoreName(1, 3), "Hole in one"); assert.equal(G.scoreName(2, 3), "Birdie"); assert.equal(G.scoreName(3, 3), "Par"); assert.equal(G.scoreName(5, 3), "2 over par");
});
test("goals fire on their thresholds only", () => {
  const [b, s, g] = G.GOALS;
  assert.ok(b.check({ type: "sunk", strokes: 4, parHoles: 0 }));
  assert.ok(!s.check({ type: "sunk", parHoles: 2 })); assert.ok(s.check({ type: "sunk", parHoles: 3 }));
  assert.ok(!g.check({ type: "sunk", mode: "course", strokes: 1, hole: 1 })); assert.ok(!g.check({ type: "sunk", mode: "sandbox", strokes: 1, hole: 0 }));
  assert.ok(g.check({ type: "sunk", mode: "course", strokes: 1, hole: 2 }));
});
test("sandbox share: masses pack and unpack, junk is dropped and clamped", () => {
  const ms = [{ kind: "moon", x: 1.234, y: -2 }, { kind: "heavy", x: 0, y: 0 }];
  assert.deepEqual(G.unpackMasses(G.packMasses(ms)), [{ kind: "moon", x: 1.23, y: -2 }, { kind: "heavy", x: 0, y: 0 }]);
  assert.deepEqual(G.unpackMasses("x,1,1;m,99,0;p,a,b"), [{ kind: "moon", x: G.W / 2, y: 0 }]);
  assert.deepEqual(G.unpackMasses(null), []);
});
test("Leo's art rules: sprites present, gold only on the ball, puff under ~300 ms, mipmaps, additive teal ring", async () => {
  for (const k of Object.values(G.KINDS)) assert.ok(existsSync(new URL("gravity-well-golf/sprites/" + k.sprite, pub)));
  for (const f of ["ball", "ball-shadow", "hole", "puff"]) assert.ok(existsSync(new URL(`gravity-well-golf/sprites/${f}.webp`, pub)));
  const scene = read("gravity-well-golf/gwg-scene.js"), css = read("gravity-well-golf/gravity-well-golf-theme.css");
  const puff = Number(/PUFF_MS = (\d+)/.exec(scene)[1]); assert.ok(puff > 0 && puff <= 300);
  assert.match(scene, /LinearMipmapLinearFilter/); assert.match(scene, /generateMipmaps = true/);
  assert.match(scene, /AdditiveBlending/); assert.match(scene, /RingGeometry/);
  assert.match(css, /--fun-gold: var\(--gw-accent\)/); assert.ok(!/#ffc43c|#e0a91c|gold/i.test(css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--fun-gold/g, "")));
});
test("page wiring, themes, study card, docs, vendored three.js", () => {
  const html = read("study-gravity-well-golf.html");
  for (const f of ["gravity-well-golf/gwg-ui.js", "gravity-well-golf/gravity-well-golf-theme.css", "shared/fun/fun.css"]) assert.ok(html.includes(f));
  assert.match(html, /data-mode="sandbox"/); assert.match(read("gravity-well-golf/gravity-well-golf-theme.css"), /\[data-theme="light"\]/);
  assert.ok(existsSync(new URL("vendor/three/three.module.min.js", pub)));
  const study = read("study.html"); assert.match(study, /id: "gravity-well-golf"/); assert.match(study, /file: "study-gravity-well-golf.html"/);
  assert.ok(readFileSync(new URL("../docs/gravity-well-golf-science.md", import.meta.url), "utf8").includes("TODO-TESLA"));
});
test("no em-dashes and no Jasper in module copy", () => {
  for (const f of ["study-gravity-well-golf.html", "gravity-well-golf/gwg-ui.js", "gravity-well-golf/gwg-physics.js", "gravity-well-golf/gwg-scene.js", "gravity-well-golf/gravity-well-golf-theme.css"]) {
    const t = read(f); assert.ok(!t.includes("\u2014"), f); assert.ok(!/jasper/i.test(t), f);
  }
});
