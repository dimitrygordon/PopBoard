// Final velocity: v_f = v_i + a delta t. Sliders for v_i (0 to 30 m/s), a (-5.0 to 5.0 m/s^2) and delta t
// (0 to 10 s) drive the car and the speedometer needle (full scale 40 m/s).
import { svg, path, tween, caption, tapCut, RED, f2 } from "../kit.js";
const C = [1480, 230], R = 60, PXM = 1.6;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const needle = path(s, "", { stroke: RED, "stroke-width": 5 });
  const cap = caption(layer, [360, 440, 1240, 500], 26);
  let vi = 10, a = 2, T = 5;
  const vf = () => vi + a * T;
  const gauge = (v) => { const th = Math.PI * (1.25 - (Math.min(40, Math.abs(v)) / 40) * 1.5); needle.setAttribute("d", `M ${C[0]} ${C[1]} L ${C[0] + R * Math.cos(th)} ${C[1] - R * Math.sin(th)}`); };
  const show = () => { const v = vf(); cap.textContent = `v_f = ${f2(vi, 1)} m/s + (${f2(a, 1)} m/s\u00b2)(${f2(T, 1)} s) = ${f2(v, 1)} m/s${v < 0 ? "  (negative: the car would be reversing)" : ""}`; gauge(vi); };
  const run = async () => {
    show();
    await tween(2500, (u) => { const t = u * T, v = vi + a * t, x = vi * t + 0.5 * a * t * t; art.set("car", { dx: Math.max(-500, Math.min(700, x * PXM)) }); gauge(v); }, reduce);
    say(`Final velocity ${f2(vf(), 1)} meters per second: the initial velocity plus acceleration times the time interval.`, true);
  };
  ui.slider({ label: "v_i", min: 0, max: 30, step: 1, value: 10, fmt: (x) => x + " m/s" }, (x) => { vi = x; show(); });
  ui.slider({ label: "a", min: -5, max: 5, step: 0.5, value: 2, fmt: (x) => f2(x, 1) + " m/s\u00b2" }, (x) => { a = x; show(); });
  ui.slider({ label: "\u0394t", min: 0, max: 10, step: 0.5, value: 5, fmt: (x) => f2(x, 1) + " s" }, (x) => { T = x; show(); });
  ui.button("Drive", () => { art.touched("car"); art.set("car", { dx: 0 }); run(); });
  tapCut(ctx, "car", "Car: tap to drive", () => { art.set("car", { dx: 0 }); run(); });
  art.touchable(["car"]); show();
  return { destroy() {} };
}
