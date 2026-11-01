// Example Problem 5: C 1325 kg north 27.0, D 2165 kg east 11.0: 12.3 m/s at 56.4 deg north of east.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "c", label: "Car C (north)", min: 5, max: 35, step: 0.5, value: 27, unit: "m/s", d: 1 }, { key: "d", label: "Car D (east)", min: 5, max: 35, step: 0.5, value: 11, unit: "m/s", d: 1 }],
    cuts: [
    { id: "ex5", label: "Ex5: tap for the book's values", tap: (st, c) => { st.c = 27; st.d = 11; c.c.set(27); c.d.set(11); return "12.3 m/s at 56.4\u00b0 north of east."; } }],
    show: (st) => (() => { const py = 1325 * st.c, px = 2165 * st.d; return `p = ${E(Math.hypot(px, py))} kg\u00b7m/s at ${F(Math.atan2(py, px) * 180 / Math.PI, 1)}\u00b0 N of E\nv_f = ${F(Math.hypot(px, py) / 3490, 1)} m/s`; })(),
  });
  ctx.art.touchable(["ex5"]);
  return { destroy() {} };
}
