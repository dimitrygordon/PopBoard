// Pendulum clock model: change the pendulum length and see how much the clock gains or loses per day
// compared with a reference clock whose pendulum is 99.4 cm long (a 2 s swing).
import { add, handle, fontPx } from "../kit.js";
const G = 9.81, T = (L) => 2 * Math.PI * Math.sqrt(L / G), REF = 0.994;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [440, 640, 1100, 840], ""), 28); cap.style.whiteSpace = "pre-line";
  const go = (cm) => {
    const s = 86400 * (T(REF) / T(cm / 100) - 1), r = Math.round(Math.abs(s));
    cap.textContent = `Pendulum: ${cm.toFixed(1)} cm, swing ${T(cm / 100).toFixed(3)} s\n` + (r < 1 ? "Keeps time with the reference clock" : `${s > 0 ? "Gains" : "Loses"} ${r.toLocaleString("en-US")} s per day`);
    say(r < 1 ? "Matched: this clock keeps time." : s > 0 ? "A shorter pendulum swings faster, so the clock runs fast." : "A longer pendulum swings slower, so the clock runs slow.", r < 1);
  };
  const sl = ui.slider({ label: "Pendulum length", min: 95, max: 104, step: 0.1, value: 99.4, fmt: (v) => v.toFixed(1) + " cm" }, go);
  handle(ctx, art.box("clock"), "Grandfather clock: tap to match the reference", {}).addEventListener("click", () => { art.touched("clock"); sl.set(99.4); go(99.4); });
  art.touchable(["clock"]);
  go(99.4);
  return { destroy() {} };
}
