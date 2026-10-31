// D02 p17 "Precession": a tilted Earth spins like a top while its axis traces a slow cone; Polaris and Vega hang above. Drag to scrub the 26,000 year dial.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L17-2.webp",[0.375,11.934,36.812,23.594]],["v2/L17-4.webp",[4.875,64.198,16.938,31.55]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const e = K.tiltedEarth(1.1, 0); const cone = K.add(K.cone(Math.tan(23.4 * Math.PI / 180) * 3, 3, P.gold, 0.12)); cone.position.y = 1.5; cone.rotation.x = Math.PI;
  const pol = K.ball(0.14, "sun", { pos: [-1.3, 3.2, 0] }), vega = K.ball(0.14, ["#cfe0ff", "#7fa6d9"], { pos: [1.3, 3.2, 0] });
  K.label("Polaris", [-1.3, 3.6, 0], { layer: "mid", h: 0.3, color: P.goldCss }); K.label("Vega", [1.3, 3.6, 0], { layer: "mid", h: 0.3, color: P.blueCss });
  const yr = K.tag("", { h: 0.34 }); const yrs = []; for (const y of [0, 6500, 13000, 19500]) { const s = K.label(`year ${y.toLocaleString("en-US")} of 26,000`, [0, -2.2, 0], { h: 0.34 }); s.visible = false; yrs.push(s); }
  const ring = K.add(K.line(K.ringPts(0.6, 48).map((p) => V(p.x, p.z, 0)), P.ink, {}), "fg"); ring.position.set(3.4, -1.6, 0); const hand = K.arrow(P.gold, { r: 0.03, layer: "fg" });
  const drag = K.scrub(6.28), cam = K.cam([0, 1.5, 13], [0, 0.8, 0], 0.25), tilt = 23.4 * Math.PI / 180;
  return { update(t, dt) { cam(t); const ph = Math.PI + K.tick(t) * 0.15 + drag.v; e.rotation.set(0, 0, 0); e.rotateY(-ph); e.rotateZ(tilt); e.userData.spin.rotation.y += dt * 6;
    const q = ((ph - Math.PI) % 6.28 + 6.28) % 6.28; yrs.forEach((s, i) => (s.visible = Math.floor(q / 6.28 * 4) === i)); hand.userData.set(V(3.4, -1.6, 0), V(Math.sin(q), Math.cos(q), 0), 0.45); }, dispose() {} };
}
