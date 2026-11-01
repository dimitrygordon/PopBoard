// Shutter speed: drag the gold knob from short to long and take a photo of a moving and a parked
// train. Only the moving train smears, and the smear grows the longer the shutter stays open.
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const X0 = 1280, X1 = 1536, HOME = 1459; // Leo's slider: short at X0, long at X1
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const ns = "http://www.w3.org/2000/svg";
  const f = document.createElementNS(ns, "filter"); f.setAttribute("id", "p101-m2-blur"); f.setAttribute("x", "-50%"); f.setAttribute("width", "200%");
  const g = document.createElementNS(ns, "feGaussianBlur"); g.setAttribute("stdDeviation", "0 0"); f.appendChild(g); s.appendChild(f);
  path(s, "M 1150 90 H 1570 V 380 H 1150 Z", { fill: "#F7F6F2", stroke: "#1F2F5C", "stroke-width": 3 });
  const train = (y, col) => path(s, `M 1190 ${y} h 170 q 30 0 40 30 v 30 h -210 Z`, { fill: col, stroke: "#3D3D3D", "stroke-width": 2 });
  const moving = train(140, "#D98B6A"); moving.setAttribute("filter", "url(#p101-m2-blur)");
  train(270, "#8FB3D9");
  const cap = fontPx(add(layer, "div", "cap", [1160, 96, 1560, 136], "Your photo"), 24); cap.style.textAlign = "right";
  const lab = fontPx(add(layer, "div", "cap", [1160, 210, 1560, 250], ""), 22); lab.style.textAlign = "right";
  fontPx(add(layer, "div", "cap", [1160, 335, 1560, 375], "parked train"), 22).style.textAlign = "right";
  let x = HOME;
  const ms = () => Math.round(1 + (x - X0) / (X1 - X0) * 499);
  const show = () => { lab.textContent = `moving train, shutter ${ms()} ms`; };
  const shoot = () => { const b = ms() / 500 * 40; g.setAttribute("stdDeviation", `${b} 0`); say(`Shutter open ${ms()} ms: the moving train changed position while the shutter was open, so it smears. The parked train stays sharp.`, true); };
  const home = art.box("shutter-knob"); let x0 = 0;
  const h = handle(ctx, home, "Shutter time knob: move left for short, right for long", {
    start: () => { art.touched("shutter-knob"); x0 = x; },
    move: (dx) => { x = clamp(x0 + dx, X0, X1); art.set("shutter-knob", { dx: x - HOME }); show(); },
    end: () => { follow(h, home, x - HOME, 0); shoot(); },
  });
  ui.button("Take a photo", shoot);
  art.touchable(["shutter-knob"]);
  show(); g.setAttribute("stdDeviation", "0 0");
  return { destroy() {} };
}
