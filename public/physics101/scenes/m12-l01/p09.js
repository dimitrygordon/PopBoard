// PV = nRT: Use the button to add moles of gas in a 22.4 L container at 273 K.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [],
    show: (st) => `P = nRT/V = ${st.n} \u00d7 8.31 \u00d7 273 / 0.0224 = ${F(st.n * 8.31 * 273 / 0.0224 / 1000, 0)} kPa`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Add a mole", () => { const line = ((st, c) => { st.n = st.n >= 4 ? 1 : st.n + 1; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
