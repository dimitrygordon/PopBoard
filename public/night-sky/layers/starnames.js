// Bright star names (S14): the 50 brightest stars that have a proper name in HYG. Separate from constellation names.
import { SKY_R, apply } from "../ns-util.js";
import { TextBillboards } from "../ns-labels.js";

export const STARNAMES_CONFIG = { count: 50 };

export function starNamesLayer() {
  let labels, idx = [];
  return {
    id: "starnames",
    init(ctx) {
      const { THREE, catalog, skin } = ctx; const s = catalog.stars;
      for (let i = 0; i < s.n && idx.length < STARNAMES_CONFIG.count; i++) if (s.proper(i)) idx.push(i);
      labels = new TextBillboards(THREE, idx.map((i) => ({ lines: [{ text: s.proper(i), font: skin.starNames.font, color: skin.starNames.color }] })), { radius: SKY_R - 40, capDeg: skin.starNames.capDeg, refPx: 30, anchor: "right-of", offsetDeg: 0.45 });
      ctx.skyRoot.add(labels.mesh);
    },
    update(ctx) {
      const st = ctx.state; labels.mesh.visible = st.starnames;
      if (!st.starnames) return;
      const s = ctx.catalog.stars, M = ctx.frame.M;
      labels.update(idx.map((i) => { const d = apply(M, s.starVec(i)); return (st.ground && d[1] < -0.01) || s.mag[i] > st.mag ? null : d; }), ctx.frame.fallbackUp);
    },
    setVisible(on) { labels.mesh.visible = on; },
    dispose() { labels.dispose(); },
  };
}
export const starNameIndices = (catalog, n = STARNAMES_CONFIG.count) => { const out = []; for (let i = 0; i < catalog.stars.n && out.length < n; i++) if (catalog.stars.proper(i)) out.push(i); return out; };
