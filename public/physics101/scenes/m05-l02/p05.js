// Measuring kinetic friction: tap to stack blocks 1 to 8; the readings are Table 1 (block on sandpaper).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { k: 1, T: [["0.98", "0.53"], ["1.96", "0.95"], ["2.94", "1.4"], ["3.92", "1.8"], ["4.90", "2.3"], ["5.88", "3.1"], ["6.86", "3.3"], ["7.84", "4.0"]] },
    sliders: [],
    cuts: [
    { id: "stack", label: "Stack blocks: tap to add one", tap: (st) => { st.k = st.k % 8 + 1; return `${st.k} block${st.k > 1 ? "s" : ""}: ${st.T[st.k - 1][0]} newtons normal force, ${st.T[st.k - 1][1]} newtons of friction.`; } }],
    show: (st) => { const r = st.T.slice(0, st.k).map((t, i) => `${i + 1}: ${t[0]} N, ${t[1]} N`); return "blocks: F_N, f_k\n" + r.slice(-4).join("\n"); },
    box: [560, 640, 1000, 840], px: 20,
  });
  ctx.art.touchable(["stack"]);
  return { destroy() {} };
}
