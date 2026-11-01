// Two runners: set each runner's start and pace, press Run, and watch both position-time lines draw.
// Where the lines cross, the runners are at the same position at the same time (in different lanes).
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const fx = (t) => 450 + t * 750 / 55, fy = (p) => 450 - (p + 100) * 370 / 300, T = 50;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const la = path(s, "", { stroke: "#1F2F5C", "stroke-width": 6 }), lb = path(s, "", { stroke: "#B5473A", "stroke-width": 6 }), x = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 3 });
  const cap = fontPx(add(layer, "div", "cap", [1210, 60, 1590, 200], ""), 24); cap.style.whiteSpace = "pre-line";
  const r = { A: { x0: 0, v: 190 / 45 }, B: { x0: -50, v: 240 / 45 } };
  const pos = (k, t) => Math.max(-100, Math.min(200, r[k].x0 + r[k].v * t));
  const seg = (k, t) => `M ${fx(0)} ${fy(pos(k, 0))} L ${fx(t)} ${fy(pos(k, t))}`;
  const cross = () => { const dv = r.B.v - r.A.v; if (Math.abs(dv) < 1e-9) return null; const t = (r.A.x0 - r.B.x0) / dv; return t > 0 && t <= T ? [t, r.A.x0 + r.A.v * t] : null; };
  const run = async () => {
    art.touched("runnerA"); art.touched("runnerB"); x.setAttribute("d", "");
    await tween(3000, (k) => { const t = k * T; la.setAttribute("d", seg("A", t)); lb.setAttribute("d", seg("B", t)); art.set("runnerA", { dx: (pos("A", t) - pos("A", 0)) * 3.5 }); art.set("runnerB", { dx: (pos("B", t) - pos("B", 0)) * 3.5 }); }, reduce);
    const c = cross();
    if (c) { x.setAttribute("d", `M ${fx(c[0]) - 14} ${fy(c[1])} a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0`); cap.textContent = `lines cross at\nt = ${c[0].toFixed(0)} s, x = ${c[1].toFixed(0)} m`; say(`At ${c[0].toFixed(0)} s both runners are at ${c[1].toFixed(0)} m: that's where one passes the other. Different lanes, so no crash.`, true); }
    else { cap.textContent = "no crossing in 50 s"; say("The lines never meet in this time, so neither runner catches the other."); }
    art.set("runnerA", { dx: 0 }); art.set("runnerB", { dx: 0 });
  };
  ui.slider({ label: "A start", min: -100, max: 100, step: 10, value: 0, fmt: (v) => v + " m" }, (v) => (r.A.x0 = v));
  ui.slider({ label: "A pace", min: 1, max: 8, step: 0.1, value: 4.2, fmt: (v) => v.toFixed(1) + " m/s" }, (v) => (r.A.v = v));
  ui.slider({ label: "B start", min: -100, max: 100, step: 10, value: -50, fmt: (v) => v + " m" }, (v) => (r.B.x0 = v));
  ui.slider({ label: "B pace", min: 1, max: 8, step: 0.1, value: 5.3, fmt: (v) => v.toFixed(1) + " m/s" }, (v) => (r.B.v = v));
  ui.button("Run", run);
  for (const k of ["runnerA", "runnerB"]) handle(ctx, art.box(k), `Runner ${k.slice(-1)}: tap to run`, {}).addEventListener("click", run);
  art.touchable(["runnerA", "runnerB"]);
  return { destroy() {} };
}
