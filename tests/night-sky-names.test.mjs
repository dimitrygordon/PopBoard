// Constellation name collision culling (Leo art pass 1) plus the never-culled list.
import test from "node:test";
import assert from "node:assert/strict";
import { cullNameBoxes, NEVER_CULL_IDS } from "../public/night-sky/layers/constellations.js";
import { altAzToWorld } from "../public/night-sky/ns-astro.js";

const PX = 10; // atlas px per degree, so a 20x20 box is 2 deg on a side (half-width 1 before pad)
function run(rows, { floorDeg = -91, shown: shownIn } = {}) {
  const dirs = rows.map((r) => (r.hide ? null : altAzToWorld(r.alt, r.az)));
  const sizes = rows.map((r) => r.size || [20, 20]);
  const prio = rows.map((r) => r.prio ?? 1);
  const ids = rows.map((r) => r.id);
  const shown = new Uint8Array(shownIn || prio.length);
  const out = cullNameBoxes(dirs, { sizes, pxPerDeg: PX, offsetDeg: 1, prio, shown, floorDeg, ids, scale: 1 });
  return { out, shown, kept: out.map((d, i) => (d ? ids[i] : null)).filter(Boolean) };
}

test("NEVER_CULL_IDS lists the 20 figures that keep their names", () => {
  assert.deepEqual([...NEVER_CULL_IDS], ["Ori", "CMa", "CMi", "UMa", "UMi", "Cas", "Cyg", "Lyr", "Aql", "Leo", "Sco", "Sgr", "Tau", "Gem", "Cru", "Cen", "Boo", "Peg", "And", "Per"]);
});

test("of two overlapping names, the figure with more line stars wins", () => {
  const { kept } = run([{ id: "Tel", alt: 40, az: 180, prio: 4 }, { id: "Sgr", alt: 40, az: 180, prio: 16 }]);
  assert.deepEqual(kept, ["Sgr"]);
});

test("+3 hysteresis: a visible name of nearly equal size is not swapped for a neighbour", () => {
  const first = run([{ id: "A", alt: 40, az: 180, prio: 5 }, { id: "B", alt: 40, az: 181, prio: 6 }]);
  assert.deepEqual(first.kept, ["B"]);
  const second = run([{ id: "A", alt: 40, az: 180, prio: 8 }, { id: "B", alt: 40, az: 181, prio: 6 }], { shown: first.shown });
  assert.deepEqual(second.kept, ["B"]);
  const third = run([{ id: "A", alt: 40, az: 180, prio: 10 }, { id: "B", alt: 40, az: 181, prio: 6 }], { shown: first.shown });
  assert.deepEqual(third.kept, ["A"]);
});

test("pinned never-culled names stay even when a bigger neighbour overlaps; the horizon floor still hides them", () => {
  const mid = run([{ id: "Ori", alt: 50, az: 90, prio: 3 }, { id: "UMa", alt: 50, az: 90, prio: 20 }]);
  assert.ok(mid.kept.includes("Ori") && mid.kept.includes("UMa"), String(mid.kept));
  const drop = run([{ id: "Tel", alt: 50, az: 90, prio: 3 }, { id: "Ori", alt: 50, az: 90, prio: 8 }]);
  assert.deepEqual(drop.kept, ["Ori"]);
  const low = run([{ id: "Ori", alt: 5, az: 180, prio: 20 }], { floorDeg: 4 });
  assert.deepEqual(low.kept, []);
  const high = run([{ id: "Ori", alt: 12, az: 180, prio: 20 }], { floorDeg: 4 });
  assert.deepEqual(high.kept, ["Ori"]);
});
