// Probe: drag it right to move it away from the surface. Free-fall acceleration falls off as
// g = g0 (R / (R + h))^2, so one Earth radius up gives about 2.5 m/s^2. 500 px = 4 radii of altitude.
import { handle, follow, caption, clamp, f2 } from "../kit.js";
const BODY = { Earth: { g0: 9.8, R: 6371 }, Moon: { g0: 1.6, R: 1737 } }, PXR = 125;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = caption(layer, [1080, 360, 1560, 480], 24);
  let b = "Earth", r = 0, r0 = 0;
  const show = (done) => {
    const { g0, R } = BODY[b], g = g0 / (1 + r) ** 2;
    cap.textContent = `${b}: altitude ${f2(r, 2)} radii (${Math.round(r * R).toLocaleString("en-US")} km)\ng = ${f2(g, g < 1 ? 3 : 2)} m/s\u00b2`;
    if (done) say(r < 0.01 ? `At the surface of the ${b}, about ${g0} meters per second squared.` : `${f2(r, 2)} radii up, free-fall acceleration is ${f2(g, 2)} meters per second squared: smaller with distance.`, true);
  };
  const home = art.box("probe");
  const h = handle(ctx, home, "Probe: drag right to move it away", {
    start: () => { art.touched("probe"); r0 = r; },
    move: (dx) => { r = clamp(r0 + dx / PXR, 0, 4); art.set("probe", { dx: r * PXR * 0.9 - 0 }); show(false); },
    end: () => { follow(h, home, r * PXR * 0.9, 0); show(true); },
  });
  ui.button("Earth", () => { b = "Earth"; show(true); }); ui.button("Moon", () => { b = "Moon"; show(true); });
  art.touchable(["probe"]); show(false);
  return { destroy() {} };
}
