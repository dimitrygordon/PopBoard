// Stack the carts: the same 1.0 N pull on 1, 2 or 3 carts of 0.50 kg each. a = F / m, so the a-F slope is 1/m.
import { caption, tapCut, f2 } from "../kit.js";
const F = 1.0, MC = 0.5;
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [1000, 560, 1580, 760], 26);
  let n = 1;
  const show = (talk) => { const m = n * MC, a = F / m; cap.textContent = `${n} cart${n > 1 ? "s" : ""}, m = ${f2(m, 2)} kg\nslope = 1/m = ${f2(1 / m, 2)} per kg\na = ${f2(F, 1)} N / ${f2(m, 2)} kg = ${f2(a, 2)} m/s\u00b2`; if (talk) say(`${n} cart${n > 1 ? "s" : ""}: ${n === 1 ? "the full" : n === 2 ? "half the" : "a third of the"} acceleration, ${f2(a, 2)} meters per second squared.`, true); };
  tapCut(ctx, "stack", "Stack carts: tap for one, two or three carts", () => { n = (n % 3) + 1; show(true); });
  ctx.art.touchable(["stack"]); show(false);
  return { destroy() {} };
}
