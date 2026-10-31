// D02 p10 "Polaris and Latitude": a curved Earth with an observer peg and a sightline to Polaris; drag the observer from equator to pole and Polaris climbs until its altitude equals the latitude (39° at Vincennes).
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L10-5.webp",[4.562,43.396,19.375,56.604]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const earth = K.ball(2.4, "earth", { pos: [0, -1, -1] });
  K.add(K.line([V(0, -1, -1), V(0, 4, -1)], P.gold, { dash: 0.15 }));
  const peg = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.5, 6), K.flat(P.red)); body.position.y = 0.25; peg.add(body); K.add(peg);
  const horizon = K.line([V(-1.2, 0, 0), V(1.2, 0, 0)], P.ink); peg.add(horizon);
  const sight = K.add(K.line([V(), V(0, 5, 0)], P.gold));
  const latL = K.tag("latitude 39°", { h: 0.32, color: P.goldCss }), altL = K.tag("Polaris altitude 39°", { h: 0.32, color: P.goldCss });
  K.label("Polaris is far away: every sightline is parallel", [0, 2.6, 0], { h: 0.3 }); K.label("Earth's axis to Polaris", [0.4, 3.4, -1], { layer: "mid", h: 0.28 });
  K.notToScale([3.2, -2.2, 0]);
  const drag = K.scrub(-120, 38.7, 0, 90), cam = K.cam([2.6, 0.8, 13], [0.5, 0.4, -1], 0.2);
  return { update(t) { cam(t); const lat = drag.touched ? drag.v : 38.7 + (RM ? 0 : Math.sin(t * 0.3) * 30), L = lat * Math.PI / 180;
    const p = V(Math.cos(L) * 2.4, Math.sin(L) * 2.4 - 1, -1); peg.position.copy(p); peg.rotation.z = -(Math.PI / 2 - L);
    K.setLine(sight, [p, p.clone().add(V(0, 3, 0))]); const d = Math.round(lat); latL.material && (latL.userData.v = d);
    K.at(latL, p, 1.2, -0.4); K.at(altL, p, 0.6, 1.2); }, dispose() {} };
}
