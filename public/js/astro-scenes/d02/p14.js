// D02 p14 "Part 2: The Sun's Year": a tilted Earth drifts along a faint orbit arc that wraps around you, its axis fixed toward Polaris.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L14-1.webp",[63.062,13.477,25.062,86.523]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.sun(0.8, [0, 0, -9]); K.ring(9, P.gold, { pos: [0, -0.4, -9], opacity: 0.5 });
  const e = K.tiltedEarth(0.5); K.label("tilt stays pointed at Polaris", [0, -1.5, 0], { h: 0.3, color: P.goldCss });
  K.title("Part 2: The Sun's Year", [0, 2.2, 0]); K.notToScale();
  const cam = K.cam([0, 0.6, 9], [0, -0.2, -6], 0.2);
  return { update(t, dt) { cam(t); const a = Math.PI / 2 - 0.25 + K.tick(t) * 0.03; e.position.set(Math.cos(a) * 9, -0.4, Math.sin(a) * 9 - 9); e.userData.spin.rotation.y += dt * 1.5; }, dispose() {} };
}
