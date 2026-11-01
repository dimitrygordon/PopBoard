// 1000 kg rocket at rest (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Gas mass", min: 1, max: 50, step: 1, value: 10, unit: "kg", d: 0 }, { key: "v", label: "Exhaust speed", min: 500, max: 3000, step: 100, value: 2000, unit: "m/s", d: 0 }],
    cuts: [
    { id: "thrust", label: "Thrust: tap to fire", tap: (st, c) => { return "Equal and opposite momenta."; } }],
    show: (st) => `gas: \u2212${E(st.m * st.v)} kg\u00b7m/s\nrocket: +${E(st.m * st.v)} kg\u00b7m/s, v = ${F(st.m * st.v / (1000 - st.m), 1)} m/s`,
  });
  ctx.art.touchable(["thrust"]);
  return { destroy() {} };
}
