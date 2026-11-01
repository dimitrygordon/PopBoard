// Cold limit: Use the button to cool a sample by 50 K steps toward absolute zero.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { k: 300 },
    sliders: [],
    cuts: [],
    show: (st) => `${st.k} K = ${F(st.k - 273.15, 2)} \u00b0C\nabsolute zero: 0 K = \u2212273.15 \u00b0C`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Cool by 50 K", () => { const line = ((st, c) => { st.k = st.k <= 50 ? 300 : st.k - 50; return st.k === 300 ? "Reset. Absolute zero itself can never be reached." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
