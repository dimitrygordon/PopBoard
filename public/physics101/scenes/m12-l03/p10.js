// Hose: Narrow the hose opening and watch the stream speed up (1.0 m/s in a 2.0 cm\u00b2 hose).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Opening area", min: 0.2, max: 2, step: 0.1, value: 1, unit: "cm\\u00b2", d: 1 }],
    cuts: [
    { id: "hose", label: "Speed: tap to explain", tap: (st, c) => { return "Same flow through less area means faster water."; } }],
    show: (st) => `v = 1.0 \u00d7 2.0 / ${F(st.a, 1)} = ${F(2 / st.a, 1)} m/s`,
  });
  ctx.art.touchable(["hose"]);
  return { destroy() {} };
}
