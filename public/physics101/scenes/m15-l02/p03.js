// Wavelets: Place more wavelet sources along the wavefront.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Sources", min: 2, max: 20, step: 1, value: 5, unit: "", d: 0 }],
    cuts: [
    { id: "wl", label: "New wavefront: tap to explain", tap: (st, c) => { return "The line touching all the wavelets is the new wavefront."; } }],
    show: (st) => `${st.n} wavelets: ${st.n >= 10 ? "smooth new wavefront" : "bumpy new wavefront"}`,
  });
  ctx.art.touchable(["wl"]);
  return { destroy() {} };
}
