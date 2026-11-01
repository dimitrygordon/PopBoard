// Two glances: each glance records where the hamster is and when. Two glances at different times,
// with the hamster in a different place, tell you it moved.
import { add, handle, fontPx } from "../kit.js";
const DISH = [1120, 600]; // Leo's red ring by the food dish
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [700, 160, 1560, 330], "No glances yet."), 28); cap.style.whiteSpace = "pre-line";
  const hb = art.box("hamster"), hc = [(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2];
  let n = 0;
  const glance = () => {
    art.touched("hamster");
    if (n === 0) { n = 1; cap.textContent = "Glance 1: where? left corner of the cage.  when? 3:00 p.m."; say("Now wait, then glance again."); }
    else if (n === 1) {
      n = 2; art.set("hamster", { dx: DISH[0] - hc[0], dy: DISH[1] - hc[1] });
      cap.textContent = "Glance 1: where? left corner.  when? 3:00 p.m.\nGlance 2: where? next to the food dish.  when? 3:20 p.m.";
      say("Different place at a later time: the hamster moved. Describing motion means saying where and when.", true);
    } else { n = 0; art.set("hamster", { dx: 0, dy: 0 }); cap.textContent = "No glances yet."; say(""); }
  };
  handle(ctx, hb, "Hamster: tap to glance", {}).addEventListener("click", glance);
  ui.button("Glance", glance);
  art.touchable(["hamster"]);
  return { destroy() {} };
}
