import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/plate-tectonics/pt-model.js";
import { ART, FX_MS } from "../public/plate-tectonics/pt-scene.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["study-plate-tectonics.html", "plate-tectonics/pt-ui.js", "plate-tectonics/pt-model.js", "plate-tectonics/pt-scene.js", "plate-tectonics/plate-tectonics-theme.css"];

test("boundary types snap from the drag direction", () => {
  assert.equal(M.classify(0, 0), "none"); assert.equal(M.classify(0.3, 0.2), "none");
  assert.equal(M.classify(3, 0), "divergent"); assert.equal(M.classify(-3, 1), "convergent");
  assert.equal(M.classify(1, 4), "transform"); assert.equal(M.classify(-2, -4), "transform"); assert.equal(M.classify(3, 5), "divergent");
});
test("rate x time: 1 cm/yr for 1 Myr is 10 km", () => {
  assert.equal(M.outcome({ vx: 2, t: 10 }).openKm, 200);
  assert.equal(M.outcome({ left: "continental", right: "continental", vx: -5, t: 4 }).shortenKm, 200);
  assert.equal(M.outcome({ vx: 0, vy: 3, t: 2 }).slipKm, 60);
});
test("ocean plates apart make a ridge; continents rift first, then open an ocean", () => {
  assert.equal(M.outcome({ vx: 2, t: 1 }).feature, "ridge");
  const c = { left: "continental", right: "continental", vx: 2 };
  assert.equal(M.outcome({ ...c, t: 10 }).feature, "rift");
  assert.equal(M.outcome({ ...c, t: 16 }).feature, "ridge");
  assert.equal(M.outcome({ vx: 2, t: 0 }).feature, "none");
});
test("subduction: the oceanic plate sinks, volcano after ~200 km of slab", () => {
  const a = M.outcome({ left: "oceanic", right: "continental", vx: -5, t: 2 });
  assert.equal(a.feature, "subduction"); assert.equal(a.subducting, "left"); assert.equal(a.volcano, false);
  assert.equal(M.outcome({ left: "continental", right: "oceanic", vx: -5, t: 4 }).subducting, "right");
  assert.equal(M.outcome({ left: "oceanic", right: "continental", vx: -5, t: 4 }).volcano, true);
});
test("continent vs continent: no trench, no slab, no volcano, only fold mountains (Leo)", () => {
  for (const t of [2, 4, 10, 30, 60]) {
    const o = M.outcome({ left: "continental", right: "continental", vx: -5, t });
    assert.equal(o.feature, "mountains"); assert.ok(!o.subducting); assert.ok(!o.volcano); assert.ok(o.mountainKm > 0);
  }
  const ui = read("plate-tectonics/pt-ui.js"); // crust buttons resync when st changes outside them
  assert.match(ui, /shownCrust !== st\.left \+ "\/" \+ st\.right/);
});
test("Tesla: fossils, ocean meets ocean, India hint", () => {
  assert.deepEqual(M.FOSSILS.map((f) => f.name), ["Mesosaurus", "Glossopteris", "Cynognathus"]);
  const all = FILES.map(read).join("\n") + read("study.html"); assert.ok(!/Lystrosaurus/.test(all));
  const doc = readFileSync(new URL("../docs/plate-tectonics-science.md", import.meta.url), "utf8");
  assert.match(doc, /This Dynamic Earth/); assert.match(doc, /one plate sinks/); assert.ok(!/moving plate's edge sinks/.test(doc));
  assert.match(M.SCENES.find((s) => s.id === "himalaya").hint, /^Push India \(south\) north into Asia\./);
});
test("continents collide into mountains that level off near 8.8 km", () => {
  const c = { left: "continental", right: "continental" };
  assert.equal(M.outcome({ ...c, vx: -5, t: 10 }).feature, "mountains");
  let prev = 0;
  for (let t = 1; t <= 60; t++) { const h = M.outcome({ ...c, vx: -5, t }).mountainKm; assert.ok(h > prev && h < 8.8); prev = h; }
  assert.ok(M.mountainHeight(1e6) <= 8.8);
  assert.ok(M.outcome({ ...c, vx: -5, t: 25 }).mountainKm < M.FUN.himalayaKm); // 1,250 km is not enough
  assert.ok(M.outcome({ ...c, vx: -5, t: 30 }).mountainKm >= M.FUN.himalayaKm);
});
test("hotspot island on a ridge (Make Iceland)", () => {
  const s = { left: "oceanic", right: "oceanic", hotspot: true, vx: 3 };
  assert.equal(M.outcome({ ...s, t: 3 }).islandKm, 0);
  assert.ok(M.isIceland(s, M.outcome({ ...s, t: 6 })));
  assert.ok(!M.isIceland({ ...s, hotspot: false }, M.outcome({ ...s, hotspot: false, t: 20 })));
  assert.ok(M.outcome({ ...s, t: 60 }).islandKm <= M.T.islandMaxKm);
});
test("transform faults stick then slip: quake when stress fills", () => {
  let f = { stress: 0, quakes: 0 }, n = 0;
  for (let i = 0; i < 105; i++) { f = M.stepFault(f, 5, 0.1); if (f.quake) n++; }
  assert.equal(n, 10); assert.equal(f.quakes, 10);
  assert.equal(M.stepFault({ stress: 0.5 }, 5, -1).quake, false);
});
test("goals fire on their thresholds only; prediction judging", () => {
  const [b, s, g] = M.GOALS;
  assert.ok(b.check({ type: "quake" })); assert.ok(!b.check({ type: "state" }));
  assert.ok(s.check({ type: "state", iceland: true })); assert.ok(!s.check({ type: "state", iceland: false }));
  assert.ok(g.check({ type: "state", mountainKm: 8 })); assert.ok(!g.check({ type: "state", mountainKm: 7.9 }));
  assert.ok(M.judgePrediction("ridge", "rift")); assert.ok(M.judgePrediction("quakes", "quakes")); assert.ok(!M.judgePrediction("mountains", "subduction"));
});
test("fossil match: pieces share the seam, bands cross it, snap tolerance", () => {
  const seam = JSON.stringify(M.SEAM);
  assert.ok(JSON.stringify(M.PIECES.west.outline).includes(seam.slice(1, -1)));
  assert.ok(JSON.stringify(M.PIECES.east.outline).includes(JSON.stringify(M.SEAM.slice().reverse()).slice(1, -1)));
  assert.ok(M.fossilFit(2, 2)); assert.ok(!M.fossilFit(30, 12));
  for (const f of M.FOSSILS) assert.ok(f.y0 > 0 && f.y1 < 100 && f.y1 > f.y0);
});
test("share schema clamps and drops junk", async () => {
  const { sanitizeState } = await import("../public/shared/fun/fun-core.js");
  assert.deepEqual(sanitizeState({ left: "lava", right: "continental", vx: 99, vy: -99, t: 500, hotspot: "yes" }, M.SHARE_SCHEMA), { right: "continental", vx: 10, vy: -10, t: 60 });
});
test("Tesla: ridge caption is live text, mantle is solid rock that flows, not a sea of magma", () => {
  assert.equal(M.RIDGE_CAPTION, "Magma rises here.");
  assert.match(read("study-plate-tectonics.html"), /<p class="tag ridge-caption" id="ridgeCaption"/);
  assert.match(read("plate-tectonics/pt-ui.js"), /\$\("ridgeCaption"\)\.textContent = RIDGE_CAPTION/);
  assert.match(M.MANTLE_LABEL, /solid rock that flows slowly/);
  const copy = FILES.map(read).join("\n") + read("study.html").split('id: "plate-tectonics"')[1].split("}")[0];
  assert.equal(M.MANTLE_INFO, "The mantle is solid rock that flows slowly, not a sea of magma. Melting happens only in small zones, like under ridges and above sinking plates.");
  assert.match(read("plate-tectonics/pt-ui.js"), /\$\("aboutMantle"\)\.textContent = MANTLE_INFO/);
  assert.ok(read("study.html").includes(M.MANTLE_INFO));
  const phoneLabel = read("plate-tectonics/pt-ui.js").match(/phone\.matches \? "([^"]+)"/)[1]; assert.ok(!/liquid/i.test(phoneLabel), phoneLabel);
  assert.ok(!/liquid/i.test(copy.replace(/never drawn as liquid/g, "")));
  assert.ok(!/(liquid|molten|melted) (mantle|rock layer)|mantle (is|of) (liquid|molten|lava)/i.test(copy));
});
test("Leo: terracotta is the one accent, no glow on the slab", () => {
  const css = read("plate-tectonics/plate-tectonics-theme.css"), scene = read("plate-tectonics/pt-scene.js");
  assert.match(css, /--fun-gold: var\(--pt-accent\)/); assert.match(css, /--pt-accent: #c0623d/); assert.match(css, /--pt-accent: #a4492a/);
  const hexes = new Set((css.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-f]{6}/gi) || []).map((h) => h.toLowerCase()));
  for (const h of hexes) { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const sat = Math.max(r, g, b) - Math.min(r, g, b); if (sat > 40) assert.ok(["#c0623d", "#a4492a"].includes(h), `extra accent ${h}`); }
  assert.ok(!/shadowBlur|lighter|filter\s*=|globalCompositeOperation/.test(scene));
  assert.match(scene, /sprite\("trench"[^)]*\{ alpha: [^}]*flip \}\)/);
  assert.ok(FX_MS.plume <= 1000 && FX_MS.quake <= 1000);
});
test("art: every Tesla-cleared asset ships as webp", () => {
  for (const n of ART) assert.ok(existsSync(new URL(`plate-tectonics/art/${n}.webp`, pub)), n);
  assert.deepEqual(ART, ["tex-continental-crust", "tex-oceanic-crust", "tex-mantle", "ridge-crest", "trench", "volcano", "eruption-plume", "lava-glow", "quake-burst", "mountains-fold", "slab-cross-section"]);
  assert.ok(!existsSync(new URL("plate-tectonics/art/mid-ocean-ridge.webp", pub)));
  // Leo's ridge crest: 1600x400 VP8L/VP8X webp, drawn by sprite() at its natural 4:1 aspect.
  const buf = readFileSync(new URL("plate-tectonics/art/ridge-crest.webp", pub)); assert.equal(buf.toString("ascii", 12, 16), "VP8X");
  assert.equal(1 + buf.readUIntLE(24, 3), 1600); assert.equal(1 + buf.readUIntLE(27, 3), 400);
  const scene = read("plate-tectonics/pt-scene.js"); assert.match(scene, /sprite\("ridge-crest", g\.cx \+ dx \/ 2, g\.ocean\[1\], rw\)/);
  assert.match(scene, /anchors\.ridge = \{ x: g\.cx \+ dx \/ 2, y: b\.y \+ b\.h \+ 12/);
});
test("page wiring: modes, themes, phone sheet at half, study card, docs", () => {
  const html = read("study-plate-tectonics.html"), ui = read("plate-tectonics/pt-ui.js");
  for (const f of ["plate-tectonics/pt-ui.js", "plate-tectonics/plate-tectonics-theme.css", "shared/fun/fun.css"]) assert.ok(html.includes(f));
  for (const m of ["guided", "sandbox", "fossils"]) assert.match(html, new RegExp(`data-mode="${m}"`));
  assert.match(read("plate-tectonics/plate-tectonics-theme.css"), /\[data-theme="light"\]/);
  assert.match(ui, /bottomSheet\(\$\("controls"\), \$\("sheetHandle"\), \{ getSnaps: snaps, start: 1,/);
  assert.match(ui, /forwardStudyQuery/);
  const study = read("study.html"); assert.match(study, /id: "plate-tectonics"/); assert.match(study, /file: "study-plate-tectonics.html"/);
  const doc = readFileSync(new URL("../docs/plate-tectonics-science.md", import.meta.url), "utf8"); assert.ok(doc.includes("Cleared by Tesla 2026-10-29") && !doc.includes("TODO-TESLA"));
});
test("no em-dashes and no Jasper in module copy", () => {
  for (const f of FILES) { const t = read(f); assert.ok(!t.includes("\u2014"), f); assert.ok(!/jasper/i.test(t), f); }
});
