// Wind sprint: run toward the wall (positive), turn, and run back at the same speed. The sandbox computes
// a-bar = (v_f - v_i) / delta t. Speed 1 to 8 m/s and turnaround time 2 to 20 s (book: 4.0 m/s, 10.0 s).
import { tween, caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const cap = caption(layer, [380, 300, 1220, 420], 28);
  let v = 4, T = 10;
  const show = () => { const a = (-v - v) / T; cap.textContent = `v_i = +${f2(v, 1)} m/s   v_f = \u2212${f2(v, 1)} m/s   \u0394t = ${f2(T, 1)} s\na\u0304 = (\u2212${f2(v, 1)} m/s \u2212 ${f2(v, 1)} m/s) / ${f2(T, 1)} s = ${f2(a)} m/s\u00b2`; return a; };
  const run = async () => {
    const a = show();
    await tween(1100, (u) => art.set("runner", { dx: 340 * u, scale: 1 }), reduce);
    art.set("runner", { dx: 340, scale: "-1, 1" });
    await tween(1600, (u) => art.set("runner", { dx: 340 - 700 * u, scale: "-1, 1" }), reduce);
    say(`Same speed, opposite direction. The average acceleration is ${f2(a)} meters per second squared, pointing away from the wall.`, true);
  };
  ui.slider({ label: "Running speed", min: 1, max: 8, step: 0.5, value: 4, fmt: (x) => f2(x, 1) + " m/s" }, (x) => { v = x; show(); });
  ui.slider({ label: "Turnaround time", min: 2, max: 20, step: 0.5, value: 10, fmt: (x) => f2(x, 1) + " s" }, (x) => { T = x; show(); });
  ui.button("Run", () => { art.touched("runner"); run(); });
  ui.button("Reset", () => art.set("runner", { dx: 0, scale: 1 }));
  tapCut(ctx, "runner", "Runner: tap to sprint to the wall and back", run);
  art.touchable(["runner"]); show();
  return { destroy() {} };
}
