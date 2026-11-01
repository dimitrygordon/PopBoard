// Specific heat: Use the button to pick a material and see the energy to warm 1.0 kg by 1 K.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "aluminum", "iron", "copper", "lead"], C: [4180, 897, 450, 385, 130] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}: C = ${st.C[st.i]} J/(kg\u00b7K)\nenergy for 1.0 kg, +1 K: ${st.C[st.i]} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next material", () => { const line = ((st, c) => { st.i = (st.i + 1) % 5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
