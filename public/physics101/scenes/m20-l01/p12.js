// Flux loop: Drag the counting loop along the magnet.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Position", min: 0, max: 10, step: 1, value: 0, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Loop: tap to explain", tap: (st, c) => { return "Flux is greatest where the lines crowd: the poles."; } }],
    show: (st) => `flux through the loop: ${F(10 * (0.2 + 0.8 * (Math.abs(st.x - 5) / 5) ** 2), 1)} lines`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
