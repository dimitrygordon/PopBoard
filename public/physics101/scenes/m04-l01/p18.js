// Pillow tug-of-war: Anudja pulls in +x, Sarah in -x (each 0 to 20 N), pillow mass 0.10 to 1.0 kg.
// Defaults are the example: 11.0 N, 10.0 N and 0.30 kg give 3.3 m/s^2 toward Anudja.
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [1000, 760, 1580, 880], 24);
  let A = 11, S = 10, m = 0.3;
  const show = () => { const n = A - S, a = n / m; cap.textContent = `F_net = ${f2(A, 1)} N \u2212 ${f2(S, 1)} N = ${f2(n, 1)} N\na = ${f2(n, 1)} N / ${f2(m, 2)} kg = ${f2(a, 1)} m/s\u00b2`; return a; };
  ui.slider({ label: "Anudja", min: 0, max: 20, step: 0.5, value: 11, fmt: (v) => f2(v, 1) + " N" }, (v) => { A = v; show(); });
  ui.slider({ label: "Sarah", min: 0, max: 20, step: 0.5, value: 10, fmt: (v) => f2(v, 1) + " N" }, (v) => { S = v; show(); });
  ui.slider({ label: "Pillow mass", min: 0.1, max: 1, step: 0.05, value: 0.3, fmt: (v) => f2(v, 2) + " kg" }, (v) => { m = v; show(); });
  tapCut(ctx, "pillow", "Pull the pillow", () => { const a = show(); say(a === 0 ? "Equal pulls: the pillow does not accelerate." : `The pillow accelerates at ${f2(Math.abs(a), 1)} meters per second squared toward ${a > 0 ? "Anudja" : "Sarah"}.`, true); });
  ctx.art.touchable(["pillow"]); show();
  return { destroy() {} };
}
