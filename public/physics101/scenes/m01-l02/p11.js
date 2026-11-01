// Road trip check: set the distance and time, tap the car to drive the route, and the sandbox runs the
// lesson's step 3: units, a rounded estimate, and whether the speed is reasonable for a car.
import { handle, tween } from "../kit.js";
const ROAD = 1150; // page px the car drives, town to city
const sig2 = (v) => Number(v.toPrecision(2));
export default function build(ctx) {
  const { art, ui, say, reduce } = ctx;
  let d = 434, t = 4.5, busy = false;
  const sd = ui.slider({ label: "Distance", min: 50, max: 900, step: 1, value: d, fmt: (v) => v + " km" }, (v) => (d = v));
  const st = ui.slider({ label: "Time", min: 0.5, max: 12, step: 0.5, value: t, fmt: (v) => v + " h" }, (v) => (t = v));
  const drive = async () => {
    if (busy) return; busy = true; art.touched("car");
    const v = d / t, est = Math.round(d / 100) * 100 / Math.max(1, Math.round(t));
    say(`Step 2: v = d / t = ${d} km / ${t} h = ${v.toFixed(2)} km/h, about ${sig2(v)} km/h.`);
    await tween(1600, (k) => art.set("car", { dx: ROAD * k }), reduce);
    const near = Math.abs(v - est) / est < 0.35, car = v >= 20 && v <= 130;
    say(`Step 3: km divided by h gives km/h, a speed unit. Estimate: about ${Math.round(d / 100) * 100} km / ${Math.max(1, Math.round(t))} h \u2248 ${Math.round(est)} km/h, ${near ? "close to" : "far from"} ${sig2(v)}. ${car ? "A normal speed for a car: reasonable." : v > 130 ? "Faster than any highway allows: check your numbers." : "Very slow for a road trip: is that reasonable?"}`, near && car);
    busy = false;
  };
  handle(ctx, art.box("car"), "Car: tap to drive the route", {}).addEventListener("click", () => { art.set("car", { dx: 0 }); drive(); });
  ui.button("Drive", () => { art.set("car", { dx: 0 }); drive(); });
  ui.button("Use the book's numbers", () => { d = 434; t = 4.5; sd.set(d); st.set(t); say("434 km in 4.5 h. Press Drive."); });
  art.touchable(["car"]);
  return { destroy() {} };
}
