// Fuse: Switch on the next appliance (120 V, 15 A fuse).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Appliances on", min: 0, max: 3, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Fuse: tap to explain", tap: (st, c) => { return "Fuse current = sum of P/\u0394V."; } }],
    show: (st) => (() => { const P = [240, 720, 1440].slice(0, st.n).reduce((a, b) => a + b, 0), I = P / 120; return `TV 240 W, iron 720 W, dryer 1440 W\nI = ${F(I, 1)} A${I > 15 ? ": the fuse blows" : ""}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
