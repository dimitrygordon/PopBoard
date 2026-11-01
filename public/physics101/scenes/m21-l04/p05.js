// Spectrum: Drag across the spectrum.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "log\\u2081\\u2080 \\u03bb (m)", min: -15, max: 2, step: 1, value: -7, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Scale: tap to explain", tap: (st, c) => { return "Same wave, wildly different sizes."; } }],
    show: (st) => `\u03bb = 10^${st.n} m: ` + (st.n >= 1 ? "like a house (radio)" : st.n >= -3 ? "like a bee (microwave)" : st.n >= -6 ? "infrared" : st.n >= -8 ? "like a virus (visible/UV)" : st.n >= -11 ? "like an atom (X-ray)" : "like a proton (gamma)"),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
