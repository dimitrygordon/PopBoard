// Paintbrush cars: each car paints a stripe for half of every second. A faster car paints longer
// stripes, and the stripes become the velocity arrows on its motion diagram.
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const PXM = 22; // page px per meter
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const st = { fastcar: path(s, "", { stroke: "#B5473A", "stroke-width": 10 }), slowcar: path(s, "", { stroke: "#B5473A", "stroke-width": 10 }) };
  const cap = fontPx(add(layer, "div", "cap", [480, 500, 1120, 580], ""), 26); cap.style.textAlign = "center";
  const v = { fastcar: 10, slowcar: 4 }, CFG = { fastcar: { x: 260, y: 820, d: 1 }, slowcar: { x: 1360, y: 730, d: -1 } };
  const stripes = (id, t) => { const c = CFG[id], out = []; for (let k = 0; k < t; k++) { const a = k, b = Math.min(t, k + 0.5); if (b > a) out.push(`M ${c.x + c.d * v[id] * a * PXM} ${c.y} H ${c.x + c.d * v[id] * b * PXM}`); } return out.join(" "); };
  const paint = async () => {
    art.touched("fastcar"); art.touched("slowcar");
    const T = Math.min(5, 1100 / (Math.max(v.fastcar, v.slowcar) * PXM));
    await tween(3000, (k) => { const t = k * T; for (const id in v) { st[id].setAttribute("d", stripes(id, t)); art.set(id, { dx: CFG[id].d * v[id] * t * PXM }); } }, reduce);
    cap.textContent = `fast car: ${v.fastcar} m/s, stripes ${(v.fastcar / 2).toFixed(1)} m   slow car: ${v.slowcar} m/s, stripes ${(v.slowcar / 2).toFixed(1)} m`;
    say("Each stripe's length is proportional to the car's speed: these are its velocity vectors, longer for the faster car.", true);
  };
  ui.slider({ label: "Fast car (right)", min: 1, max: 12, step: 1, value: 10, fmt: (x) => x + " m/s" }, (x) => (v.fastcar = x));
  ui.slider({ label: "Slow car (left)", min: 1, max: 12, step: 1, value: 4, fmt: (x) => x + " m/s" }, (x) => (v.slowcar = x));
  ui.button("Paint", paint);
  ui.button("Wash the road", () => { for (const id in v) { st[id].setAttribute("d", ""); art.set(id, { dx: 0 }); } cap.textContent = ""; say(""); });
  for (const id of ["fastcar", "slowcar"]) handle(ctx, art.box(id), `${id === "fastcar" ? "Fast" : "Slow"} car: tap to paint`, {}).addEventListener("click", paint);
  art.touchable(["fastcar", "slowcar"]);
  return { destroy() {} };
}
