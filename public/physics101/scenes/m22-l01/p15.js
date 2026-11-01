// Extra energy: Raise the frequency (f\u2080 = 5.0 \u00d7 10\u00b9\u2074 Hz).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "f", min: 3, max: 12, step: 0.1, value: 8, unit: "\\u00d7 10\\u00b9\\u2074 Hz", d: 1 }],
    cuts: [
    { id: "try", label: "Electron: tap to explain", tap: (st, c) => { return "KE = hf \u2212 hf\u2080."; } }],
    show: (st) => st.f > 5 ? `KE = ${F(4.136e-15 * (st.f - 5) * 1e14, 2)} eV` : "no electron",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
