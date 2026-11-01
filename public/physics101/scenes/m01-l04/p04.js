// Line of best fit: drag the line up or down and tilt it; the closeness score rises as the line
// gets nearer to all of the spring data points.
import { add, handle, fontPx } from "../kit.js";
const M = [0, 5, 10, 15, 20, 25, 30, 35], L = [13.7, 14.1, 14.5, 14.9, 15.3, 15.7, 16.0, 16.4];
const X = (m) => 192 + m * 768 / 35, Y = (l) => 720 - 144 * (l - 13);
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const b = art.box("best-fit-line"), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const a0 = Math.atan2(Y(13.7 + 0.076 * 35) - Y(13.7), X(35) - X(0));
  const cap = fontPx(add(layer, "div", "cap", [1060, 120, 1560, 190], ""), 30);
  let dx = 0, dy = 0, rot = 0;
  const score = () => {
    const a = a0 + rot * Math.PI / 180, px = cx + dx, py = cy + dy, s = Math.tan(a);
    const rms = Math.sqrt(M.reduce((t, m, i) => { const yl = py + s * (X(m) - px); return t + ((Y(L[i]) - yl) / 144) ** 2; }, 0) / M.length);
    const sc = Math.max(0, Math.round(100 - rms * 150)); cap.textContent = `Closeness: ${sc} / 100`; return sc;
  };
  const apply = () => { art.set("best-fit-line", { dx, dy, rot }); return score(); };
  let d0 = [0, 0];
  const h = handle(ctx, b, "Best-fit line: drag to move it", {
    start: () => { art.touched("best-fit-line"); d0 = [dx, dy]; },
    move: (x, y) => { dx = d0[0] + x; dy = d0[1] + y; apply(); },
    end: () => { h.style.left = ((b[0] + dx) / 16) + "%"; h.style.top = ((b[1] + dy) / 9) + "%"; const s = apply(); say(s >= 95 ? "Excellent: about as close to every point as a straight line can get." : "Keep adjusting: aim for as many points above the line as below it.", s >= 95); },
  });
  const t = ui.slider({ label: "Tilt", min: -20, max: 20, step: 1, value: 0, fmt: (v) => v + "\u00b0" }, (v) => { rot = v; apply(); });
  ui.button("Scramble the line", () => { dx = 0; dy = -120; rot = 12; t.set(rot); h.style.left = ((b[0]) / 16) + "%"; h.style.top = ((b[1] + dy) / 9) + "%"; apply(); say("Now drag and tilt it back to fit the data."); });
  art.touchable(["best-fit-line"]);
  apply();
  return { destroy() {} };
}
