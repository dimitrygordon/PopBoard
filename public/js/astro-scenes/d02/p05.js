// D02 p05 "The Celestial Sphere": a wire sky ball surrounds a small Earth, with the NCP and SCP marked; drag to spin the sphere about its axis while you look around from inside.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const earth = K.tiltedEarth(0.6, 0);
  const sph = new T.Group(); K.add(sph);
  for (let i = 0; i < 8; i++) { const m = K.line(K.ringPts(11, 72), P.blue, { opacity: 0.4 }); m.rotation.z = Math.PI / 2; m.rotation.y = i / 8 * Math.PI; sph.add(m); }
  for (const d of [-60, -30, 0, 30, 60]) { const r = 11 * Math.cos(d * Math.PI / 180), l = K.line(K.ringPts(r, 72, 11 * Math.sin(d * Math.PI / 180)), d ? P.blue : P.gold, { opacity: d ? 0.4 : 1 }); sph.add(l); }
  sph.add(K.specks(K.phone ? 80 : 200, () => { const u = Math.random() * 2 - 1, th = Math.random() * 6.28, s = Math.sqrt(1 - u * u); return [s * Math.cos(th) * 11, u * 11, s * Math.sin(th) * 11]; }, P.ink, 0.14));
  const axis = K.add(K.line([V(0, -12, 0), V(0, 12, 0)], P.gold, { dash: 0.3 }));
  K.label("NCP", [0.5, 11.4, 0], { layer: "mid", h: 0.6, color: P.goldCss }); K.label("SCP", [0.5, -11.4, 0], { layer: "mid", h: 0.6, color: P.goldCss });
  K.label("celestial equator", [6.2, 0.6, -8.5], { layer: "mid", h: 0.45, color: P.goldCss });
  K.label("Earth", [0, -0.95, 0], { layer: "mid", h: 0.3 });
  const drag = K.scrub(3), cam = K.cam([0, 1.5, 8], [0, 1.2, 0], 0.2);
  return { update(t, dt) { cam(t); sph.rotation.y = -K.tick(t) * 0.05 + drag.v; earth.userData.spin.rotation.y += dt * 0.3; }, dispose() {} };
}
