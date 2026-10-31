// D02 p06 "Constellations": a curved sky-map wall wraps around you with dotted borders; drag across it and the region in front lifts out while Ursa Major joins up star by star.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L06-3.webp",[0.0,10.931,21.125,36.437]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const regions = [], N = 6, R = 9;
  const names = ["Ursa Major", "Draco", "Cassiopeia", "Cepheus", "Leo", "Bootes"];
  for (let i = 0; i < N; i++) { const a0 = -1.2 + i * 0.4, g = new T.Group(), pts = [];
    for (let k = 0; k <= 8; k++) { const a = a0 + k / 8 * 0.4; pts.push(V(Math.sin(a) * R, -2.5, -Math.cos(a) * R)); }
    for (let k = 8; k >= 0; k--) { const a = a0 + k / 8 * 0.4; pts.push(V(Math.sin(a) * R, 3.5, -Math.cos(a) * R)); } pts.push(pts[0].clone());
    g.add(K.line(pts, P.blue, { dash: 0.2 })); const c = a0 + 0.2;
    g.add(K.specks(6, () => { const a = c + (Math.random() - 0.5) * 0.3; return [Math.sin(a) * (R - 0.1), Math.random() * 5 - 2.2, -Math.cos(a) * (R - 0.1)]; }, P.ink, 0.16));
    K.add(g); regions.push({ g, c }); K.label(names[i], [Math.sin(c) * (R - 0.5), 3.0, -Math.cos(c) * (R - 0.5)], { layer: "mid", h: 0.4 }); }
  const bear = K.dipper(0.45); regions[0].g.add(bear); bear.position.set(Math.sin(regions[0].c) * (R - 0.2) - 0.9, 0.6, -Math.cos(regions[0].c) * (R - 0.2)); bear.rotation.y = -regions[0].c;
  K.title("88 official regions of the sky", [0, -1.8, 0]);
  let sel = 0; ctx.onDrag(({ x }) => { sel = Math.max(0, Math.min(N - 1, Math.round(x * (N - 1)))); });
  const cam = K.cam([0, 0.5, 2], [0, 0.4, -9], 0.2);
  return { update(t, dt) { cam(t); regions.forEach((r, i) => { const want = i === sel ? 1.2 : 0; r.g.position.x += (Math.sin(r.c) * -want - r.g.position.x) * Math.min(1, dt * 4 || 1); r.g.position.z += (Math.cos(r.c) * want - r.g.position.z) * Math.min(1, dt * 4 || 1); });
    const k = Math.max(2, Math.floor(Math.min(1, K.RM ? 1 : (t - 1) / 3) * 8)); bear.children[0].geometry.setDrawRange(0, k); }, dispose() {} };
}
