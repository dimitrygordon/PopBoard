// Sign of the slope: pick +5.0 or -5.0 m/s and a start position, press Go, and the car moves on the
// number line while its position-time line draws, tilting up for positive and down for negative.
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const fx = (t) => 420 + t * 640 / 5.5, fy = (p) => 720 - (p + 15) * 550 / 35, nl = (m) => 420 + (m + 15) * 640 / 35;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const ln = path(s, "", { stroke: "#E2B654", "stroke-width": 7 });
  const cap = fontPx(add(layer, "div", "cap", [1100, 200, 1590, 330], ""), 26); cap.style.whiteSpace = "pre-line";
  let v = -5, x0 = 20;
  const pos = (t) => x0 + v * t;
  const tEnd = () => Math.min(5.4, v > 0 ? (20 - x0) / v : (x0 + 15) / -v);
  const go = async () => {
    art.touched("object"); const T = tEnd();
    await tween(2500, (k) => { const t = k * T; ln.setAttribute("d", `M ${fx(0)} ${fy(x0)} L ${fx(t)} ${fy(pos(t))}`); art.set("object", { dx: nl(pos(t)) - nl(20) }); }, reduce);
    const t0 = -x0 / v;
    cap.textContent = `v = ${v > 0 ? "+" : "\u2212"}5.0 m/s, start ${x0} m\nslope = ${v > 0 ? "+" : "\u2212"}5.0 m/s` + (t0 > 0 && t0 <= T ? `\npasses the origin at ${t0.toFixed(1)} s` : "");
    say(v > 0 ? "Upward slope: the object moves in the positive direction." : "Downward slope: the object moves in the negative direction. The slope's sign is the velocity's direction.", true);
  };
  ui.slider({ label: "Velocity", min: -5, max: 5, step: 10, value: -5, fmt: (x) => (x > 0 ? "+" : "\u2212") + "5.0 m/s" }, (x) => (v = x));
  ui.slider({ label: "Start position", min: -15, max: 20, step: 5, value: 20, fmt: (x) => x + " m" }, (x) => { x0 = x; art.set("object", { dx: nl(x0) - nl(20) }); ln.setAttribute("d", ""); });
  ui.button("Go", go);
  handle(ctx, art.box("object"), "Car on the number line: tap to go", {}).addEventListener("click", go);
  art.touchable(["object"]);
  return { destroy() {} };
}
