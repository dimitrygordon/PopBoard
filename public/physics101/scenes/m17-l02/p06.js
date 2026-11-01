// Many slits: Increase the number of slits.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Slits", min: 2, max: 10000, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Bands: tap to explain", tap: (st, c) => { return "More slits, narrower and brighter bands."; } }],
    show: (st) => `band width \u2248 1/${st.n} of the spacing; peak brightness \u221d ${st.n}\u00b2`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
