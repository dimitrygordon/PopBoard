// D02 p16 "Solstices and Equinoxes": four Earth positions with date flags sit on the orbit ring; drag to slide Earth to each flag, its tilt fixed toward Polaris.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.sun(0.9); K.ring(6, P.gold);
  const spots = [["June solstice", Math.PI], ["Sept equinox", 3 * Math.PI / 2], ["Dec solstice", 0], ["March equinox", Math.PI / 2]];
  spots.forEach(([n, a]) => { const p = [Math.cos(a) * 6, 0, Math.sin(a) * 6]; const f = K.add(K.line([V(p[0], 0, p[2]), V(p[0], 1.6, p[2])], P.ink)); K.label(n, [p[0], 1.9, p[2]], { layer: "mid", h: 0.4, color: P.goldCss }); });
  const e = K.tiltedEarth(0.55); K.notToScale();
  const drag = K.scrub(4, 0, 0, 3.99), cam = K.cam([0, 6, 15], [0, -0.5, 0], 0.2); let cur = Math.PI;
  return { update(t, dt) { cam(t); const i = drag.touched ? Math.floor(drag.v) : Math.floor((RM ? 0 : t * 0.25) % 4); let want = spots[i][1]; let d = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; cur += d * Math.min(1, dt * 3 || 1);
    e.position.set(Math.cos(cur) * 6, 0, Math.sin(cur) * 6); e.userData.spin.rotation.y += dt; }, dispose() {} };
}
