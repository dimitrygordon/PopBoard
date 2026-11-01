// Virtual strobe: the ball drops from rest; a flash every chosen interval (0.03 to 0.12 s, book 0.06 s)
// leaves an image, and the gaps grow because the speed grows. 0.60 s of fall (1.76 m) fills the column.
import { svg, path, tween, caption, tapCut, NAVY, f2 } from "../kit.js";
const G = 9.8, T = 0.6, X = 1050, Y1 = 700, PXM = 570 / (0.5 * G * T * T);
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const ghosts = path(s, "", { stroke: NAVY, "stroke-width": 3, fill: "rgba(217,139,106,0.35)" });
  const cap = caption(layer, [1180, 560, 1570, 760], 22);
  let dt = 0.06;
  const drop = async () => {
    const ys = []; for (let t = 0; t <= T + 1e-9; t += dt) ys.push(0.5 * G * t * t);
    await tween(1800, (u) => {
      const t = u * T, y = 0.5 * G * t * t; art.set("ball", { dy: y * PXM - (Y1 - 130) });
      ghosts.setAttribute("d", ys.filter((v) => v <= y + 1e-9).map((v) => { const cy = 130 + v * PXM; return `M ${X - 26} ${cy} a 26 26 0 1 0 52 0 a 26 26 0 1 0 -52 0`; }).join(" "));
    }, reduce);
    const gaps = ys.slice(1).map((v, i) => (v - ys[i]) * 100);
    cap.textContent = `flash every ${f2(dt)} s\ngaps: ${gaps.slice(0, 5).map((g) => g.toFixed(1)).join(", ")}${gaps.length > 5 ? ", ..." : ""} cm`;
    say(`Equal times, but each gap is ${(G * dt * dt * 100).toFixed(1)} centimeters longer than the last: the ball keeps speeding up.`, true);
  };
  ui.slider({ label: "Flash interval", min: 0.03, max: 0.12, step: 0.01, value: 0.06, fmt: (x) => f2(x) + " s" }, (x) => (dt = x));
  ui.button("Drop", () => { art.touched("ball"); drop(); });
  tapCut(ctx, "ball", "Ball: tap to drop it", drop);
  art.touchable(["ball"]);
  return { destroy() {} };
}
