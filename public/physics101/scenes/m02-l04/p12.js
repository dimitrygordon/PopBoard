// The position equation x = v-bar t + x-initial: drag the v-bar knob (-10 to 10 m/s) and the
// x-initial knob (-15 to 20 m). The line tilts with v-bar and shifts with x-initial; the book's
// Figure 20 line is v-bar = -5.0 m/s, x-initial = 20.0 m.
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const fx = (t) => 700 + t * 450 / 5.5, fy = (p) => 640 - (p + 15) * 490 / 35;
const K = { vbar: { lo: -10, hi: 10, v: -5, step: 0.5 }, xi: { lo: -15, hi: 20, v: 20, step: 1 } }, KX = (k, v) => 180 + (v - K[k].lo) / (K[k].hi - K[k].lo) * 340;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const ns = "http://www.w3.org/2000/svg";
  const cp = document.createElementNS(ns, "clipPath"); cp.setAttribute("id", "p101-m2-l4-p12"); const r = document.createElementNS(ns, "rect");
  Object.entries({ x: 700, y: 150, width: 450, height: 490 }).forEach(([a, b]) => r.setAttribute(a, b)); cp.appendChild(r); s.appendChild(cp);
  const ln = path(s, "", { stroke: "#E2B654", "stroke-width": 7, "clip-path": "url(#p101-m2-l4-p12)" });
  const cap = fontPx(add(layer, "div", "cap", [160, 640, 680, 720], ""), 28);
  const v = { vbar: -5, xi: 20 };
  const draw = () => {
    ln.setAttribute("d", `M ${fx(0)} ${fy(v.xi)} L ${fx(5.5)} ${fy(v.xi + v.vbar * 5.5)}`);
    const sg = (n) => (n < 0 ? "\u2212" : "") + Math.abs(n).toFixed(1);
    cap.textContent = `x = (${sg(v.vbar)} m/s)t + ${sg(v.xi)} m`;
  };
  for (const k of ["vbar", "xi"]) {
    const home = art.box(k), base = 350; let x0 = 0;
    const off = () => KX(k, v[k]) - base;
    const h = handle(ctx, home, k === "vbar" ? "v-bar knob: drag left or right" : "x-initial knob: drag left or right", {
      start: () => { art.touched(k); x0 = KX(k, v[k]); },
      move: (dx) => { const x = clamp(x0 + dx, 180, 520); v[k] = Math.round((K[k].lo + (x - 180) / 340 * (K[k].hi - K[k].lo)) / K[k].step) * K[k].step; art.set(k, { dx: off() }); draw(); },
      end: () => { follow(h, home, off()); say(k === "vbar" ? "Changing v-bar changes the slope: the line tilts." : "Changing x-initial moves where the line starts: it slides up or down.", true); },
    });
    art.set(k, { dx: off() }); follow(h, home, off());
  }
  art.touchable(["vbar", "xi"]);
  draw();
  return { destroy() {} };
}
