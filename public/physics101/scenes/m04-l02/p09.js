// Wind tunnel: F_drag = 1/2 rho C_d A v^2. Speed 0-40 m/s (default 20), radius 0.05-0.30 m (default 0.10),
// shapes sphere C_d 0.47, flat disk 1.17, teardrop 0.04; fluids air 1.2 and water 1000 kg/m^3.
// The arrow length grows with log10 of the force (60 px per factor of 10, from 0.01 N).
import { svg, path, caption, tapCut, arrowD, RED, f2, clamp } from "../kit.js";
const SH = [["sphere", 0.47], ["flat disk", 1.17], ["teardrop", 0.04]], FL = [["air", 1.2], ["water", 1000]];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const s = svg(layer); const ar = path(s, "", { stroke: RED, "stroke-width": 7 });
  const cap = caption(layer, [880, 790, 1580, 890], 22);
  let v = 20, r = 0.1, sh = 0, fl = 0;
  const show = () => { const F = 0.5 * FL[fl][1] * SH[sh][1] * Math.PI * r * r * v * v, L = v ? clamp(60 * Math.log10(F / 0.01), 10, 600) : 0; ar.setAttribute("d", L ? arrowD(840, 450, 840 + L, 450, 16) : ""); cap.textContent = `${SH[sh][0]} in ${FL[fl][0]}, r = ${f2(r, 2)} m, v = ${v} m/s\nF_drag = ${F < 100 ? f2(F, 2) : Math.round(F).toLocaleString("en-US")} N`; return F; };
  ui.slider({ label: "Speed", min: 0, max: 40, step: 1, value: 20, fmt: (x) => x + " m/s" }, (x) => { v = x; show(); });
  ui.slider({ label: "Radius", min: 0.05, max: 0.3, step: 0.01, value: 0.1, fmt: (x) => f2(x, 2) + " m" }, (x) => { r = x; show(); });
  tapCut(ctx, "obj", "Object: tap to change shape", () => { sh = (sh + 1) % 3; const F = show(); say(`A ${SH[sh][0]}: ${f2(F, 2)} newtons of drag.`, true); });
  tapCut(ctx, "speed", "Fluid: tap to switch air and water", () => { fl = 1 - fl; show(); say(fl ? "Water is about 800 times denser than air, so the drag is about 800 times bigger." : "Back to air.", true); });
  ctx.art.touchable(["obj", "speed"]); show();
  return { destroy() {} };
}
