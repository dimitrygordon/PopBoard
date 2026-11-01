// Pull out: Pull the electron outward.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Orbit n", min: 1, max: 5, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "Work raises the energy."; } }],
    show: (st) => `E = ${F(-13.6 / st.n ** 2, 2)} eV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
