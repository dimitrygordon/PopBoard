// Prefix slider: drag the gold knob along the rail from femto to tera; the same length re-renders as
// a number times the prefixed unit, and the power of ten changes with it.
import { add, handle, fontPx } from "../kit.js";
const PR = [["femto", "f", -15], ["pico", "p", -12], ["nano", "n", -9], ["micro", "\u00b5", -6], ["milli", "m", -3], ["centi", "c", -2], ["base", "", 0], ["kilo", "k", 3], ["mega", "M", 6], ["giga", "G", 9], ["tera", "T", 12]];
const X0 = 176, STEP = 134.4, HOME = 6; // rail stop i sits at X0 + i * STEP; the knob starts on "base"
const sup = (e) => String(e).replace("-", "\u2212").split("").map((c) => "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"["0123456789".indexOf(c)] || "\u207b").join("");
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [380, 700, 1220, 790], ""), 32); cap.style.textAlign = "center";
  let at = HOME;
  const go = (i) => {
    at = Math.max(0, Math.min(10, i)); const [nm, sy, e] = PR[at];
    art.set("knob", { dx: (at - HOME) * STEP }); h.style.left = ((X0 + at * STEP - 50) / 16) + "%";
    cap.textContent = e === 0 ? "1 m = 1 m (no prefix: the base unit)" : `1 m = 10${sup(-e)} ${sy}m   (${nm}: 1 ${sy}m = 10${sup(e)} m)`;
    sl.set(at);
  };
  const sl = ui.slider({ label: "Prefix", min: 0, max: 10, step: 1, value: HOME, fmt: (v) => PR[v][0] }, (v) => { go(v); say(`${PR[v][0]}: the number and the unit change together by a power of ten.`, true); });
  let x0 = 0;
  const h = handle(ctx, [X0 + HOME * STEP - 50, 510, X0 + HOME * STEP + 50, 610], "Prefix knob: move left or right", {
    start: () => { art.touched("knob"); x0 = X0 + at * STEP; },
    move: (dx) => { const x = Math.max(X0, Math.min(X0 + 10 * STEP, x0 + dx)); art.set("knob", { dx: x - (X0 + HOME * STEP) }); },
    end: (dx) => { go(Math.round((Math.max(X0, Math.min(X0 + 10 * STEP, x0 + dx)) - X0) / STEP)); say(`${PR[at][0]}: the number and the unit change together by a power of ten.`, true); },
  });
  h.setAttribute("role", "slider");
  art.touchable(["knob"]);
  go(HOME);
  return { destroy() {} };
}
