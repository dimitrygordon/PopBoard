// Linked views: drag the runner along the motion diagram; she snaps to the nearest dot and the
// matching table row and graph point light up. Same motion, three representations.
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const f = (m) => 330 + 30 * m, gx = (t) => 700 + t * 590 / 6, gy = (p) => 470 - p * 360 / 30, HOME = 10;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const row = path(s, "", { fill: "rgba(226,182,84,0.35)", stroke: "#E2B654", "stroke-width": 4 }), pt = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 3 }), dg = path(s, "", { fill: "none", stroke: "#E2B654", "stroke-width": 5 });
  const cap = fontPx(add(layer, "div", "cap", [1000, 560, 1560, 620], ""), 28);
  let m = HOME;
  const light = () => {
    const i = m / 5;
    row.setAttribute("d", `M 156 ${110 + 46 * (i + 1)} h 288 v 46 h -288 Z`);
    pt.setAttribute("d", `M ${gx(i) - 14} ${gy(m)} a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0`);
    dg.setAttribute("d", `M ${f(m) - 18} 720 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0`);
    cap.textContent = `t = ${i.toFixed(1)} s, x = ${m.toFixed(1)} m`;
  };
  const home = art.box("runner"); let m0 = 0;
  const h = handle(ctx, home, "Runner on the motion diagram: drag left or right", {
    start: () => { art.touched("runner"); m0 = m; },
    move: (dx) => { m = clamp(Math.round((m0 + dx / 30) / 5) * 5, 0, 25); art.set("runner", { dx: f(m) - f(HOME) }); light(); },
    end: () => { follow(h, home, f(m) - f(HOME)); say("The dot, the table row and the graph point all say the same thing: where she was and when.", true); },
  });
  art.touchable(["runner"]);
  light();
  return { destroy() {} };
}
