// Weight grows with mass: each tap picks the next mass (0.50, 1.0, 2.0, 4.0 kg); F_g = mg with g = 9.8 N/kg,
// drawn as a red arrow at 6 px per N.
import { svg, path, caption, tapCut, arrowD, RED, f2 } from "../kit.js";
const MS = [0.5, 1, 2, 4], X = 1450, Y = 440, PX = 6;
export default function build(ctx) {
  const { say, layer } = ctx;
  const s = svg(layer); const ar = path(s, "", { stroke: RED, "stroke-width": 8 });
  const cap = caption(layer, [880, 760, 1400, 880], 24);
  let i = 1;
  const show = (talk) => { const m = MS[i], F = m * 9.8; ar.setAttribute("d", arrowD(X, Y, X, Y + F * PX, 16)); cap.textContent = `m = ${f2(m, 2)} kg\nF_g = mg = ${f2(m, 2)} kg \u00d7 9.8 N/kg = ${f2(F, 1)} N`; if (talk) say(`${f2(m, 1)} kilograms weighs ${f2(F, 1)} newtons. Double the mass, double the weight.`, true); };
  tapCut(ctx, "mass", "Mass picker: tap for the next mass", () => { i = (i + 1) % MS.length; show(true); });
  ctx.art.touchable(["mass"]); show(false);
  return { destroy() {} };
}
