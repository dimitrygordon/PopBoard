// Straight path: Adjust E and B until the beam runs straight (beam speed 2.0 \u00d7 10\u2077 m/s).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "E", min: 1, max: 10, step: 0.5, value: 5, unit: "\\u00d7 10\\u2074 N/C", d: 1 }, { key: "b", label: "B", min: 1, max: 5, step: 0.5, value: 2.5, unit: "mT", d: 1 }],
    cuts: [
    { id: "try", label: "Beam: tap to check", tap: (st, c) => { return Math.abs(st.e * 1e4 / (st.b * 1e-3) - 2e7) < 1e5 ? "Straight! v = E/B." : "Still bending."; } }],
    show: (st) => `E/B = ${E(st.e * 1e4 / (st.b * 1e-3), 2)} m/s`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
