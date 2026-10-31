// D02 p12 "The Zodiac": 13 constellation cards stand in a ring around the Sun and Earth; drag Earth around its orbit and the Sun lines up in front of each card in turn, Ophiuchus included.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L12-2.webp",[0.0,10.452,17.875,34.71]],["v2/L12-5.webp",[61.0,45.677,9.0,18.581]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.sun(0.7); const orbit = K.ring(3, P.gold); const earth = K.ball(0.3, "earth");
  const zod = ["Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpius", "Ophiuchus", "Sagittarius", "Capricornus", "Aquarius"], cards = [];
  zod.forEach((z, i) => { const a = i / 13 * 6.28, c = K.card(1.5, 0.9, { pos: [Math.cos(a) * 8, 0.5, Math.sin(a) * 8] }); c.lookAt(0, 0.5, 0); const l = ctx.label(z, [0, 0, 0.05], { layer: "mid", h: 0.3, color: i === 9 ? P.goldCss : undefined }); c.add(l); K.sk(l); cards.push(c); });
  const sight = K.add(K.line([V(), V()], P.gold, { dash: 0.2 }));
  const inL = K.tag("", { h: 0.3 }); K.label("13 constellations, not 12", [0, 2.6, 0], { h: 0.36 });
  const drag = K.scrub(5), cam = K.cam([0, 2.2, 6.5], [0, 0, 0], 0.2);
  return { update(t) { cam(t); const a = K.tick(t) * 0.15 + drag.v, e = V(Math.cos(a) * 3, 0, Math.sin(a) * 3); earth.position.copy(e);
    const dir = e.clone().negate().normalize(), far = dir.clone().multiplyScalar(8); K.setLine(sight, [e, far]);
    const idx = ((Math.round((Math.atan2(far.z, far.x) / 6.28) * 13) % 13) + 13) % 13; cards.forEach((c, i) => (c.position.y = i === idx ? 0.9 : 0.5)); }, dispose() {} };
}
