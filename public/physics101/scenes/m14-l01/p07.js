// Decibels: Turn up the intensity by factors of ten.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Factors of ten above hearing threshold", min: 0, max: 12, step: 1, value: 6, unit: "", d: 0 }],
    cuts: [
    { id: "db", label: "dB meter: tap to explain", tap: (st, c) => { return "Each factor of 10 in intensity adds 10 dB."; } }],
    show: (st) => `${st.n * 10} dB` + (st.n >= 9 ? "\nlong exposure can damage hearing" : ""),
  });
  ctx.art.touchable(["db"]);
  return { destroy() {} };
}
