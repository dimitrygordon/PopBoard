// A 50 kg student on a scale (sandbox). At 400 km, gravity is still 8.7 m/s^2, but in free fall the scale reads zero.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, L: ["at rest on the ground", "at rest, 400 km up (on a tower)", "in orbit: free fall"], R: [490, 435, 0] },
    sliders: [],
    cuts: [
    { id: "ride", label: "Ride: tap for the next stage", tap: (st, c) => { st.s = (st.s + 1) % 3; return st.s === 2 ? "You and the scale fall together, so it reads zero. Gravity has not switched off." : ""; } }],
    show: (st) => `${st.L[st.s]}\nscale reads ${st.R[st.s]} N`,
  });
  ctx.art.touchable(["ride"]);
  return { destroy() {} };
}
