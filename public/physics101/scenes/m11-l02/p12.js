// \u0394S = Q/T: Use the button to melt more ice at 273 K and read the entropy change.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { m: 1 },
    sliders: [],
    cuts: [],
    show: (st) => `Q = ${st.m}.0 kg \u00d7 3.34 \u00d7 10\u2075 J/kg = ${E(st.m * 3.34e5, 2)} J\n\u0394S = Q/T = ${F(st.m * 3.34e5 / 273, 0)} J/K`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next mass", () => { const line = ((st, c) => { st.m = st.m >= 5 ? 1 : st.m + 1; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
