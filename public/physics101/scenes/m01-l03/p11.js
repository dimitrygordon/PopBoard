// GPS precision: toggle between a car receiver (a few meters) and a geologist's receiver
// (millimeters) and watch the position dot shrink.
import { add, handle, fontPx, tween, ease } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [860, 770, 1440, 840], ""), 26);
  let mode = "car", k = 1;
  const go = async (m) => {
    if (m === mode) return; mode = m; const a = k, b = m === "car" ? 1 : 0.04;
    await tween(700, (t) => { k = a + (b - a) * ease(t); art.set("car-dot", { scale: k }); }, reduce);
    show();
  };
  const show = () => {
    cap.textContent = mode === "car" ? "Car receiver: within a few meters" : "Geologist's receiver: within millimeters";
    say(mode === "car" ? "The car's receiver places you within a few meters: the big dot." : "The geologist's receiver shrinks the dot to millimeters, small enough to track moving plates.", true);
  };
  handle(ctx, art.box("car-dot"), "Car receiver dot", {}).addEventListener("click", () => { art.touched("car-dot"); go("car"); });
  handle(ctx, art.box("geo-dot"), "Geologist receiver dot", {}).addEventListener("click", () => { art.touched("geo-dot"); go("geo"); });
  ui.button("Car receiver", () => go("car"));
  ui.button("Geologist's receiver", () => go("geo"));
  art.touchable(["car-dot", "geo-dot"]);
  cap.textContent = "Car receiver: within a few meters";
  return { destroy() {} };
}
