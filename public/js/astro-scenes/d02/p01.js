// D02 p01 "What Can the Sky Tell Us Without a Telescope?": you stand under a wire sky dome at Vincennes while star trails wheel counterclockwise around Polaris; the Big Dipper points the way.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L01-1.webp",[0.0,0.0,22.875,100.0]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const dome = K.add(K.dome(12), "mid");
  const spin = K.poleFrame(38.7); K.sk(spin);
  const n = K.phone ? 40 : 90, trails = [];
  for (let i = 0; i < n; i++) { const r = 0.6 + Math.random() * 10, y = Math.sqrt(Math.max(0, 140 - r * r)), a0 = Math.random() * 6.28, pts = [];
    for (let k = 0; k <= 24; k++) { const a = a0 + k / 24 * 0.9; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); } const l = K.line(pts, i % 5 ? P.ink : P.gold, { opacity: 0.7 }); spin.add(l); trails.push(l); }
  const polaris = new T.Mesh(new T.OctahedronGeometry(0.16, 0), new T.MeshBasicMaterial({ color: P.gold })); polaris.position.set(0, 11.6, 0); spin.parent.add(polaris);
  const dip = K.add(K.dipper(0.7), "mid"); dip.position.set(-6.2, 7.2, -8.5); dip.rotation.z = -0.5;
  K.label("Polaris", [0, 7.6, -11.6], { layer: "mid", h: 0.6, color: P.goldCss });
  K.label("Big Dipper points the way", [-4.8, 5.9, -8.5], { layer: "mid", h: 0.45 });
  K.title("What can the sky tell us without a telescope?", [0, -1.0, 0]);
  const cam = K.cam([0, 1.2, 3], [0, 5.5, -10], 0.2), drag = K.scrub(2);
  return { update(t) { cam(t); K.turnSky(spin, K.tick(t) * 0.05 + drag.v); }, dispose() {} };
}
