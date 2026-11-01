// Area is displacement: Leo's axes carry no numbers, so the sandbox uses 5.0 s across and v = (2.0 m/s^2) t
// (the red line reaches 10 m/s at 5.0 s). Dragging the marker shades the triangle, and its area is delta x.
import { svg, path, handle, follow, caption, clamp, f2 } from "../kit.js";
const X = (t) => 430 + (t / 5) * 560, Y = (v) => 700 - (v / 10) * 520, T0 = 4;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const sh = path(s, "", { fill: "rgba(226,182,84,0.45)", stroke: "#E2B654", "stroke-width": 3 });
  const cap = caption(layer, [1060, 420, 1540, 560], 24);
  let t = T0, x0;
  const draw = (done) => {
    const v = 2 * t; sh.setAttribute("d", `M ${X(0)} ${Y(0)} H ${X(t)} V ${Y(v)} Z`);
    cap.textContent = `\u0394t = ${f2(t, 1)} s, v_f = ${f2(v, 1)} m/s\n\u0394x = \u00bd v_f \u0394t = \u00bd(${f2(v, 1)} m/s)(${f2(t, 1)} s) = ${f2(0.5 * v * t, 1)} m`;
    if (done) say(`The shaded triangle has an area of ${f2(0.5 * v * t, 1)} meters: that is the displacement.`, true);
  };
  const home = art.box("tmark");
  const h = handle(ctx, home, "Time marker: drag along the time axis", {
    start: () => { art.touched("tmark"); x0 = X(t); },
    move: (dx) => { t = clamp(Math.round(((x0 + dx - 430) / 560) * 5 * 10) / 10, 0.1, 5); art.set("tmark", { dx: X(t) - X(T0) }); draw(false); },
    end: () => { follow(h, home, X(t) - X(T0), 0); draw(true); },
  });
  art.touchable(["tmark"]); draw(false);
  return { destroy() {} };
}
