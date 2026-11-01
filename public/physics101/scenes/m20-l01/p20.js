// Solenoid: Tap to reverse the battery.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { r: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Battery: tap to reverse", tap: (st, c) => { st.r = 1 - st.r; return "Curl your fingers with the current: your thumb points north."; } }],
    show: (st) => st.r ? "north pole: left end" : "north pole: right end",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
