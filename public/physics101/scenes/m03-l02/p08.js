// Rectangle area: the airplane flies at a constant +75 m/s (Example Problem 3). Dragging the time marker
// shades the rectangle under the flat line; its area is the displacement, 75 m per second.
import { svg, path, handle, follow, caption, graphMap, clamp, f2 } from "../kit.js";
const g = graphMap(420, 140, 1000, 700, 3, 100), T0 = 2;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const s = svg(layer); const sh = path(s, "", { fill: "rgba(226,182,84,0.45)", stroke: "#E2B654", "stroke-width": 3 });
  const cap = caption(layer, [1040, 420, 1500, 520], 24);
  let t = T0, x0;
  const draw = (done) => {
    sh.setAttribute("d", `M ${g.fx(0)} ${g.fy(0)} H ${g.fx(t)} V ${g.fy(75)} H ${g.fx(0)} Z`);
    cap.textContent = `\u0394x = (+75 m/s)(${f2(t, 1)} s) = +${f2(75 * t, 1)} m`;
    if (done) say(`The rectangle's area is ${f2(75 * t, 0)} meters, the airplane's displacement in ${f2(t, 1)} seconds.`, true);
  };
  const home = art.box("tmark");
  const h = handle(ctx, home, "Time marker: drag along the time axis", {
    start: () => { art.touched("tmark"); x0 = g.fx(t); },
    move: (dx) => { t = clamp(Math.round(g.tx(x0 + dx) * 10) / 10, 0.1, 3); art.set("tmark", { dx: g.fx(t) - g.fx(T0) }); draw(false); },
    end: () => { follow(h, home, g.fx(t) - g.fx(T0), 0); draw(true); },
  });
  art.touchable(["tmark"]); draw(false);
  return { destroy() {} };
}
