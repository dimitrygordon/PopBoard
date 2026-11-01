// Which way is positive? The chip flips the coordinate system; a falling ball's velocity and its
// acceleration of 9.8 m/s^2 downward change sign, but the motion does not change.
import { caption, tapCut } from "../kit.js";
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [900, 360, 1500, 500], 28);
  let up = true;
  const show = (talk) => {
    cap.textContent = `${up ? "up is +" : "down is +"}\nfalling ball after 1.0 s: v = ${up ? "\u2212" : "+"}9.8 m/s\na = ${up ? "\u2212" : "+"}9.8 m/s\u00b2`;
    if (talk) say(`With ${up ? "up" : "down"} as positive, the falling ball's velocity and acceleration are both ${up ? "negative" : "positive"}. The ball does exactly the same thing.`, true);
  };
  tapCut(ctx, "toggle", "Coordinate system chip: tap to flip", () => { up = !up; show(true); });
  art.touchable(["toggle"]); show(false);
  return { destroy() {} };
}
