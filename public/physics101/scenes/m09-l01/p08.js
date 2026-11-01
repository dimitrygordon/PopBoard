// 75 kg occupant stopping from 15 m/s: impulse 1125 N s; stop time 0.010 s without, 0.10 s with the bag (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { b: false },
    sliders: [],
    cuts: [
    { id: "bag", label: "Bag: tap to toggle the air bag", tap: (st, c) => { st.b = !st.b; return st.b ? "Ten times longer, one tenth the force." : ""; } }],
    show: (st) => `${st.b ? "with" : "without"} air bag: \u0394t = ${st.b ? "0.10" : "0.010"} s\naverage force = ${E(1125 / (st.b ? 0.1 : 0.01), 1)} N (impulse 1125 N\u00b7s)`,
  });
  ctx.art.touchable(["bag"]);
  return { destroy() {} };
}
