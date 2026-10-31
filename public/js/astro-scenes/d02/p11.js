// D02 p11 "The Ecliptic": the tilted ecliptic hoop and the celestial equator hoop wrap around you through zodiac cutouts; drag to slide the Sun along the ecliptic through Pisces, Aries and Taurus.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const eq = K.hoop(9, 0.03, P.blue), ecl = K.hoop(9, 0.04, P.gold, { tilt: 23.4 * Math.PI / 180 });
  K.ball(0.35, "earth", { pos: [0, -1.4, -1.5] });
  const zod = ["Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpius", "Ophiuchus", "Sagittarius", "Capricornus", "Aquarius"];
  const pos = (a) => V(Math.cos(a) * 9, 0, Math.sin(a) * 9).applyAxisAngle(V(1, 0, 0), -23.4 * Math.PI / 180);
  zod.forEach((z, i) => { const p = pos(i / 13 * 6.28 - 0.3).multiplyScalar(1.12); K.label(z, p.toArray(), { layer: "mid", h: 0.42 }); });
  const sun = K.sun(0.5); K.label("celestial equator", [0, -1.2, -9], { layer: "mid", h: 0.4, color: P.blueCss }); K.label("ecliptic: the Sun's yearly path", [0, 1.4, 0], { h: 0.3, color: P.goldCss });
  const drag = K.scrub(4), cam = K.cam([0, 3, 3], [0, -0.5, -9], 0.2);
  return { update(t) { const a = -0.3 + K.tick(t) * 0.05 + drag.v; sun.position.copy(pos(a)); cam(t); }, dispose() {} };
}
