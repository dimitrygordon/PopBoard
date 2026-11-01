// theta in radians = degrees x pi / 180; one revolution = 2 pi rad.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle", min: 0, max: 720, step: 15, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "dvd", label: "Dvd: tap to turn an eighth of a turn", tap: (st, c) => { st.a = (st.a + 45) % 765; c.a.set(st.a); return ""; } }],
    show: (st) => `${st.a}\u00b0 = ${F(st.a * Math.PI / 180, 2)} rad = ${F(st.a / 360, 3)} rev`,
  });
  ctx.art.touchable(["dvd"]);
  return { destroy() {} };
}
