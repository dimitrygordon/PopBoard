// Io: Move Earth around its orbit and see how late Io's eclipse looks.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Earth's position", min: 0, max: 180, step: 5, value: 0, unit: "\\u00b0 from closest", d: 0 }],
    cuts: [
    { id: "orb", label: "Eclipse timing: tap to explain", tap: (st, c) => { return "Roemer: the delay is the extra time light takes to cross Earth's orbit."; } }],
    show: (st) => `extra distance: ${F(3e11 * (1 - Math.cos(st.a * Math.PI / 180)) / 2 / 1e9, 0)} million km\ndelay \u2248 ${F(1000 * (1 - Math.cos(st.a * Math.PI / 180)) / 2, 0)} s`,
  });
  ctx.art.touchable(["orb"]);
  return { destroy() {} };
}
