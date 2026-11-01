// Quarks: Change the up quarks in a trio.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "u", label: "Up quarks", min: 0, max: 3, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Baryon: tap to explain", tap: (st, c) => { return "uud = proton, udd = neutron."; } }],
    show: (st) => `charge = ${F(st.u * 2 / 3 - (3 - st.u) / 3, 0)}${st.u === 2 ? " (proton)" : st.u === 1 ? " (neutron)" : ""}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
