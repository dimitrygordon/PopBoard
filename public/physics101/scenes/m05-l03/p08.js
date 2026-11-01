// Example Problem 6: slope 0 to 60 degrees (27), mass 20 to 100 kg (45), mu_k 0 to 0.8 (0.23). a = g(sin phi - mu_k cos phi); speed after 1.0 s. Mass cancels.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Slope", min: 0, max: 60, step: 1, value: 27, unit: "\u00b0", d: 0 }, { key: "m", label: "Mass", min: 20, max: 100, step: 1, value: 45, unit: "kg", d: 0 }, { key: "u", label: "mu_k", min: 0, max: 0.8, step: 0.01, value: 0.23, unit: "", d: 2 }],
    cuts: [
    { id: "slide", label: "Slide: tap for the worked example", tap: (st, c) => { st.p = 27; st.m = 45; st.u = 0.23; c.p.set(27); c.m.set(45); c.u.set(0.23); return "2.4 meters per second after one second."; } }],
    show: (st) => { const a = 9.8 * (Math.sin(deg(st.p)) - st.u * Math.cos(deg(st.p))); return a > 0 ? `a = ${f2(a, 2)} m/s\u00b2\nv after 1.0 s = ${f2(a, 1)} m/s (any mass)` : "friction wins: no sliding from rest"; },
  });
  ctx.art.touchable(["slide"]);
  return { destroy() {} };
}
