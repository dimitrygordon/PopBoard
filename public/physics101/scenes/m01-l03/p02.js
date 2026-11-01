// Mass and Volume: tap a sample on the tray, weigh it on the balance, measure its volume in the
// cylinder, and record both. Drag the tray onto the balance to weigh or onto the cylinder to measure. Mass divided by volume comes out the same for the two wood samples:
// the pattern that leads to density. (Sandbox values, not from the lesson.)
import { add, handle, fontPx, tween, ease } from "../kit.js";
const S = [
  { name: "wood cube", box: [1015, 555, 1150, 705], m: 16.2, v: 27, floats: true },
  { name: "stone", box: [1155, 590, 1290, 710], m: 52.0, v: 20 },
  { name: "metal cylinder", box: [1295, 575, 1395, 745], m: 118.5, v: 15 },
  { name: "wood ball", box: [1400, 630, 1515, 745], m: 8.4, v: 14, floats: true },
];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const table = fontPx(add(layer, "div", "cap", [110, 560, 600, 770], ""), 26); table.style.whiteSpace = "pre-line";
  const scale = fontPx(add(layer, "div", "cap", [600, 445, 800, 495], ""), 24); scale.hidden = true;
  const cyl = fontPx(add(layer, "div", "cap", [830, 110, 1060, 160], ""), 24); cyl.hidden = true;
  let cur = null; const rec = new Map();
  const draw = () => { table.textContent = "sample: mass, volume\n" + (rec.size ? [...rec].map(([n, r]) => `${n}: ${r.m ?? "?"} g, ${r.v ?? "?"} mL`).join("\n") : "Tap a sample on the tray."); };
  let off = [0, 0], o0 = [0, 0];
  const home = () => tween(400, (t) => { const k = 1 - ease(t); art.set("samples", { dx: o0[0] * k, dy: o0[1] * k }); }, ctx.reduce).then(() => (off = [0, 0]));
  const pick = (s) => { art.touched("samples"); cur = s; if (!rec.has(s.name)) rec.set(s.name, {}); draw(); say(`Picked the ${s.name}. Drag the tray to the balance, then to the cylinder.` + (s.floats ? " Wood floats, so push it under with a pin to read its displacement volume." : "")); };
  const dragOpts = (s) => ({
    start: () => { art.touched("samples"); off = [0, 0]; },
    move: (dx, dy) => { off = [dx, dy]; art.set("samples", { dx, dy }); },
    end: (_dx, _dy, pt) => {
      const [cx, cy] = pt; o0 = off; // zones follow the pointer, which holds the tray

      if (Math.hypot(off[0], off[1]) < 12) { pick(s); return home(); }
      if (!cur) pick(s);
      if (cx < 860 && cy < 560) weigh(); else if (cx >= 860 && cx < 1060 && cy < 560) measure();
      else say("Drop the tray on the balance or on the cylinder.");
      home();
    },
  });
  S.forEach((s) => handle(ctx, s.box, `Sample: ${s.name}. Tap to pick it, drag the tray to the balance or the cylinder`, dragOpts(s)));
  const weigh = () => {
    if (!cur) return say("Tap a sample on the tray first.");
    rec.get(cur.name).m = cur.m; scale.hidden = false; scale.textContent = `${cur.m} g`; draw(); say(`Mass of the ${cur.name}: ${cur.m} g.`, true);
  };
  ui.button("Weigh on the balance", weigh);
  const measure = () => {
    if (!cur) return say("Tap a sample on the tray first.");
    rec.get(cur.name).v = cur.v; cyl.hidden = false; cyl.textContent = `+${cur.v} mL` + (cur.floats ? " (pinned)" : ""); draw();
    say((cur.floats ? `Wood floats! Push the ${cur.name} just under the surface with a pin, then read the water level. ` : "") + `The water rose by ${cur.v} mL, so the ${cur.name} has a volume of ${cur.v} mL.`, true);
  };
  ui.button("Measure volume in the cylinder", measure);
  ui.button("Look for the pattern", () => {
    const done = S.filter((s) => rec.get(s.name)?.m != null && rec.get(s.name)?.v != null);
    if (done.length < 2) return say("Record mass and volume for at least two samples first.");
    say(done.map((s) => `${s.name}: ${(s.m / s.v).toFixed(2)} g/mL`).join("; ") + ". The two wood samples share one mass-to-volume ratio even though their sizes differ: that ratio is density.", true);
  });
  ui.button("Start over", () => { rec.clear(); cur = null; scale.hidden = cyl.hidden = true; draw(); say(""); });
  art.touchable(["samples"]);
  draw();
  return { destroy() {} };
}
