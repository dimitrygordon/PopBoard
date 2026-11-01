// Parallax: drag the eye sideways. Straight in front of the pointer the scale reads 3.0 N; from an
// angle the pointer seems to sit on a different mark.
import { add, handle, fontPx } from "../kit.js";
const SCALE_X = 630;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const home = art.box("eye"), cx0 = (home[0] + home[2]) / 2;
  const cap = fontPx(add(layer, "div", "cap", [1060, 60, 1560, 130], ""), 26);
  let dx = 0;
  const show = () => {
    const off = (cx0 + dx - SCALE_X) / 400 * 0.4, r = 3.0 - off;
    cap.textContent = `You read: ${r.toFixed(1)} N`;
    return Math.abs(off) < 0.05;
  };
  let d0 = 0;
  const h = handle(ctx, home, "Eye: drag left or right", {
    start: () => { art.touched("eye"); d0 = dx; },
    move: (x) => { dx = Math.max(-200, Math.min(1100, d0 + x)); art.set("eye", { dx }); show(); },
    end: () => { h.style.left = ((home[0] + dx) / 16) + "%"; const ok = show(); say(ok ? "Eye right in front of the pointer: 3.0 N, the true reading." : "Reading from an angle shifts the value. That's parallax.", ok); },
  });
  ui.button("Eye straight in front", () => { dx = SCALE_X - cx0; art.set("eye", { dx }); h.style.left = ((home[0] + dx) / 16) + "%"; show(); say("Eye right in front of the pointer: 3.0 N, the true reading.", true); });
  art.touchable(["eye"]);
  show();
  return { destroy() {} };
}
