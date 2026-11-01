// Boxes 2 kg and 6 kg (sandbox). Push F = 12 N: a = F/m (inertial). Balance: F_g = mg (gravitational). Both measurements agree.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "push", label: "Push: tap to push, then weigh", tap: (st, c) => { st.s = (st.s + 1) % 2; return st.s ? "On the balance, the box that was harder to push is heavier: the two masses agree." : "The same 12 N push gives the light box three times the acceleration."; } }],
    show: (st) => st.s ? "balance: 2 kg box 19.6 N, 6 kg box 58.8 N\ngravitational mass 2 kg and 6 kg" : "push 12 N: a = 6.0 m/s\u00b2 and 2.0 m/s\u00b2\ninertial mass 2 kg and 6 kg",
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}
