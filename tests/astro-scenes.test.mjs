// Every per-page 3D scene module (public/js/astro-scenes/<deck>/pNN.js) loads, exports build(ctx),
// runs a few frames against the documented ctx, and disposes cleanly. See docs/astro-scenes.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../public/js/astro-scenes");
const T = await import(pathToFileURL(path.resolve(import.meta.dirname, "../public/vendor/three/three.module.min.js")));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const onDisk = fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory())
  .flatMap((d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => /^p\d{2}\.js$/.test(f)).map((f) => `${d}/${f.slice(0, -3)}`));


function makeCtx() {
  const scene = new T.Scene(), layers = { fg: new T.Group(), mid: new T.Group(), bg: new T.Group() };
  layers.fg.position.z = 2.2; layers.bg.position.z = -6; scene.add(layers.fg, layers.mid, layers.bg);
  const camera = new T.PerspectiveCamera(30, 16 / 9, 0.1, 100); camera.position.set(0, 0, 16.8);
  const drags = [];
  const ctx = {
    THREE: T, scene, camera, layers, reducedMotion: false, phone: false, controls: null,
    palette: { dark: true, paper: 0x1e2433, ink: 0xf3ead7, gold: 0xe2b654, blue: 0x7fa6d9, red: 0xd9826b, inkCss: "#F3EAD7", goldCss: "#E2B654", blueCss: "#7FA6D9" },
    sketch: (o) => o,
    pencil: () => new T.Texture(),
    label: (text, pos = [0, 0, 0], { layer = "fg" } = {}) => { const s = new T.Sprite(new T.SpriteMaterial()); s.position.set(...pos); layers[layer].add(s); return s; },
    art: (src, { layer = "mid" } = {}) => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial()); layers[layer].add(m); return m; },
    setCamera(pos, look) { camera.position.set(...pos); camera.lookAt(...look); camera.updateMatrixWorld(); },
    onDrag: (fn) => drags.push(fn),
  };
  return { ctx, drags };
}

test("scene manifest matches the files on disk and names real decks", () => {
  const listed = Object.entries(manifest).flatMap(([d, ps]) => ps.map((p) => `${d}/${p}`));
  assert.deepEqual([...listed].sort(), [...onDisk].sort());
  for (const d of Object.keys(manifest)) assert.ok(fs.existsSync(path.resolve(import.meta.dirname, `../public/astro-course/decks/${d}`)), `unknown deck ${d}`);
});

for (const id of onDisk) test(`scene ${id} loads, builds, runs and disposes`, async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, id + ".js")));
  assert.equal(typeof mod.default, "function", "default export build(ctx)");
  const { ctx, drags } = makeCtx();
  const api = mod.default(ctx) || {};
  assert.ok(ctx.scene.children.length >= 3);
  for (let i = 0; i < 30; i++) api.update && api.update(i / 10, 0.1);
  for (const f of drags) f({ dx: 0.1, dy: 0, x: 0.5, y: 0.5 });
  ctx.camera.updateMatrixWorld();
  for (const v of [ctx.camera.position.x, ctx.camera.position.y, ctx.camera.position.z]) assert.ok(Number.isFinite(v), "camera stays finite");
  assert.doesNotThrow(() => api.dispose && api.dispose());
  assert.equal(typeof (api.update ?? (() => {})), "function");
});
