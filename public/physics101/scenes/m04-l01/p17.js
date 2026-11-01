// Sled team: set a dog's pull (10 to 80 N) and direction (-30 to 30 degrees from straight ahead, + is toward the
// top of the page), then add it. Arrows are drawn tip to tail at 2 px per N (half the page's 4 px per N so up to
// four dogs fit), and the net force is their vector sum. Sandbox sled plus rider mass: 40 kg.
import { svg, path, caption, tapCut, arrowD, BLUE, RED, f2 } from "../kit.js";
const O = [1000, 820], PX = 2, M = 40;
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const s = svg(layer); const dogs = path(s, "", { stroke: BLUE, "stroke-width": 5 }), net = path(s, "", { stroke: RED, "stroke-width": 7 });
  const cap = caption(layer, [1060, 480, 1580, 580], 22, "Add a dog.");
  let F = 40, ang = 0, list = [];
  const draw = () => {
    let x = O[0], y = O[1], d = ""; list.forEach(([f, a]) => { const r = (a * Math.PI) / 180, nx = x - f * PX * Math.cos(r), ny = y - f * PX * Math.sin(r); d += arrowD(x, y, nx, ny, 12) + " "; x = nx; y = ny; });
    dogs.setAttribute("d", d); net.setAttribute("d", list.length > 1 ? arrowD(O[0], O[1], x, y, 16) : "");
    const fx = (O[0] - x) / PX, fy = (O[1] - y) / PX, Fn = Math.hypot(fx, fy), th = (Math.atan2(fy, fx) * 180) / Math.PI;
    cap.textContent = list.length ? `${list.length} dog${list.length > 1 ? "s" : ""}: F_net = ${f2(Fn, 1)} N at ${f2(th, 0)}\u00b0\na = ${f2(Fn / M, 2)} m/s\u00b2` : "Add a dog.";
    return [Fn, th];
  };
  ui.slider({ label: "Dog's pull", min: 10, max: 80, step: 5, value: 40, fmt: (v) => v + " N" }, (v) => (F = v));
  ui.slider({ label: "Direction", min: -30, max: 30, step: 5, value: 0, fmt: (v) => v + "\u00b0" }, (v) => (ang = v));
  ui.button("Clear dogs", () => { list = []; draw(); });
  tapCut(ctx, "dog", "Add a dog", () => {
    if (list.length >= 4) list = []; list.push([F, ang]); const [Fn] = draw();
    say(`Net force ${f2(Fn, 0)} newtons, so the sled accelerates at ${f2(Fn / M, 2)} meters per second squared.${list.length > 1 && list.some((d) => d[1]) ? " Angled pulls add less than their sizes." : ""}`, true);
  });
  ctx.art.touchable(["dog"]); draw();
  return { destroy() {} };
}
