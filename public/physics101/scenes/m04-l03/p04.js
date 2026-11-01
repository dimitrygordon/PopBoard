// Match the pairs: each tap shows the next force and its interaction partner (same two objects, swapped
// subscripts). Gravity on the ball and the table's push are NOT a pair: both act on the ball.
import { caption, tapCut } from "../kit.js";
const P = [["F_table on ball", "F_ball on table", "a pair: same two objects, subscripts swapped"], ["F_Earth on ball (F_g)", "F_ball on Earth", "a pair: Earth and ball"], ["F_table on ball", "F_g", "not a pair: both act on the ball"]];
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [280, 800, 1000, 890], 22, "Tap the chip to connect two forces.");
  let i = -1;
  tapCut(ctx, "match", "Match: tap to connect the next two forces", () => { i = (i + 1) % P.length; const [a, b, c] = P[i]; cap.textContent = `${a} \u2194 ${b}\n${c}`; say(`${a.replace(/_/g, " ")} and ${b.replace(/_/g, " ")}: ${c}.`, true); });
  ctx.art.touchable(["match"]);
  return { destroy() {} };
}
