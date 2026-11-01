// When does B pass A? Drag the point along line B; when it meets line A the sandbox reports the
// book's answer: 45 s after A passed the origin, about 190 m beyond it.
import { add, handle, fontPx, follow, clamp } from "../kit.js";
const fx = (t) => 470 + t * 710 / 55, fy = (p) => 690 - (p + 100) * 560 / 300, B = (t) => -50 + 240 / 45 * t, A = (t) => 190 / 45 * t, T0 = 15;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [1190, 300, 1590, 420], ""), 26); cap.style.whiteSpace = "pre-line";
  let t = T0;
  const show = () => { cap.textContent = `t = ${t.toFixed(0)} s\nB at ${B(t).toFixed(0)} m, A at ${A(t).toFixed(0)} m`; };
  const home = art.box("pointB"); let t0 = 0;
  const h = handle(ctx, home, "Point on line B: drag right or left along the line", {
    start: () => { art.touched("pointB"); t0 = t; },
    move: (dx) => { t = clamp(Math.round(t0 + dx * 55 / 710), 0, 50); art.set("pointB", { dx: fx(t) - fx(T0), dy: fy(B(t)) - fy(B(T0)) }); show(); },
    end: () => {
      follow(h, home, fx(t) - fx(T0), fy(B(t)) - fy(B(T0)));
      const gap = B(t) - A(t);
      say(Math.abs(gap) < 3 ? "They meet: B passes A 45 s after A passed the origin, about 190 m beyond it." : gap < 0 ? `B is still ${(-gap).toFixed(0)} m behind A. Keep going.` : `B is already ${gap.toFixed(0)} m ahead. Go back.`, Math.abs(gap) < 3);
    },
  });
  art.touchable(["pointB"]);
  show();
  return { destroy() {} };
}
