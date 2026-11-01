// Photometer: Move the screen between a 64 cd bulb and a 1 cd candle 1.8 m apart until both sides match.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Distance from candle", min: 0.1, max: 1.7, step: 0.01, value: 0.6, unit: "m", d: 2 }],
    cuts: [
    { id: "move", label: "Equal brightness: tap to check", tap: (st, c) => { return Math.abs(st.x - 0.2) < 0.02 ? "Matched: 64/1.6\u00b2 = 1/0.2\u00b2." : "Not yet matched."; } }],
    show: (st) => `candle side: ${F(1 / st.x ** 2, 1)} lx, bulb side: ${F(64 / (1.8 - st.x) ** 2, 1)} lx`,
  });
  ctx.art.touchable(["move"]);
  return { destroy() {} };
}
