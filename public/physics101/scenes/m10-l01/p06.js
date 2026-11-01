// Two pushes: Set both pushes on a box that moves 3.0 m to the right.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Push 1 (right)", min: 0, max: 60, step: 5, value: 30, unit: "N", d: 0 }, { key: "b", label: "Push 2 (left)", min: 0, max: 60, step: 5, value: 10, unit: "N", d: 0 }],
    cuts: [
    { id: "two", label: "Two: tap to swap the pushes", tap: (st, c) => { [st.a, st.b] = [st.b, st.a]; c.a.set(st.a); c.b.set(st.b); return ""; } }],
    show: (st) => `W\u2081 = +${st.a * 3} J, W\u2082 = \u2212${st.b * 3} J\nnet work = ${st.a * 3 - st.b * 3} J`,
  });
  ctx.art.touchable(["two"]);
  return { destroy() {} };
}
