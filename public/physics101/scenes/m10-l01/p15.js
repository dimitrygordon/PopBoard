// Sandbox rider: F = 200 - 20 v N; P = F v peaks at v = 5 m/s, 500 W.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Speed", min: 0, max: 10, step: 0.5, value: 3, unit: "m/s", d: 1 }],
    cuts: [
    { id: "gear", label: "Gear: tap to jump to the peak", tap: (st, c) => { st.v = 5; c.v.set(5); return "The best gear keeps you near the peak of the power curve."; } }],
    show: (st) => `F = ${F(200 - 20 * st.v, 0)} N, P = Fv = ${F((200 - 20 * st.v) * st.v, 0)} W (peak 500 W at 5 m/s)`,
  });
  ctx.art.touchable(["gear"]);
  return { destroy() {} };
}
