// Precision depends on the instrument: tap the dropper to add liquid, then read the same liquid in
// the 1 mL cylinder and in the 50 mL beaker. Precision is half the smallest division.
import { add, handle, fontPx } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  let vol = 37;
  const tag = fontPx(add(layer, "div", "cap", [880, 40, 1560, 100], ""), 26);
  const show = () => { tag.textContent = `Liquid: ${vol} mL so far`; };
  handle(ctx, art.box("dropper"), "Dropper: tap to add 5 mL", {}).addEventListener("click", () => {
    art.touched("dropper"); vol = Math.min(95, vol + 5); show(); say(`Added 5 mL. Now read it in each container.`);
  });
  const cyl = () => say(`Cylinder (1 mL divisions): ${vol.toFixed(1)} \u00b1 0.5 mL. Half of 1 mL is 0.5 mL.`, true);
  const bkr = () => { const r = Math.round(vol / 50) * 50; say(`Beaker (50 mL divisions): about ${r} \u00b1 25 mL. Half of 50 mL is 25 mL, so the beaker is far less precise.`, true); };
  handle(ctx, [470, 40, 660, 700], "Graduated cylinder: read the volume", {}).addEventListener("click", cyl);
  handle(ctx, [740, 230, 1110, 700], "Beaker: read the volume", {}).addEventListener("click", bkr);
  ui.button("Read in the cylinder", cyl);
  ui.button("Read in the beaker", bkr);
  ui.button("Start over", () => { vol = 37; show(); say(""); });
  art.touchable(["dropper"]);
  show();
  return { destroy() {} };
}
