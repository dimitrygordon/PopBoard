// Bar 1.0 m, pivot-free. Forces as (F up, position m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, S: [[["10 N down at 0.5 m"], 10, 5], [["10 N down at 0.5 m", "10 N up at 0.0 m"], 0, 5], [["10 N down at 0.5 m", "5 N up at 0.0 m", "5 N up at 1.0 m"], 0, 0]] },
    sliders: [],
    cuts: [
    { id: "eq", label: "Eq: tap to change the forces", tap: (st, c) => { st.i = (st.i + 1) % 3; return st.i === 2 ? "Net force and net torque are both zero: equilibrium." : ""; } }],
    show: (st) => (() => { const s = st.S[st.i]; return `${s[0].join(", ")}\nnet force ${s[1]} N, net torque about the left end ${s[2]} N\u00b7m`; })(),
  });
  ctx.art.touchable(["eq"]);
  return { destroy() {} };
}
