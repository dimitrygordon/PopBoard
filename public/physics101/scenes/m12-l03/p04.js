// Depth gauge: Lower the gauge and switch fluids.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "oil"], R: [1000, 900] },
    sliders: [{ key: "h", label: "Depth", min: 0, max: 10, step: 0.1, value: 2, unit: "m", d: 1 }],
    cuts: [
    { id: "gauge", label: "P: tap to switch fluids", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => `${st.N[st.i]}: P = \u03c1hg = ${st.R[st.i]} \u00d7 ${F(st.h, 1)} \u00d7 9.8 = ${F(st.R[st.i] * st.h * 9.8 / 1000, 1)} kPa (above the air pressure)`,
  });
  ctx.art.touchable(["gauge"]);
  return { destroy() {} };
}
