// IMA = rear gear radius / wheel radius times pedal arm / front gear (sandbox: front 10 cm, crank 17 cm, wheel 35.6 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { g: 0, R: [2, 3, 4, 5] },
    sliders: [],
    cuts: [
    { id: "gear", label: "Gear: tap to shift", tap: (st, c) => { st.g = (st.g + 1) % 4; return st.g === 3 ? "Lowest gear: easy pedaling uphill, but you pedal more." : ""; } }],
    show: (st) => `rear gear ${st.R[st.g]} cm: IMA = ${F((17 / 10) * (st.R[st.g] / 35.6), 2)}\npedal turns per wheel turn = ${F(st.R[st.g] / 10, 2)}`,
  });
  ctx.art.touchable(["gear"]);
  return { destroy() {} };
}
