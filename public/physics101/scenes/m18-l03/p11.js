// Van de Graaff: Run the generator and tap to touch the dome.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Run time", min: 0, max: 60, step: 5, value: 10, unit: "s", d: 0 }],
    cuts: [
    { id: "try", label: "Dome: tap to touch it", tap: (st, c) => { return st.t > 20 ? "Your hair stands up: each strand has like charge." : "Not much charge yet."; } }],
    show: (st) => `dome charge \u2248 ${F(st.t * 0.1, 1)} \u00b5C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}
