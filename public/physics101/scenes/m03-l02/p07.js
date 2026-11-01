// Change only v_i: a = 2.0 m/s^2 and t = 3.0 s stay fixed (x_i = 0). Each autofill row adds the chosen v_i
// and x_f = v_i t + 1/2 a t^2, so x_f grows by 3.0 m for every 1 m/s of v_i: a linear pattern.
import { add, fontPx, caption, tapCut, f2 } from "../kit.js";
const A = 2, T = 3, COLS = [590, 735, 880, 1025];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = caption(layer, [1120, 300, 1560, 420], 22, "a = 2.0 m/s\u00b2, t = 3.0 s, x_i = 0\nSet v_i, then tap the autofill row.");
  let vi = 0; const rows = [];
  const addRow = () => {
    art.touched("autofill"); if (rows.length >= 5) { rows.shift().forEach((e) => e.remove()); rows.forEach((r, i) => r.forEach((e) => (e.style.top = ((362 + i * 55) / 900) * 100 + "%"))); }
    const y = 362 + rows.length * 55, xf = vi * T + 0.5 * A * T * T;
    rows.push([f2(A, 1), f2(T, 1), f2(vi, 1), f2(xf, 1)].map((v, i) => { const e = fontPx(add(layer, "div", "cap", [COLS[i] - 65, y, COLS[i] + 65, y + 50], v), 24); e.style.textAlign = "center"; return e; }));
    say(rows.length > 1 ? "Each extra meter per second of v i adds the same 3.0 meters to x f: a straight-line pattern." : `x f = ${f2(xf, 1)} meters.`, true);
  };
  ui.slider({ label: "v_i", min: 0, max: 10, step: 1, value: 0, fmt: (x) => x + " m/s" }, (x) => (vi = x));
  ui.button("Add row", addRow);
  tapCut(ctx, "autofill", "Autofill row: tap to add a row", addRow);
  art.touchable(["autofill"]);
  return { destroy() {} };
}
