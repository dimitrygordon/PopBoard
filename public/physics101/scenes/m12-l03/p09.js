// Foil boat: Load pennies (2.5 g each) into a foil boat that can displace at most 100 g of water.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Pennies", min: 0, max: 50, step: 1, value: 10, unit: "", d: 0 }],
    cuts: [
    { id: "foil", label: "Waterline: tap to explain", tap: (st, c) => { return st.n * 2.5 + 5 > 100 ? "It sinks." : "It floats: it displaces its own weight of water."; } }],
    show: (st) => `boat + pennies = ${F(5 + st.n * 2.5, 1)} g of 100 g max\n${5 + st.n * 2.5 > 100 ? "sinks" : "floats"}`,
  });
  ctx.art.touchable(["foil"]);
  return { destroy() {} };
}
