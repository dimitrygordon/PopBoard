// Mass and Volume: tap a sample on the tray, weigh it on the balance, measure its volume in the
// cylinder, and record both. Mass divided by volume comes out the same for the two wood samples:
// the pattern that leads to density. (Sandbox values, not from the lesson.)
import { add, handle, fontPx } from "../kit.js";
const S = [
  { name: "wood cube", box: [1015, 555, 1150, 705], m: 16.2, v: 27 },
  { name: "stone", box: [1155, 590, 1290, 710], m: 52.0, v: 20 },
  { name: "metal cylinder", box: [1295, 575, 1395, 745], m: 118.5, v: 15 },
  { name: "wood ball", box: [1400, 630, 1515, 745], m: 8.4, v: 14 },
];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const table = fontPx(add(layer, "div", "cap", [110, 560, 600, 770], ""), 26); table.style.whiteSpace = "pre-line";
  const scale = fontPx(add(layer, "div", "cap", [600, 445, 800, 495], ""), 24); scale.hidden = true;
  const cyl = fontPx(add(layer, "div", "cap", [850, 110, 1030, 160], ""), 24); cyl.hidden = true;
  let cur = null; const rec = new Map();
  const draw = () => { table.textContent = "sample: mass, volume\n" + (rec.size ? [...rec].map(([n, r]) => `${n}: ${r.m ?? "?"} g, ${r.v ?? "?"} mL`).join("\n") : "Tap a sample on the tray."); };
  S.forEach((s) => handle(ctx, s.box, `Sample: ${s.name}`, {}).addEventListener("click", () => {
    art.touched("samples"); cur = s; if (!rec.has(s.name)) rec.set(s.name, {}); draw();
    say(`Picked the ${s.name}. Weigh it, then measure its volume.`);
  }));
  ui.button("Weigh on the balance", () => {
    if (!cur) return say("Tap a sample on the tray first.");
    rec.get(cur.name).m = cur.m; scale.hidden = false; scale.textContent = `${cur.m} g`; draw(); say(`Mass of the ${cur.name}: ${cur.m} g.`, true);
  });
  ui.button("Measure volume in the cylinder", () => {
    if (!cur) return say("Tap a sample on the tray first.");
    rec.get(cur.name).v = cur.v; cyl.hidden = false; cyl.textContent = `+${cur.v} mL`; draw(); say(`The water rose by ${cur.v} mL, so the ${cur.name} has a volume of ${cur.v} mL.`, true);
  });
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
