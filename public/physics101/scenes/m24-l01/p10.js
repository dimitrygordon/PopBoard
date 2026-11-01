// Binding: Pull out nucleons from helium-4.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Nucleons pulled", min: 0, max: 4, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Bar: tap to explain", tap: (st, c) => { return "Total: 28.3 MeV to separate all four."; } }],
    show: (st) => `energy supplied \u2248 ${F(28.3 * st.n / 4, 1)} MeV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
