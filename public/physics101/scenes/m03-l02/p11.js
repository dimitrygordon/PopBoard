// Green light: the car starts from rest at the chosen acceleration (1.0 to 6.0 m/s^2, book 3.5). Press Stop
// at 25 m/s (it stops itself there too) and compare the distance with x_f = v_f^2 / 2a (book: 89 m).
import { caption, tapCut, f2 } from "../kit.js";
const PXM = 9, MAXPX = 1200;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const cap = caption(layer, [1080, 500, 1570, 640], 24, "Set a, tap the car, and press Stop at 25 m/s.");
  let a = 3.5, raf = 0, t = 0, running = false;
  const show = () => { const v = a * t, x = 0.5 * a * t * t; cap.textContent = `t = ${f2(t, 2)} s   v = ${f2(v, 1)} m/s\nx = ${f2(x, 1)} m`; art.set("car", { dx: Math.min(MAXPX, x * PXM) }); };
  const stop = () => {
    if (!running) return; running = false; cancelAnimationFrame(raf); const v = a * t, x = 0.5 * a * t * t, pred = 625 / (2 * a);
    cap.textContent += `\nat 25 m/s: x_f = 25\u00b2 / 2a = ${f2(pred, 0)} m`;
    say(`You stopped at ${f2(v, 1)} meters per second after ${f2(x, 0)} meters. At 25 meters per second the equation gives ${f2(pred, 0)} meters.`, true);
  };
  const go = () => {
    art.touched("car"); cancelAnimationFrame(raf); t = 0; running = true;
    if (reduce) { t = 25 / a; show(); return stop(); }
    const t0 = performance.now(); const f = (now) => { t = Math.min(25 / a, ((now - t0) / 1000) * 2); show(); if (t >= 25 / a) return stop(); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f);
  };
  ui.slider({ label: "Acceleration", min: 1, max: 6, step: 0.5, value: 3.5, fmt: (x) => f2(x, 1) + " m/s\u00b2" }, (x) => (a = x));
  ui.button("Green light", go); ui.button("Stop", stop);
  tapCut(ctx, "car", "Car: tap when the light turns green", go);
  art.touchable(["car"]);
  return { destroy() { cancelAnimationFrame(raf); } };
}
