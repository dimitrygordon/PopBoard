// Precision depends on the instrument: drag the dropper over the cylinder or the beaker to add 5 mL
// and read the same liquid in each. Precision is half the smallest division.
import { add, handle, fontPx, tween, ease } from "../kit.js";
const CYL = [470, 40, 660, 700], BKR = [740, 230, 1110, 700];
const inside = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  let vol = 37;
  const tag = fontPx(add(layer, "div", "cap", [880, 40, 1440, 100], ""), 26);
  const show = () => { tag.textContent = `Liquid: ${vol} mL`; };
  const cyl = () => say(`Cylinder (1 mL divisions): ${vol.toFixed(1)} \u00b1 0.5 mL. Half of 1 mL is 0.5 mL.`, true);
  const bkr = () => { const r = Math.round(vol / 50) * 50; say(`Beaker (50 mL divisions): about ${r} \u00b1 25 mL. Half of 50 mL is 25 mL, so the beaker is far less precise.`, true); };
  const D = art.box("dropper");
  let off = [0, 0];
  const home = (o) => tween(400, (t) => { const k = 1 - ease(t); art.set("dropper", { dx: o[0] * k, dy: o[1] * k }); }, reduce);
  handle(ctx, D, "Dropper: drag it over the cylinder or the beaker", {
    start: () => { art.touched("dropper"); off = [0, 0]; },
    move: (dx, dy) => { off = [dx, dy]; art.set("dropper", { dx, dy }); },
    end: (_dx, _dy, pt) => {
      const [x, y] = pt, o = off; // the pointer holds the dropper

      if (inside(CYL, x, y)) { vol = Math.min(95, vol + 5); show(); cyl(); }
      else if (inside(BKR, x, y)) { vol = Math.min(95, vol + 5); show(); bkr(); }
      else if (Math.hypot(o[0], o[1]) < 12) say("Drag the dropper over the cylinder or the beaker to add 5 mL.");
      else say("Drop it right over the cylinder or the beaker.");
      home(o);
    },
  });
  ui.button("Read in the cylinder", cyl);
  ui.button("Read in the beaker", bkr);
  ui.button("Start over", () => { vol = 37; show(); say(""); });
  art.touchable(["dropper"]);
  show();
  return { destroy() {} };
}
