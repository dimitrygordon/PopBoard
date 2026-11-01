// Mass and Volume (Leo's drag spec): each sample is its own cutout. Drag one onto a balance pan to weigh it,
// then into the graduated cylinder to measure its volume, and both land in the record. The shared engine
// (scenes/drag.js) does the dragging, keys and snapping; this scene adds the two drop zones drawn in the art
// and the readouts. Mass divided by volume is the same for the two wood samples: the pattern that leads to
// density. (Sandbox values, not from the lesson.)
import { add, fontPx } from "../kit.js";
const S = {
  "sample-cube": { name: "wood cube", m: 16.2, v: 27, floats: true },
  "sample-stone": { name: "stone", m: 52.0, v: 20 },
  "sample-cylinder": { name: "metal cylinder", m: 118.5, v: 15 },
  "sample-ball": { name: "wood ball", m: 8.4, v: 14, floats: true },
};
export default function build(ctx) {
  const { art, ui, say, layer, drag } = ctx;
  const table = fontPx(add(layer, "div", "cap", [110, 560, 600, 770], ""), 26); table.style.whiteSpace = "pre-line";
  const scale = fontPx(add(layer, "div", "cap", [600, 445, 800, 495], ""), 24); scale.hidden = true;
  const cyl = fontPx(add(layer, "div", "cap", [830, 110, 1060, 160], ""), 24); cyl.hidden = true;
  const rec = new Map(); let cur = null;
  const draw = () => { table.textContent = "sample: mass, volume\n" + (rec.size ? [...rec].map(([n, r]) => `${n}: ${r.m ?? "?"} g, ${r.v ?? "?"} mL`).join("\n") : "Drag a sample onto the balance."); };
  const row = (s) => { if (!rec.has(s.name)) rec.set(s.name, {}); return rec.get(s.name); };
  const weigh = (s = cur) => { if (!s) return say("Drag a sample onto the balance first."); cur = s; row(s).m = s.m; scale.hidden = false; scale.textContent = `${s.m} g`; draw(); say(`Mass of the ${s.name}: ${s.m} g. Now drag it into the cylinder.`, true); };
  const measure = (s = cur) => {
    if (!s) return say("Drag a sample into the cylinder first."); cur = s; row(s).v = s.v; cyl.hidden = false; cyl.textContent = `+${s.v} mL` + (s.floats ? " (pinned)" : ""); draw();
    say((s.floats ? `Wood floats! Push the ${s.name} just under the surface with a pin, then read the water level. ` : "") + `The water rose by ${s.v} mL, so the ${s.name} has a volume of ${s.v} mL.`, true);
  };
  if (drag) {
    drag.spec.oneAtATime = true;
    drag.addTarget({ id: "balance", label: "balance pan", box: [470, 300, 880, 420], at: [557, 352] });
    drag.addTarget({ id: "cylinder", label: "graduated cylinder", box: [880, 250, 980, 500], at: [928, 420] });
    drag.on("drop", (id, t) => { const s = S[id]; if (!s) return; if (t === "balance") weigh(s); else if (t === "cylinder") measure(s); else if (t === "tray") drag.home(id); });
    if (art.box("tray")) drag.addTarget({ id: "tray", label: "tray", box: art.box("tray") }); // back on the tray: home
  }
  ui.button("Weigh on the balance", () => weigh());
  ui.button("Measure volume in the cylinder", () => measure());
  ui.button("Look for the pattern", () => {
    const done = Object.values(S).filter((s) => rec.get(s.name)?.m != null && rec.get(s.name)?.v != null);
    if (done.length < 2) return say("Record mass and volume for at least two samples first.");
    say(done.map((s) => `${s.name}: ${(s.m / s.v).toFixed(2)} g/mL`).join("; ") + ". The two wood samples share one mass-to-volume ratio even though their sizes differ: that ratio is density.", true);
  });
  ui.button("Start over", () => { rec.clear(); cur = null; scale.hidden = cyl.hidden = true; draw(); say(""); });
  draw();
  return { destroy() {} };
}
