// Average energy: Use the button to switch between a cup and a bathtub at the same temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [],
    show: (st) => st.i ? "bathtub at 40 \u00b0C: huge thermal energy\naverage KE per particle: same as the cup" : "cup at 40 \u00b0C: small thermal energy\naverage KE per particle: same as the tub",
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Switch container", () => { const line = ((st, c) => { st.i = 1 - st.i; return "Same temperature, different thermal energy."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
