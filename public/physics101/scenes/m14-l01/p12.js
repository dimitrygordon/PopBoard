// Bat: Tap to fly the bat toward or away from a still moth (bat chirp 40.0 kHz, bat speed 5.0 m/s).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "bat", label: "Echo frequency: tap to switch direction", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `away: echo ${F(40 * (343 - 5) / (343 + 5), 1)} kHz (lower)` : `toward: echo ${F(40 * (343 + 5) / (343 - 5), 1)} kHz (higher)`,
  });
  ctx.art.touchable(["bat"]);
  return { destroy() {} };
}
