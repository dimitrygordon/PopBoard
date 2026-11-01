// Step through the toss: pick a launch speed (5 to 30 m/s, book 20 m/s, up is +). Each tap adds one second:
// v = v_i - 9.8 t and h = v_i t - 4.9 t^2. The velocity drops 9.8 m/s per second and changes sign at the top.
import { svg, path, caption, tapCut, follow, arrowD, RED, NAVY, f2 } from "../kit.js";
const G = 9.8, X = 330, GROUND = 800;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const marks = path(s, "", { stroke: NAVY, "stroke-width": 3, fill: "rgba(217,139,106,0.35)" }), arr = path(s, "", { stroke: RED, "stroke-width": 5 });
  const cap = caption(layer, [380, 120, 700, 230], 22);
  let vi = 20, t = -1, d = "", ad = "", hb = null; const home = art.box("ball");
  const k = () => Math.min(28, 620 / ((vi * vi) / (2 * G))), Y = (h) => GROUND - h * k();
  const reset = () => { t = -1; d = ""; ad = ""; marks.setAttribute("d", ""); arr.setAttribute("d", ""); art.set("ball", { dy: 0 }); if (hb) follow(hb, home, 0, 0); cap.textContent = `launch at +${vi} m/s. Tap the ball to step 1 s.`; };
  const step = () => {
    art.touched("ball"); const tEnd = (2 * vi) / G; if (t + 1 > tEnd + 1e-9) { say("The ball is back at the launch height. Pick a speed to toss it again.", true); return; }
    t += 1; const h = vi * t - 0.5 * G * t * t, v = vi - G * t, y = Y(h);
    art.set("ball", { dy: y - 330 }); follow(hb, home, 0, y - 330); d += `M ${X - 46} ${y} a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 `; marks.setAttribute("d", d);
    ad += arrowD(X + 40, y, X + 40, y - v * 6, 12) + " "; arr.setAttribute("d", ad);
    cap.textContent = `t = ${t} s   v = ${v >= 0 ? "+" : ""}${f2(v, 1)} m/s\nheight ${f2(h, 1)} m`;
    say(t === 0 ? "Launched." : v < 0 && v + G >= 0 ? `The velocity changed sign: the ball reached the top during this second and is now falling at ${f2(-v, 1)} meters per second.` : `9.8 meters per second less than a second ago: ${f2(v, 1)}.`, true);
  };
  ui.slider({ label: "Launch speed", min: 5, max: 30, step: 1, value: 20, fmt: (x) => "+" + x + " m/s" }, (x) => { vi = x; reset(); });
  ui.button("Step 1 s", step); ui.button("Reset", reset);
  hb = tapCut(ctx, "ball", "Ball: tap to step one second", step);
  art.touchable(["ball"]); reset();
  return { destroy() {} };
}
