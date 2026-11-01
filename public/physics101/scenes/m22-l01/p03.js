// Spectra: Drag the temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 1000, max: 6000, step: 250, value: 3000, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Curve: tap to explain", tap: (st, c) => { return "Hotter: peak moves to higher frequency and grows."; } }],
    show: (st) => `peak frequency \u2248 ${F(5.88e10 * st.t / 1e14, 2)} \u00d7 10\u00b9\u2074 Hz`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
