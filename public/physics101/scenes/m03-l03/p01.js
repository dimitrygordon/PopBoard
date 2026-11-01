// Drop tower (30 m): pick two objects and drop them with the air on or off. With no air every object falls in
// sqrt(2h/g) = 2.47 s. With air, each one has a terminal speed (sandbox values: hammer 60, book 25, paper 2.0,
// feather 0.60 m/s) and falls by the quadratic-drag time t = (vt/g) acosh(e^(gh/vt^2)).
import { svg, path, tween, caption, tapCut, NAVY, RED } from "../kit.js";
const H = 30, G = 9.8, VT = { hammer: 60, book: 25, paper: 2.0, feather: 0.6 }, X = [1170, 1370], Y0 = 140, Y1 = 500;
const fallTime = (k, air) => { if (!air) return Math.sqrt((2 * H) / G); const v = VT[k], z = (G * H) / (v * v); return z > 30 ? H / v + (v / G) * Math.LN2 : (v / G) * Math.acosh(Math.exp(z)); };
const yAt = (k, air, t) => { if (!air) return 0.5 * G * t * t; const v = VT[k]; return ((v * v) / G) * Math.log(Math.cosh((G * t) / v)); };
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); path(s, `M ${X[0] - 60} ${Y1 + 18} H ${X[1] + 60}`, { stroke: NAVY, "stroke-width": 4 });
  const balls = X.map((x, i) => path(s, `M ${x} ${Y0} h 0.1`, { stroke: i ? RED : NAVY, "stroke-width": 26 }));
  const cap = caption(layer, [1080, 30, 1580, 120], 22);
  let air = true, pick = ["hammer", "feather"];
  const label = () => { cap.textContent = `air: ${air ? "on" : "off"}   left: ${pick[0]}, right: ${pick[1]}`; };
  const drop = async () => {
    const T = pick.map((k) => fallTime(k, air)), Tm = Math.max(...T);
    await tween(Math.min(4000, 900 * Tm), (u) => { const t = u * Tm; pick.forEach((k, i) => { const y = Math.min(H, yAt(k, air, t)); balls[i].setAttribute("d", `M ${X[i]} ${Y0 + (y / H) * (Y1 - Y0)} h 0.1`); }); }, reduce);
    cap.textContent = `air ${air ? "on" : "off"}: ${pick[0]} ${T[0].toFixed(2)} s, ${pick[1]} ${T[1].toFixed(2)} s`;
    say(air ? (Math.abs(T[0] - T[1]) < 0.05 ? "Both are dense enough that air hardly matters." : "With air, the lighter, spread-out object falls much more slowly.") : "No air: they land together, just like the hammer and feather on the Moon.", true);
  };
  for (const k of Object.keys(VT)) ui.button(`Left: ${k}`, () => { pick[0] = k; label(); });
  for (const k of Object.keys(VT)) ui.button(`Right: ${k}`, () => { pick[1] = k; label(); });
  ui.button("Drop", drop);
  tapCut(ctx, "air", "Air switch: tap to turn the air on or off", () => { air = !air; label(); });
  art.touchable(["air"]); label();
  return { destroy() {} };
}
