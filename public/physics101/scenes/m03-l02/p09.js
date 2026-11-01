// Rectangle plus triangle: Leo's axes carry no numbers, so the sandbox uses 5.0 s across and 20 m/s up.
// Sliders set v_i (0 to 10 m/s) and a (0 to 3.0 m/s^2); the gold line and shading follow them.
import { svg, path, handle, follow, caption, clamp, f2 } from "../kit.js";
const X = (t) => 430 + (t / 5) * 560, Y = (v) => 700 - (v / 20) * 520, T0 = 4.25;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer);
  const rect = path(s, "", { fill: "rgba(143,179,217,0.55)" }), tri = path(s, "", { fill: "rgba(140,197,120,0.55)" }), ln = path(s, "", { stroke: "#E2B654", "stroke-width": 6 });
  const cap = caption(layer, [1060, 360, 1560, 520], 22);
  let vi = 7, a = 2.6, t = T0, x0;
  const draw = (done) => {
    const vf = vi + a * t, r = vi * t, tr = 0.5 * a * t * t, vtop = Math.min(20, vi + a * 5);
    rect.setAttribute("d", `M ${X(0)} ${Y(0)} H ${X(t)} V ${Y(vi)} H ${X(0)} Z`); tri.setAttribute("d", `M ${X(0)} ${Y(vi)} H ${X(t)} V ${Y(Math.min(20, vf))} Z`);
    ln.setAttribute("d", `M ${X(0)} ${Y(vi)} L ${X(vi + a * 5 > 20 ? (20 - vi) / a : 5)} ${Y(vtop)}`);
    cap.textContent = `rectangle v_i\u0394t = (${f2(vi, 1)})(${f2(t, 2)}) = ${f2(r, 1)} m\ntriangle \u00bd a\u0394t\u00b2 = \u00bd(${f2(a, 1)})(${f2(t, 2)})\u00b2 = ${f2(tr, 1)} m\n\u0394x = ${f2(r + tr, 1)} m`;
    if (done) say(`The rectangle plus the triangle: ${f2(r + tr, 1)} meters of displacement.`, true);
  };
  const home = art.box("tmark");
  const h = handle(ctx, home, "Time marker: drag along the time axis", {
    start: () => { art.touched("tmark"); x0 = X(t); },
    move: (dx) => { t = clamp(Math.round(((x0 + dx - 430) / 560) * 5 * 20) / 20, 0.05, 5); art.set("tmark", { dx: X(t) - X(T0) }); draw(false); },
    end: () => { follow(h, home, X(t) - X(T0), 0); draw(true); },
  });
  ui.slider({ label: "v_i", min: 0, max: 10, step: 0.5, value: 7, fmt: (x) => f2(x, 1) + " m/s" }, (x) => { vi = x; draw(false); });
  ui.slider({ label: "a", min: 0, max: 3, step: 0.1, value: 2.6, fmt: (x) => f2(x, 1) + " m/s\u00b2" }, (x) => { a = x; draw(false); });
  art.touchable(["tmark"]); draw(false);
  return { destroy() {} };
}
