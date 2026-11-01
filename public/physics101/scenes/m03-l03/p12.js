// Ride builder: a drop tower falls freely from the chosen height (10 to 100 m), then brakes evenly over the
// chosen distance (5 to 50 m). Top speed v = sqrt(2gh); braking a = v^2 / 2d, also shown in g.
import { caption, tapCut, f2 } from "../kit.js";
const G = 9.8;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = caption(layer, [520, 640, 1100, 800], 24);
  let h = 60, d = 20;
  const show = (talk) => {
    const v = Math.sqrt(2 * G * h), t = Math.sqrt((2 * h) / G), a = (v * v) / (2 * d), n = a / G;
    cap.textContent = `free fall ${h} m: ${f2(t, 2)} s, top speed ${f2(v, 1)} m/s\nbraking over ${d} m: ${f2(a, 1)} m/s\u00b2 (${f2(n, 1)} g)\nduring the drop riders feel weightless`;
    if (talk) { art.touched("builder"); say(n > 4 ? `Braking at ${f2(n, 1)} g is too harsh for most riders. Give the brakes more distance.` : `Riders fall for ${f2(t, 1)} seconds, then brake at ${f2(n, 1)} g. Thrilling but safe.`, true); }
  };
  ui.slider({ label: "Drop height", min: 10, max: 100, step: 5, value: 60, fmt: (x) => x + " m" }, (x) => { h = x; show(false); });
  ui.slider({ label: "Braking distance", min: 5, max: 50, step: 1, value: 20, fmt: (x) => x + " m" }, (x) => { d = x; show(false); });
  tapCut(ctx, "builder", "Ride builder: tap to test the ride", () => show(true));
  art.touchable(["builder"]); show(false);
  return { destroy() {} };
}
