// Ribbon: Tap to send a pulse down the rope.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 0 },
    sliders: [],
    cuts: [
    { id: "rope", label: "Ribbon bobs: tap to send a pulse", tap: (st, c) => { st.n++; return "The ribbon goes up and down and stays put. Energy travels, matter doesn't."; } }],
    show: (st) => `pulses sent: ${st.n}\nribbon's net travel along the rope: 0 m`,
  });
  ctx.art.touchable(["rope"]);
  return { destroy() {} };
}
