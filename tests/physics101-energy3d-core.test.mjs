import { test } from "node:test";
import assert from "node:assert/strict";
const base = "../public/physics101/scenes/energy3d/";
const { palette } = await import(base + "palette.js");
const core = await import(base + "core.js");
const KINDS = ["kinetic", "gravitational", "elastic", "thermal", "chemical", "sound", "light", "electrical"];

test("core exports exist", () => {
  assert.equal(typeof core.createEnergyScene, "function");
  assert.equal(typeof core.toon, "function");
  assert.ok(core.THREE && core.THREE.WebGLRenderer);
  assert.equal(core.palette, palette);
});
test("createEnergyScene returns null without WebGL", () => {
  assert.equal(core.createEnergyScene({}), null);
});
test("palette complete", () => {
  for (const k of KINDS) for (const m of ["light", "dark"]) assert.match(palette[k][m], /^#[0-9A-F]{6}$/i, `${k}.${m}`);
});
test("toon adds outline and shadow", () => {
  const m = core.toon(new core.THREE.Mesh(new core.THREE.BoxGeometry()), palette.kinetic.light);
  assert.ok(m.material.isMeshToonMaterial && m.castShadow && m.children.length === 1);
});
