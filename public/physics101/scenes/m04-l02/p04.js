// Two hands, two masses: tap a mass to change it (0.10, 0.30, 1.0 kg). Held, each hand pushes up with mg;
// dropped, both fall with a = -9.8 m/s^2 whatever the mass.
import { caption, tapCut, f2 } from "../kit.js";
const MS = [0.1, 0.3, 1.0];
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [860, 560, 1580, 660], 22);
  let a = 0, b = 1, dropped = false;
  const show = () => { cap.textContent = dropped ? `dropped: both a = \u22129.8 m/s\u00b2` : `A: ${f2(MS[a], 2)} kg, F_hand = ${f2(MS[a] * 9.8, 2)} N\nB: ${f2(MS[b], 2)} kg, F_hand = ${f2(MS[b] * 9.8, 2)} N`; };
  tapCut(ctx, "m0", "Mass A: tap to change", () => { dropped = false; a = (a + 1) % 3; show(); });
  tapCut(ctx, "m1", "Mass B: tap to change", () => { dropped = false; b = (b + 1) % 3; show(); });
  tapCut(ctx, "drop", "Let go of both", () => { dropped = !dropped; show(); if (dropped) say(`The heavier mass has more weight, but also more mass to move, so both fall at 9.8 meters per second squared.`, true); });
  ctx.art.touchable(["m0", "m1", "drop"]); show();
  return { destroy() {} };
}
