// Net force: tap the chip for the book's three cases (opposite, same direction, unequal) or set two pushers on a table, each -200 to +200 N (+ is your push direction, 1 px per N). The net force
// is their sum; the sandbox table is 20 kg and slides freely, so a = F_net / 20 kg.
import { svg, path, caption, tapCut, arrowD, BLUE, RED, f2 } from "../kit.js";
const X = 1270, Y = 820, CASES = [[100, -100], [100, 100], [200, -100]];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const s = svg(layer); const a1 = path(s, "", { stroke: BLUE, "stroke-width": 7 }), a2 = path(s, "", { stroke: BLUE, "stroke-width": 7 }), an = path(s, "", { stroke: RED, "stroke-width": 9 });
  const cap = caption(layer, [1000, 560, 1580, 660], 22);
  let A = 100, B = -100;
  const draw = (talk) => {
    const n = A + B; a1.setAttribute("d", arrowD(X, Y - 30, X + A, Y - 30, 14)); a2.setAttribute("d", arrowD(X, Y, X + B, Y, 14)); an.setAttribute("d", arrowD(X, Y + 40, X + n, Y + 40, 16));
    cap.textContent = `${A} N + (${B} N) = ${n} N\n${n === 0 ? "no acceleration" : `a = ${f2(n / 20, 1)} m/s\u00b2`}`;
    if (talk) say(n === 0 ? "Equal and opposite: the net force is zero, so the table stays at rest." : `Net force ${n} newtons, so the table accelerates in the ${n > 0 ? "positive" : "negative"} direction.`, true);
  };
  const sa = ui.slider({ label: "You", min: -200, max: 200, step: 50, value: 100, fmt: (v) => v + " N" }, (v) => { A = v; draw(true); });
  const sb = ui.slider({ label: "Your friend", min: -200, max: 200, step: 50, value: -100, fmt: (v) => v + " N" }, (v) => { B = v; draw(true); });
  let c = 0;
  tapCut(ctx, "pushers", "Pushers: tap for the next textbook case", () => { c = (c + 1) % 3; [A, B] = CASES[c]; sa.set(A); sb.set(B); draw(true); });
  ctx.art.touchable(["pushers"]); draw(false);
  return { destroy() {} };
}
