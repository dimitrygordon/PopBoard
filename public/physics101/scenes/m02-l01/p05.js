// Snapshots: a fixed camera snaps the runner at equal time intervals. Flipping through the frames,
// the tree stays put and only the runner changes position.
import { add, handle, fontPx, tween } from "../kit.js";
const PXS = 150; // runner speed in page px per second
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [900, 90, 1560, 190], "Pick an interval, then tap Snap."), 28); cap.style.whiteSpace = "pre-line";
  let dt = 1, frames = [], at = -1;
  const showFrame = (i) => { at = i; art.set("runner", { dx: frames[i] }); cap.textContent = `Frame ${i + 1} of ${frames.length}, t = ${(i * dt).toFixed(1)} s\ntree: same place.  runner: ${Math.round(frames[i] / 15)} m from the start.`; };
  const snap = async () => {
    art.touched("runner"); frames = [];
    for (let i = 0; i < 4; i++) frames.push(Math.min(1150, i * dt * PXS));
    await tween(1200, (t) => art.set("runner", { dx: t * frames[3] }), reduce);
    showFrame(0); say("Four frames, equal time apart. Flip through them: only the runner changes position.");
  };
  ui.slider({ label: "Time interval", min: 0.5, max: 2.5, step: 0.5, value: 1, fmt: (v) => v.toFixed(1) + " s" }, (v) => { dt = v; });
  ui.button("Snap 4 frames", snap);
  ui.button("Next frame", () => { if (!frames.length) return say("Tap Snap first."); showFrame((at + 1) % frames.length); if (at === frames.length - 1) say("The tree never moved. Relative to the camera and the ground, only the runner is moving.", true); });
  handle(ctx, art.box("runner"), "Runner: tap to snap", {}).addEventListener("click", snap);
  art.touchable(["runner"]);
  return { destroy() {} };
}
