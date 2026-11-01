// Superconductor: Cool the wire (critical temperature 93 K).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Temperature", min: 50, max: 300, step: 1, value: 150, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Wire: tap to explain", tap: (st, c) => { return "Below its critical temperature: zero resistance, no heating."; } }],
    show: (st) => st.t < 93 ? "R = 0 \u03a9, no heating" : `R > 0, heating ${F(st.t / 300, 2)} \u00d7 room-temperature value`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
