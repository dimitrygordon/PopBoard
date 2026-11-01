// F proportional to 1/r^2, relative to the force at r = 1.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Distance", min: 1, max: 5, step: 0.1, value: 1, unit: "r\\u2080", d: 1 }],
    cuts: [
    { id: "r", label: "Curve: tap to jump to the next whole distance", tap: (st, c) => { st.r = st.r >= 5 ? 1 : Math.floor(st.r) + 1; c.r.set(st.r); return `At ${st.r} times the distance the force is 1/${st.r * st.r} as big.`; } }],
    show: (st) => `r = ${F(st.r, 1)} r\u2080   F = F\u2080 / ${F(st.r * st.r, 2)} = ${F(1 / st.r ** 2, 3)} F\u2080`,
  });
  ctx.art.touchable(["r"]);
  return { destroy() {} };
}
