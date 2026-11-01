// Views: Tap to switch between pressure and displacement views of a closed pipe.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "view", label: "Nodes: tap to switch views", tap: (st, c) => { st.i = 1 - st.i; return "Adjacent nodes are \u03bb/2 apart."; } }],
    show: (st) => st.i ? "displacement: node at the closed end, antinode at the open end" : "pressure: antinode at the closed end, node at the open end",
  });
  ctx.art.touchable(["view"]);
  return { destroy() {} };
}
