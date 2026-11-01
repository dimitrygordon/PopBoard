// Boyle and Charles: Use the button to switch laws, then squeeze or heat 2.0 L of gas at 100 kPa and 300 K.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, k: 1 },
    sliders: [],
    cuts: [],
    show: (st) => st.i ? `Charles: T = ${300 * st.k} K, V = ${2 * st.k}.0 L (P fixed)` : `Boyle: P = ${100 * st.k} kPa, V = ${F(2 / st.k, 2)} L (T fixed)`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next step", () => { const line = ((st, c) => { st.k = st.k >= 4 ? 1 : st.k + 1; if (st.k === 1) st.i = 1 - st.i; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
