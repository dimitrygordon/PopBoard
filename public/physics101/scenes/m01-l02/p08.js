// Read the ruler: drag the pen so its tip sits just past a millimeter mark, read the certain digits from
// the ticks, then pick the estimated tenth. The pen's tip starts at 138.1 mm, as in the lesson.
import { add, handle, fontPx } from "../kit.js";
const X0 = 432, MM = 64, TIP0 = X0 + 10.1 * MM; // ruler starts at 128 mm; 64 page px per millimeter
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const home = art.box("pen"); let ox = 0, ox0 = 0;
  const reading = () => 128 + (TIP0 + ox - X0) / MM; // true tip position in mm
  const cap = fontPx(add(layer, "div", "cap", [330, 215, 1310, 290], ""), 26); cap.style.textAlign = "center";
  const upd = () => { cap.textContent = `The tip is past the ${Math.floor(reading() + 1e-9)} mm mark. Certain digits: ${Math.floor(reading() + 1e-9)}. Now estimate the tenth.`; };
  const h = handle(ctx, home, "Pen: drag left or right along the ruler", {
    start: () => { art.touched("pen"); ox0 = ox; },
    move: (dx) => { ox = Math.max(-8.5 * MM, Math.min(1.5 * MM, ox0 + dx)); art.set("pen", { dx: ox }); upd(); },
    end: () => { h.style.left = ((home[0] + ox) / 16) + "%"; upd(); say("Read the last full millimeter you can see, then estimate how far past it the tip goes."); },
  });
  let guess = 0;
  const est = ui.slider({ label: "Your estimate of the tenth", min: 0, max: 9, step: 1, value: 0, fmt: (v) => "0." + v + " mm" }, (v) => (guess = v));
  ui.button("Record my measurement", () => {
    const r = reading(), whole = Math.floor(r + 1e-9), tenth = Math.round((r - whole) * 10) % 10, mine = `${whole}.${guess}`;
    const close = Math.abs(guess - tenth) <= 1;
    say(close ? `${mine} mm: four significant figures. ${whole} is certain; the last digit, ${guess}, is your estimate.` : `${mine} mm? Look again: the tip is about ${tenth} tenths past ${whole}. The last digit is an estimate, but it should be a careful one.`, close);
  });
  ui.button("Start over", () => { ox = 0; art.set("pen", { dx: 0 }); h.style.left = (home[0] / 16) + "%"; guess = 0; est.set(0); upd(); say(""); });
  art.touchable(["pen"]);
  upd();
  return { destroy() {} };
}
