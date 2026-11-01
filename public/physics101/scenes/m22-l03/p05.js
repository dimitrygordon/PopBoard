// Marble: Scale the nucleus.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Nucleus diameter", min: 0.5, max: 2, step: 0.1, value: 1.5, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Atom: tap to explain", tap: (st, c) => { return "The atom is about 10\u2075 times the nucleus."; } }],
    show: (st) => `edge of the atom: ${F(st.d * 1e5 / 100 / 1000 / 2, 2)} km away`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
