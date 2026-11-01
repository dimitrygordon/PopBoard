// Stable stance: Tap to change the stance and see whether the center of mass stays over the base.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["feet together", "feet apart", "leaning far over"], ok: [true, true, false], b: ["narrow", "wide", "narrow"] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}: ${st.b[st.i]} base, ${st.ok[st.i] ? "CM over the base, stable" : "CM outside the base, unstable"}`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Change stance", () => { const line = ((st, c) => { st.i = (st.i + 1) % 3; return st.ok[st.i] ? "" : "The CM is outside the base: you would fall."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
