// D02 p07 "Asterisms": the Ursa Major outline stands on a far layer; the seven Big Dipper stars lift toward you, then drop back to show they are just part of the bear.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const bearPts = [[-3, 1.5], [-1.5, 1.6], [0, 1.2], [1.2, 1.0], [1.4, 0.2], [2.6, 0.1], [2.8, 0.9], [3.8, -0.8], [2.4, -1.6], [0.4, -1.6], [-0.6, -0.4], [-2, 0.4], [-3, 1.5]];
  const bear = K.add(K.line(bearPts.map(([x, y]) => V(x * 1.4, y * 1.4, -4)), P.blue, { dash: 0.2 }));
  K.label("Ursa Major (constellation)", [0, -2.9, -4], { layer: "mid", h: 0.45, color: P.blueCss });
  const dip = K.add(K.dipper(0.9)); dip.position.set(-2.4, 1.9, 0);
  K.label("Big Dipper (asterism)", [-0.3, 2.6, 0], { h: 0.36, color: P.goldCss });
  K.label("just 7 stars of the Great Bear", [-0.3, -1.6, 0], { h: 0.3 });
  const drag = K.scrub(4, 0, 0, 1), cam = K.cam([0, 0.3, 9], [0, 0.3, -1], 0.3);
  return { update(t) { cam(t); const lift = 1 - drag.v; dip.position.z = -4 * (1 - lift) + (RM ? 0 : Math.sin(t) * 0.1); }, dispose() {} };
}
