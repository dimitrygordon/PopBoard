// Ball drop timer: tap the clamp to release the ball. Each quarter second a distance point is plotted;
// then overlay the curve d = 5t squared.
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const X = (t) => 768 + 336 * t, Y = (d) => 702 - 28.8 * d;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer);
  const curve = path(s, "", { stroke: "#E2B654", "stroke-width": 6 });
  const pts = path(s, "", { fill: "#3B7DB8", stroke: "#1F2F5C", "stroke-width": 2 });
  const ball = path(s, "", { fill: "#B5893A", stroke: "#1F2F5C", "stroke-width": 3 });
  const c = art.box("ball"), bx = (c[0] + c[2]) / 2, by = c[3] + 10;
  const cap = fontPx(add(layer, "div", "cap", [860, 790, 1440, 850], ""), 26);
  const at = (y) => ball.setAttribute("d", `M ${bx - 22} ${y} a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0`);
  let busy = false;
  const drop = async () => {
    if (busy) return; busy = true; let d = "", last = -1;
    await tween(2000, (f) => {
      const t = 2 * f, dist = 5 * t * t; at(by + dist * 32);
      const k = Math.floor(t * 4 + 1e-9); if (k > last) { last = k; const tk = k / 4, dk = 5 * tk * tk; d += `M ${X(tk) - 8} ${Y(dk)} a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0 `; pts.setAttribute("d", d); cap.textContent = `t = ${tk.toFixed(2)} s, d = ${dk.toFixed(2)} m`; }
    }, reduce);
    busy = false; say("Nine points, and they curve upward: distance grows with the square of time.");
  };
  handle(ctx, c, "Clamp: tap to drop the ball", {}).addEventListener("click", () => { art.touched("ball"); drop(); });
  ui.button("Drop the ball", drop);
  ui.button("Overlay d = 5t\u00b2", () => {
    curve.setAttribute("d", "M " + Array.from({ length: 41 }, (_, i) => { const t = i / 20; return `${X(t)} ${Y(5 * t * t)}`; }).join(" L "));
    say("The curve d = 5t\u00b2 passes through every point: a quadratic relationship.", true);
  });
  ui.button("Start over", () => { pts.setAttribute("d", ""); curve.setAttribute("d", ""); at(by); cap.textContent = ""; say(""); });
  art.touchable(["ball"]);
  at(by);
  return { destroy() {} };
}
