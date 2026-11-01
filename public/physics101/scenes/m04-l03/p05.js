// Same force, tiny acceleration: the ball falls at 9.8 m/s^2; Earth accelerates by m g / M_Earth
// (M_Earth = 5.97e24 kg). Tap the ball to cycle softball 0.18 kg (2.9e-25 m/s^2), bowling ball 7.0 kg,
// car 1500 kg, and a 1.0e12 kg asteroid. Axis: 10^-25 to 10^1 across x 250-1350.
import { caption, tapCut, f2 } from "../kit.js";
const M = [["softball", 0.18], ["bowling ball", 7], ["car", 1500], ["asteroid", 1e12]], X = (e) => 250 + (1100 * (e + 25)) / 26, ME = 5.97e24;
const sci = (v) => { const e = Math.floor(Math.log10(v)); return `${f2(v / 10 ** e, 1)}\u00d710^${e < 0 ? "\u2212" + -e : e}`; };
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [300, 720, 1300, 790], 22);
  let i = 0;
  const show = (talk) => { const [n, m] = M[i], a = (m * 9.8) / ME; art.set("earth", { dx: X(Math.log10(a)) - X(Math.log10((0.18 * 9.8) / ME)) }); cap.textContent = `${n}, ${m >= 1e6 ? sci(m) : m} kg: force ${m >= 1e6 ? sci(m * 9.8) : f2(m * 9.8, 1)} N on each\nEarth's acceleration ${sci(a)} m/s\u00b2`; if (talk) say(`With a ${n}, Earth's acceleration is still only ${sci(a).replace("\u00d710^", " times ten to the ").replace("\u2212", "minus ")} meters per second squared.`, true); };
  tapCut(ctx, "ball", "Ball: tap to change its mass", () => { i = (i + 1) % M.length; show(true); });
  tapCut(ctx, "earth", "Earth: tap to reset to the softball", () => { i = 0; show(true); });
  art.touchable(["ball", "earth"]); show(false);
  return { destroy() {} };
}
