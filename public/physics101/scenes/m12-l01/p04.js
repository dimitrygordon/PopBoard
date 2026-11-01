// Gas particles: Add gas particles to a sealed box at the same temperature and watch the pressure rise.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Particles", min: 10, max: 100, step: 10, value: 50, unit: "", d: 0 }],
    cuts: [
    { id: "gas", label: "Pressure reading: tap to explain", tap: (st, c) => { return "More particles, more collisions with the walls each second."; } }],
    show: (st) => `pressure = ${F(st.n * 2, 0)} kPa\nmore particles, more collisions, more pressure`,
  });
  ctx.art.touchable(["gas"]);
  return { destroy() {} };
}
