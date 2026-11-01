// Build the acceleration: flip v_i, drag it so its tail sits on the tip of v_f, and the sandbox draws
// delta v from the tail of v_f to the tip of minus v_i. The violet acceleration arrow points the same way (time step 1 s).
import { svg, path, handle, follow, caption, tapCut, arrowD, VIOLET, f2 } from "../kit.js";
const VF = [200, 473], VI = [1310, 1501], Y = 860, PXM = 27.3; // v_f is 10 m/s long
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const dv = path(s, "", { stroke: VIOLET, "stroke-width": 6, "stroke-dasharray": "12 8" }), acc = path(s, "", { stroke: VIOLET, "stroke-width": 8 });
  const cap = caption(layer, [560, 800, 1240, 840], 22, "Flip v_i, then drag its tail onto the tip of v_f.");
  let flipped = false, dx = 0;
  const tail = () => (flipped ? VI[1] : VI[0]) + dx, tip = () => (flipped ? VI[0] : VI[1]) + dx;
  const check = (final) => {
    dv.setAttribute("d", ""); acc.setAttribute("d", "");
    if (Math.abs(tail() - VF[1]) > 30) { cap.textContent = flipped ? "Now drag its tail onto the tip of v_f." : "Flip v_i, then drag its tail onto the tip of v_f."; return; }
    dx = VF[1] - (flipped ? VI[1] : VI[0]); art.set("vi", { dx, rot: flipped ? 180 : 0 }); follow(h, home, dx, 0);
    if (!flipped) { cap.textContent = "That adds v_i. Flip it first so you subtract."; if (final) say("Tail to tip adds the vectors. Flip v_i to make minus v_i.", true); return; }
    const d = (tip() - VF[0]) / PXM;
    dv.setAttribute("d", arrowD(VF[0], Y + 28, tip(), Y + 28, 14)); acc.setAttribute("d", arrowD(800, 760, 800 + d * PXM, 760, 18));
    cap.textContent = `\u0394v = v_f + (\u2212v_i) = 10.0 m/s \u2212 7.0 m/s = ${f2(d, 1)} m/s, so a = ${f2(d, 1)} m/s\u00b2`;
    if (final) say("Delta v runs from the tail of v f to the tip of minus v i. The acceleration points the same way.", true);
  };
  const home = art.box("vi"); let x0 = 0;
  const h = handle(ctx, home, "v_i arrow: drag", {
    start: () => { art.touched("vi"); x0 = dx; },
    move: (mx) => { dx = x0 + mx; art.set("vi", { dx, rot: flipped ? 180 : 0 }); },
    end: () => { follow(h, home, dx, 0); check(true); },
  });
  const flip = () => { flipped = !flipped; art.set("vi", { dx, rot: flipped ? 180 : 0 }); check(true); };
  const reset = () => { flipped = false; dx = 0; art.set("vi", { dx: 0, rot: 0 }); follow(h, home, 0, 0); check(false); };
  ui.button("Flip v_i", flip); ui.button("Reset", reset);
  tapCut(ctx, "vf", "v_f arrow: tap to reset", reset);
  art.touchable(["vf", "vi"]);
  return { destroy() {} };
}
