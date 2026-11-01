// Flat steps: Use the button to add heat to melting ice. The temperature stays at 0 \u00b0C until all of it melts.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { f: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `1.0 kg ice at 0 \u00b0C: ${F(st.f * 100, 0)}% melted\ntemperature: 0 \u00b0C`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Add 67 kJ", () => { const line = ((st, c) => { st.f = st.f >= 1 ? 0 : Math.min(1, st.f + 0.2); return st.f >= 1 ? "All melted. Now the temperature can rise." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}
