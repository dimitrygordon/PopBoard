// Scale on other worlds: a 60 kg student. g = 9.8 (Earth), 1.6 (Moon), 3.7 (Mars) N/kg; the scale reads mg.
import { caption, tapCut, f2 } from "../kit.js";
const W = [["Earth", 9.8], ["the Moon", 1.6], ["Mars", 3.7]], M = 60;
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [880, 780, 1580, 880], 24);
  const show = (i, talk) => { const [n, g] = W[i]; cap.textContent = `on ${n}: g = ${f2(g, 1)} N/kg\nscale reads ${f2(M * g, 0)} N (mass still ${M} kg)`; if (talk) say(`On ${n} the scale reads ${f2(M * g, 0)} newtons. Your mass is the same; your weight is not.`, true); };
  ["w0", "w1", "w2"].forEach((id, i) => tapCut(ctx, id, `World: ${W[i][0]}`, () => show(i, true)));
  ctx.art.touchable(["w0", "w1", "w2"]); show(0, false);
  return { destroy() {} };
}
