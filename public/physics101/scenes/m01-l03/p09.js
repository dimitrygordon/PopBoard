// Two-point calibration: this scale is secretly off. Point one: zero it. Point two: weigh the
// 200.0 g standard and adjust the span until it reads 200.0 g.
import { add, handle, fontPx } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const lcd = fontPx(add(layer, "div", "cap", [680, 585, 955, 650], ""), 34);
  Object.assign(lcd.style, { background: "#C9D6A3", color: "#1F2F5C", textAlign: "center", fontFamily: "ui-monospace, monospace" });
  let zero = 2.3, span = 1.015, on = false, p1 = false, p2 = false;
  const read = () => (on ? 200 * span : 0) + zero;
  const show = () => { lcd.textContent = read().toFixed(1) + " g"; p2 = on && p1 && Math.abs(read() - 200) < 0.05; };
  const place = (v) => { on = v; art.set("standard-mass", on ? { dx: -584, dy: -230 } : { dx: 0, dy: 0 }); show(); };
  handle(ctx, art.box("standard-mass"), "Standard mass, 200.0 g: tap to put it on or take it off", {}).addEventListener("click", () => {
    art.touched("standard-mass"); place(!on);
    say(on ? (p1 ? `With the 200.0 g standard on, it reads ${read().toFixed(1)} g. Adjust the span until it matches.` : `It reads ${read().toFixed(1)} g, but the zero has not been checked yet. Take it off and zero the scale first.`) : `Empty pan reads ${read().toFixed(1)} g.`, p2);
  });
  ui.button("Zero the scale (point one)", () => {
    if (on) return say("Take the standard off first: point one checks the empty pan.");
    zero = 0; p1 = true; show(); say("Point one passed: the empty scale reads 0.0 g.", true);
  });
  const sp = ui.slider({ label: "Span adjust", min: 0.98, max: 1.02, step: 0.0025, value: span, fmt: (v) => ((v - 1) * 100).toFixed(2) + "%" }, (v) => {
    span = v; show();
    if (p2) say("Point two passed: the standard reads 200.0 g. This scale is calibrated!", true);
    else if (on) say(`Standard reads ${read().toFixed(1)} g.`);
  });
  ui.button("Start over", () => { zero = 2.3; span = 1.015; sp.set(span); p1 = false; place(false); say(""); });
  art.touchable(["standard-mass"]);
  show();
  return { destroy() {} };
}
