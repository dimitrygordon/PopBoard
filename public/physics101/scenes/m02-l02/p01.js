// Where is zero? Drag the tape's zero point along the road and tap it to flip the positive direction;
// the runner's, the cactus's and the lamppost's positions all update.
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const f = (m) => 200 + 45 * m, RUNNER = 10, CACTUS = 6, LAMP = 25; // Leo's road: 45 px per meter
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const dir = path(s, "", { stroke: "#E2B654", "stroke-width": 6 });
  const cap = fontPx(add(layer, "div", "cap", [700, 260, 1560, 420], ""), 28); cap.style.whiteSpace = "pre-line";
  let z = 0, sign = 1;
  const rd = (m) => { const v = sign * (m - z); return (v < 0 ? "\u2212" : v > 0 ? "+" : "") + Math.abs(v) + " m"; };
  const draw = () => {
    const x = f(z); dir.setAttribute("d", `M ${x} 860 h ${sign * 120} m ${-sign * 20} -14 l ${sign * 20} 14 l ${-sign * 20} 14`);
    cap.textContent = `zero at ${z} m on the tape, positive to the ${sign > 0 ? "right" : "left"}\nrunner: ${rd(RUNNER)}\ncactus: ${rd(CACTUS)}   lamppost: ${rd(LAMP)}`;
  };
  const home = art.box("tape-zero"); let z0 = 0, moved = false;
  const h = handle(ctx, home, "Zero point: drag along the road, tap to flip the positive direction", {
    start: () => { art.touched("tape-zero"); z0 = z; moved = false; },
    move: (dx) => { if (Math.abs(dx) > 8) moved = true; z = clamp(Math.round(z0 + dx / 45), 0, 30); art.set("tape-zero", { dx: f(z) - f(0) }); draw(); },
    end: () => { follow(h, home, f(z) - f(0)); if (!moved) sign = -sign; draw(); say("Same runner, same place, different numbers: a position only means something once you choose where zero is and which way is positive.", true); },
  });
  ui.button("Flip the positive direction", () => { sign = -sign; draw(); });
  ui.button("Zero back at the start", () => { z = 0; sign = 1; art.set("tape-zero", { dx: 0 }); follow(h, home); draw(); say(""); });
  art.touchable(["tape-zero"]);
  draw();
  return { destroy() {} };
}
