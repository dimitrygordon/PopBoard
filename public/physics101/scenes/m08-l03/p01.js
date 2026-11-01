// Toss a wrench: Tap to toss the wrench and switch which point you trace.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, P: ["the center of mass", "the handle end", "the jaw"] },
    sliders: [],
    cuts: [
    { id: "toss", label: "Toss: tap to trace another point", tap: (st, c) => { st.i = (st.i + 1) % 3; return st.i ? "This point wobbles as the wrench spins." : "Only the center of mass follows a smooth path."; } }],
    show: (st) => `tracing ${st.P[st.i]}: ${st.i ? "wobbly loops" : "a smooth path"}`,
  });
  ctx.art.touchable(["toss"]);
  return { destroy() {} };
}
