// Falling objects: drop the heavy ball and the feather in the glass room, with air on or off. The Figure 6
// box that matches what you saw lights up: new evidence revised the explanation.
import { add, handle, place, tween } from "../kit.js";
const FLOOR = 560;
const SLOTS = [[555, 44, 1312, 191], [555, 262, 1312, 403], [555, 473, 1312, 614], [555, 684, 1312, 828]];
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  let air = true, busy = false;
  const hi = add(layer, "div", "", SLOTS[0]); Object.assign(hi.style, { border: "4px solid #E2B654", borderRadius: "18px", display: "none", boxShadow: "0 0 0 4px rgba(226,182,84,0.25)" });
  const light = (i) => { place(hi, [SLOTS[i][0] - 8, SLOTS[i][1] - 8, SLOTS[i][2] + 8, SLOTS[i][3] + 8]); hi.style.display = ""; };
  const setAir = (on) => { air = on; airBtn.set(air ? "Air: on" : "Air: off"); art.set("air-toggle", { rot: air ? 0 : 90 }); };
  const drop = async () => {
    if (busy) return; busy = true; art.touched("heavy-ball"); art.touched("light-object");
    const db = FLOOR - 295, df = FLOOR - 302, T = 1100;
    await tween(air ? T * 3 : T, (t) => {
      const fb = Math.min(1, (t * (air ? 3 : 1)) ** 2);   // the ball barely notices the air
      const ff = air ? t : t * t;                          // the feather drifts down slowly with air
      art.set("heavy-ball", { dy: fb * db });
      art.set("light-object", { dy: ff * df, dx: air ? Math.sin(t * 9) * 18 : 0, rot: air ? Math.sin(t * 9) * 14 : 0 });
    }, reduce);
    if (air) { say("With air, the feather lags behind. That looks like heavier objects fall faster.", null); light(0); }
    else { say("With the air off, both land together. Fall speed depends on time fallen, not mass.", true); light(1); }
    busy = false;
  };
  const reset = () => { art.set("heavy-ball", { dy: 0 }); art.set("light-object", { dx: 0, dy: 0, rot: 0 }); };
  handle(ctx, [110, 220, 380, 320], "Drop the ball and the feather", {}).addEventListener("click", () => { reset(); drop(); });
  handle(ctx, [205, 705, 295, 795], "Air switch", {}).addEventListener("click", () => { art.touched("air-toggle"); setAir(!air); reset(); });
  const airBtn = ui.button("Air: on", () => { art.touched("air-toggle"); setAir(!air); reset(); });
  ui.button("Drop both", () => { reset(); drop(); });
  ui.button("Gravity explained (Newton, Einstein)", () => { light(2); setTimeout(() => light(3), reduce ? 0 : 1500); say("Later evidence explained why objects fall: a force of attraction, then curved space.", true); });
  art.touchable(["heavy-ball", "light-object", "air-toggle"]);
  return { destroy() {} };
}
