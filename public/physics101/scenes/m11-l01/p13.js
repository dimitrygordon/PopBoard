// Example Problem 1: 373 K gives 1.8e5 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Final temperature", min: 295, max: 500, step: 1, value: 373, unit: "K", d: 0 }],
    cuts: [],
    show: (st) => `Q = 5.10 \u00d7 450 \u00d7 (${st.t} \u2212 295) = ${E(5.1 * 450 * (st.t - 295), 2)} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Book value", () => { const line = ((st, c) => { st.t = 373; c.t.set(373); return "Q = 1.8 \u00d7 10\u2075 J."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
