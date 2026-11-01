// Reaction test: the car cruises at 25 m/s. After a random wait a child appears; press BRAKE. Reacting
// distance = 25 m/s times your reaction time, braking distance = 25^2 / (2 x 8.5) = 37 m (book: 0.45 s, 48 m total).
import { add, fontPx, caption, tapCut, f2 } from "../kit.js";
const V = 25, A = 8.5, PXM = 14;
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [560, 470, 1300, 600], 24, "Tap the car, then press BRAKE when the child appears.");
  const kid = fontPx(add(layer, "div", "cap", [1180, 380, 1480, 450], "CHILD AHEAD!"), 34); kid.style.color = "#B5473A"; kid.style.visibility = "hidden";
  let state = "idle", tShow = 0, timer = 0, raf = 0;
  const start = () => {
    art.touched("car"); clearTimeout(timer); cancelAnimationFrame(raf); kid.style.visibility = "hidden"; art.set("car", { dx: 0 }); state = "wait";
    cap.textContent = "Cruising at 25 m/s... watch for the child.";
    timer = setTimeout(() => { kid.style.visibility = ""; tShow = performance.now(); state = "react"; }, 1200 + Math.random() * 2300);
  };
  const brake = () => {
    art.touched("brake");
    if (state === "wait") { clearTimeout(timer); state = "idle"; cap.textContent = "Too early! Tap the car to try again."; return; }
    if (state !== "react") return; state = "idle";
    const rt = (performance.now() - tShow) / 1000, xr = V * rt, xb = (V * V) / (2 * A), tot = xr + xb;
    cap.textContent = `reaction time ${f2(rt, 2)} s\nreacting: (25 m/s)(${f2(rt, 2)} s) = ${f2(xr, 1)} m   braking: 37 m\ntotal stopping distance: ${f2(tot, 0)} m (book, 0.45 s: 48 m)`;
    const t0 = performance.now(), T = rt + V / A;
    const f = (now) => { const t = Math.min(T, (now - t0) / 1000 * 2), x = t < rt ? V * t : xr + V * (t - rt) - 0.5 * A * (t - rt) ** 2; art.set("car", { dx: Math.min(1100, x * PXM) }); if (t < T) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f);
    say(`Your stopping distance is ${f2(tot, 0)} meters: ${f2(xr, 0)} meters while reacting and 37 while braking.`, true);
  };
  tapCut(ctx, "car", "Car: tap to start driving", start);
  tapCut(ctx, "brake", "Brake button", brake);
  art.touchable(["car", "brake"]);
  return { destroy() { clearTimeout(timer); cancelAnimationFrame(raf); } };
}
