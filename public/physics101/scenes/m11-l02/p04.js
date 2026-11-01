// Latent heats: Use the button to pick a substance and read its heats of fusion and vaporization.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "copper", "iron", "mercury"], F: [3.34e5, 2.05e5, 2.66e5, 1.15e4], V: [2.26e6, 5.07e6, 6.29e6, 2.72e5] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}: H_f = ${E(st.F[st.i], 2)} J/kg\nH_v = ${E(st.V[st.i], 2)} J/kg`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next substance", () => { const line = ((st, c) => { st.i = (st.i + 1) % 4; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
