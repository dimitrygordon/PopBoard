// Push the wall: push 0 to 300 N (1 px per N). The wall pushes back with the same size force, opposite direction.
import { svg, path, caption, tapCut, arrowD, BLUE, RED } from "../kit.js";
const X = 820, Y = 720;
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const s = svg(layer); const a1 = path(s, "", { stroke: BLUE, "stroke-width": 7 }), a2 = path(s, "", { stroke: RED, "stroke-width": 7 });
  const cap = caption(layer, [300, 780, 1000, 880], 22);
  let F = 150;
  const draw = (talk) => { a1.setAttribute("d", F ? arrowD(X, Y - 25, X + F, Y - 25, 14) : ""); a2.setAttribute("d", F ? arrowD(X, Y + 25, X - F, Y + 25, 14) : ""); cap.textContent = `F_you on wall = ${F} N (right)\nF_wall on you = ${F} N (left)`; if (talk) say(`You push with ${F} newtons; the wall pushes back with ${F} newtons.`, true); };
  const sl = ui.slider({ label: "How hard to push", min: 0, max: 300, step: 10, value: 150, fmt: (v) => v + " N" }, (v) => { F = v; draw(true); });
  tapCut(ctx, "push", "How hard to push: tap to add 50 N", () => { F = (F + 50) % 350; sl.set(F); draw(true); });
  ctx.art.touchable(["push"]); draw(false);
  return { destroy() {} };
}
