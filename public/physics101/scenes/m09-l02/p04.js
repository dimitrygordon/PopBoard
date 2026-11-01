// System boundary: Tap to change the system boundary and sort each force as internal or external.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["both carts", "cart C only", "cart D only"], X: ["C on D and D on C are internal; gravity and the track are external but cancel", "D on C is external, so C's momentum changes", "C on D is external, so D's momentum changes"] },
    sliders: [],
    cuts: [
    { id: "sys", label: "Sys: tap to redraw the boundary", tap: (st, c) => { st.i = (st.i + 1) % 3; return st.i === 0 ? "Closed and isolated: momentum is conserved." : ""; } }],
    show: (st) => `system: ${st.N[st.i]}\n${st.X[st.i]}`,
    px: 20,
  });
  ctx.art.touchable(["sys"]);
  return { destroy() {} };
}
