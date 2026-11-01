// Rope toy: drag the chip left to pull harder (0 to 60 N, 4 px per N). The boy's pull on the dog and the dog's
// pull on the boy are an interaction pair: always equal in size, opposite in direction.
import { svg, path, handle, caption, arrowD, clamp, BLUE, RED, f2 } from "../kit.js";
const X = 640, Y = 230, PX = 4;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const a1 = path(s, "", { stroke: BLUE, "stroke-width": 7 }), a2 = path(s, "", { stroke: RED, "stroke-width": 7 });
  const cap = caption(layer, [1000, 780, 1580, 830], 22);
  let F = 20, F0;
  const draw = () => { a1.setAttribute("d", F ? arrowD(X + 10, Y, X + 10 + F * PX, Y, 14) : ""); a2.setAttribute("d", F ? arrowD(X - 10, Y + 40, X - 10 - F * PX, Y + 40, 14) : ""); cap.textContent = `F_boy on dog = F_dog on boy = ${f2(F, 0)} N`; };
  handle(ctx, art.box("toy"), "Rope toy: drag left to pull harder", { start: () => { art.touched("toy"); F0 = F; }, move: (dx) => { F = clamp(Math.round(F0 - dx / 6), 0, 60); draw(); }, end: () => say(`${F} newtons each way. Pull harder and both forces grow together.`, true) });
  art.touchable(["toy"]); draw();
  return { destroy() {} };
}
