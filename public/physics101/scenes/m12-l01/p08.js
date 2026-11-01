// Combined law: Use the button to double the temperature of 2.0 L at 100 kPa and 300 K while also doubling the pressure.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [],
    show: (st) => ["start: 100 kPa, 2.0 L, 300 K", "double T: 100 kPa, 4.0 L, 600 K", "then double P: 200 kPa, 2.0 L, 600 K"][st.s] + "\nPV/T stays 0.667 kPa\u00b7L/K",
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next change", () => { const line = ((st, c) => { st.s = (st.s + 1) % 3; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
