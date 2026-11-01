// Two-point calibration: this scale is secretly off. Point one: zero it. Point two: weigh the
// 200.0 g standard and adjust the span until it reads 200.0 g.
import { add, handle, fontPx } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const lcd = fontPx(add(layer, "div", "cap", [639, 574, 989, 650], ""), 34);
  Object.assign(lcd.style, { background: "#C9D6A3", color: "#1F2F5C", textAlign: "center", fontFamily: "ui-monospace, monospace" });
  let zero = 2.3, span = 1.015, on = false, p1 = false, p2 = false;
  const read = () => (on ? 200 * span : 0) + zero;
  const show = () => { lcd.textContent = read().toFixed(1) + " g"; p2 = on && p1 && Math.abs(read() - 200) < 0.05; };
  const M = art.box("standard-mass"), PAN = [-570, -230]; // offset that sets the standard on the pan
  const msg = () => say(on ? (p1 ? `With the 200.0 g standard on, it reads ${read().toFixed(1)} g. Adjust the span until it matches.` : `It reads ${read().toFixed(1)} g, but the zero has not been checked yet. Take it off and zero the scale first.`) : `Empty pan reads ${read().toFixed(1)} g.`, p2);
  const place = (v) => { on = v; art.set("standard-mass", on ? { dx: PAN[0], dy: PAN[1] } : { dx: 0, dy: 0 }); h.style.left = ((M[0] + (on ? PAN[0] : 0)) / 16) + "%"; h.style.top = ((M[1] + (on ? PAN[1] : 0)) / 9) + "%"; show(); };
  let from = [0, 0];
  const h = handle(ctx, M, "Standard mass, 200.0 g: drag it onto the pan or off again", {
    start: () => { art.touched("standard-mass"); from = on ? PAN : [0, 0]; },
    move: (dx, dy) => art.set("standard-mass", { dx: from[0] + dx, dy: from[1] + dy }),
    end: (dx, dy) => {
      const x = (M[0] + M[2]) / 2 + from[0] + dx, tap = Math.hypot(dx, dy) < 12;
      place(tap ? !on : x < 1150); msg();
    },
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
