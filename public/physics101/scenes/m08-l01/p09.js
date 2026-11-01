// Hard drive: Set the drive's speed in RPM and read it in rev/s and rad/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Speed", min: 3600, max: 15000, step: 600, value: 7200, unit: "rpm", d: 0 }],
    cuts: [
    { id: "rpm", label: "Rpm: tap for a common drive speed", tap: (st, c) => { st.n = st.n === 7200 ? 5400 : 7200; c.n.set(st.n); return ""; } }],
    show: (st) => `${st.n} rpm = ${F(st.n / 60, 0)} rev/s = ${F(st.n / 60 * 2 * Math.PI, 0)} rad/s`,
  });
  ctx.art.touchable(["rpm"]);
  return { destroy() {} };
}
