// Arc length: Place the dot at a distance from the center and rotate the disc. The dot travels d = r\u0394\u03b8.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Dot distance", min: 0, max: 0.12, step: 0.01, value: 0.06, unit: "m", d: 2 }, { key: "t", label: "Turn", min: 0, max: 6.28, step: 0.1, value: 1.57, unit: "rad", d: 2 }],
    cuts: [
    { id: "dot", label: "Dot: tap to rotate one full turn", tap: (st, c) => { st.t = 6.28; c.t.set(st.t); return `One full turn moves the dot ${F(2 * Math.PI * st.r, 3)} meters.`; } }],
    show: (st) => `d = r\u0394\u03b8 = ${F(st.r, 2)} \u00d7 ${F(st.t, 2)} = ${F(st.r * st.t, 3)} m`,
  });
  ctx.art.touchable(["dot"]);
  return { destroy() {} };
}
