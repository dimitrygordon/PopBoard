// Predicting values: choose a mass and the spring equation y = 0.08x + 13.7 predicts the length.
// Past the measured 0 to 35 g a warning appears, and above 80 g the spring snaps.
import { add, handle, fontPx } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [80, 430, 900, 650], ""), 28); cap.style.whiteSpace = "pre-line";
  const go = (x) => {
    if (x > 80) { cap.textContent = `${x} g: SNAP!\nThe spring broke. The equation can't predict this.`; cap.style.color = "#B03A2E"; return say("Far outside the data, the model fails: the spring breaks instead of stretching.", false); }
    const y = 0.08 * x + 13.7; cap.style.color = x > 35 ? "#B03A2E" : "";
    cap.textContent = `y = 0.08 \u00d7 ${x} + 13.7 = ${y.toFixed(1)} cm\nstretch = ${(y - 13.7).toFixed(1)} cm` + (x > 35 ? "\nWarning: beyond the measured 0 to 35 g" : "");
    say(x > 35 ? "This prediction extrapolates past Table 3. Be careful trusting it." : x === 49 ? "" : "Inside the measured range: a safe prediction.", x <= 35);
  };
  const sl = ui.slider({ label: "Mass", min: 0, max: 100, step: 1, value: 20, fmt: (v) => v + " g" }, go);
  handle(ctx, art.box("mass-49g"), "49 gram mass: tap to predict its length", {}).addEventListener("click", () => {
    art.touched("mass-49g"); sl.set(49); go(49); say("49 g: about 17.6 cm long, a stretch of about 3.9 cm. That's already past the measured range.", false);
  });
  art.touchable(["mass-49g"]);
  go(20);
  return { destroy() {} };
}
