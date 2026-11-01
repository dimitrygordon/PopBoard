// Which zeros count? Tap a number to step through its digits; each tap says whether that digit is
// significant and why. The third number shows scientific notation removing the doubt about 172,000.
import { add, fontPx, handle } from "../kit.js";
const N = {
  "number-1": { text: "0.0860 m", digits: [["0", false, "leading zero: only places the decimal point"], ["0", false, "leading zero: only places the decimal point"], ["8", true, "nonzero digit: always significant"], ["6", true, "nonzero digit: always significant"], ["0", true, "last zero: the estimated digit, so it counts"]], total: "0.0860 m has 3 significant figures." },
  "number-2": { text: "172,000 m", digits: [["1", true, "nonzero digit"], ["7", true, "nonzero digit"], ["2", true, "nonzero digit"], ["0", null, "this zero may or may not be measured"], ["0", null, "this zero may or may not be measured"], ["0", null, "this zero may or may not be measured"]], total: "172,000 m could have 3, 4, 5 or 6 significant figures. There is no way to tell!" },
  "number-3": { text: "1.7200 \u00d7 10\u2075 m", digits: [["1", true, "nonzero digit"], ["7", true, "nonzero digit"], ["2", true, "nonzero digit"], ["0", true, "written in scientific notation, so it was measured"], ["0", true, "written in scientific notation, so it was measured"]], total: "1.7200 \u00d7 10\u2075 m clearly has 5 significant figures." },
};
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [130, 790, 1000, 860], "Tap a number."), 26);
  const at = {};
  for (const id of Object.keys(N)) {
    at[id] = -1;
    handle(ctx, art.box(id), `${N[id].text}: tap to check its digits`, {}).addEventListener("click", () => {
      art.touched(id); const n = N[id]; at[id] = (at[id] + 1) % (n.digits.length + 1);
      if (at[id] === n.digits.length) { cap.textContent = n.total; return say(n.total, true); }
      const [d, sig, why] = n.digits[at[id]];
      cap.textContent = `Digit ${at[id] + 1} of ${n.text}: "${d}"`;
      say(`${sig === true ? "Significant" : sig === false ? "Not significant" : "Can't tell"}: ${why}. Tap again for the next digit.`, sig === null ? undefined : sig);
    });
  }
  art.touchable(Object.keys(N));
  ui.button("Start over", () => { for (const k in at) at[k] = -1; cap.textContent = "Tap a number."; say(""); });
  return { destroy() {} };
}
