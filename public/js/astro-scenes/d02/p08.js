// D02 p08 "Diurnal Motion": you stand on a horizon facing Polaris; star layers turn counterclockwise and draw pencil trails. Drag sideways to turn the clock hand and the sky.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L08-7.webp",[62.625,44.266,7.562,15.166]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const ground = K.add(new T.Mesh(new T.CircleGeometry(14, K.phone ? 24 : 48), K.flat(P.paper, 0.9))); ground.rotation.x = -Math.PI / 2; ground.position.y = -1;
  const spin = K.poleFrame(38.7); K.sk(spin);
  const stars = [], trails = [], n = K.phone ? 30 : 70;
  for (let i = 0; i < n; i++) { const r = 0.5 + Math.random() * 7, y = 11, a0 = Math.random() * 6.28; const s = new T.Mesh(new T.OctahedronGeometry(0.06, 0), new T.MeshBasicMaterial({ color: P.ink })); s.position.set(Math.cos(a0) * r, y, Math.sin(a0) * r); spin.add(s); stars.push({ r, a0, y });
    const tr = K.line(Array.from({ length: 41 }, (_, k) => V(Math.cos(a0 + k / 40 * 6.28) * r, y, Math.sin(a0 + k / 40 * 6.28) * r)), P.ink, { opacity: 0.4 }); tr.geometry.setDrawRange(0, 1); spin.add(tr); trails.push(tr); }
  const pol = new T.Mesh(new T.OctahedronGeometry(0.15, 0), new T.MeshBasicMaterial({ color: P.gold })); pol.position.set(0, 11, 0); spin.add(pol);
  K.label("Polaris", [0, 7.7, -8.8], { layer: "mid", h: 0.5, color: P.goldCss }); K.label("north horizon", [0, -0.6, -8], { layer: "mid", h: 0.4 });
  const hand = K.arrow(P.gold, { r: 0.04, layer: "fg" }); const clock = K.add(K.line(K.ringPts(0.8, 40).map((p) => V(p.x, p.z, 0)), P.ink), "fg"); clock.position.set(3.2, -1.4, 0);
  K.label("counterclockwise", [3.2, -0.3, 0], { h: 0.26, color: P.blueCss });
  const drag = K.scrub(6), cam = K.cam([0, 0.2, 4], [0, 5, -9], 0.15);
  return { update(t) { cam(t); const a = K.tick(t) * 0.12 + drag.v; K.turnSky(spin, a); const k = Math.min(40, Math.floor(Math.abs(a) / 6.28 * 40) + 2); trails.forEach((tr) => tr.geometry.setDrawRange(0, k));
    hand.userData.set(V(3.2, -1.4, 0), V(Math.sin(-a * 2), Math.cos(-a * 2), 0), 0.6); }, dispose() {} };
}
