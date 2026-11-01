// Where is point C? (Example Problem 4.) Set the motorcyclist's average velocity and the time past
// point B, then tap him to ride: x = v-bar t + x-initial, with B at 46 m east of A (book: 82 m east).
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const f = (m) => 150 + 14.6 * m, XI = 46;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const c = path(s, "", { stroke: "#E2B654", "stroke-width": 6 });
  const cap = fontPx(add(layer, "div", "cap", [200, 200, 1400, 260], ""), 30); cap.style.textAlign = "center";
  let v = 12, t = 3;
  const ride = async () => {
    art.touched("moto"); const x = XI + v * t;
    await tween(2000, (k) => art.set("moto", { dx: Math.min(1400 - f(XI), (x - XI) * k * 14.6) }), reduce);
    c.setAttribute("d", `M ${f(Math.min(x, 85))} 690 v 80 m -14 0 h 28`);
    cap.textContent = `x = (${v} m/s)(${t.toFixed(1)} s) + 46 m = ${x.toFixed(0)} m east`;
    say(`Point C is ${x.toFixed(0)} m east of A.` + (v === 12 && t === 3 ? " That's the book's answer." : ""), true);
  };
  ui.slider({ label: "v\u0304 (east)", min: 0, max: 20, step: 1, value: 12, fmt: (x) => x + " m/s" }, (x) => (v = x));
  ui.slider({ label: "Time past B", min: 0, max: 5, step: 0.5, value: 3, fmt: (x) => x.toFixed(1) + " s" }, (x) => (t = x));
  ui.button("Ride", ride);
  ui.button("Back to B", () => { art.set("moto", { dx: 0 }); c.setAttribute("d", ""); cap.textContent = ""; say(""); });
  handle(ctx, art.box("moto"), "Motorcyclist: tap to ride", {}).addEventListener("click", ride);
  art.touchable(["moto"]);
  return { destroy() {} };
}
