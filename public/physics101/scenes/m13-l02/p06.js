// Rope speed: Change frequency, then tap to switch ropes. Only the medium changes the speed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["light rope", "heavy rope"], V: [8, 4] },
    sliders: [{ key: "f", label: "Frequency", min: 1, max: 10, step: 0.5, value: 2, unit: "Hz", d: 1 }],
    cuts: [
    { id: "sw", label: "Speed: tap to switch ropes", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => `${st.N[st.i]}: v = ${st.V[st.i]} m/s\n\u03bb = v/f = ${F(st.V[st.i] / st.f, 2)} m`,
  });
  ctx.art.touchable(["sw"]);
  return { destroy() {} };
}
