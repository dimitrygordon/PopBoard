// D02 p04 "Part 1: The Sky Above": you lie on your back under a starry dome that turns very slowly overhead.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.add(K.dome(11, { lines: 8 }), "mid");
  const spin = K.poleFrame(38.7);
  spin.add(K.specks(K.phone ? 160 : 420, () => { const u = Math.random() * 0.95 + 0.05, th = Math.random() * 6.28, s = Math.sqrt(1 - u * u); return [s * Math.cos(th) * 10.6, u * 10.6 - 2, s * Math.sin(th) * 10.6]; }, P.ink, 0.1)); K.sk(spin);
  K.title("Part 1: The Sky Above", [0, 0.9, -4]);
  K.label("the sky looks like a dome", [0, 0.3, -4], { h: 0.3, color: P.blueCss });
  const cam = K.cam([0, 0.6, 2], [0, 2.4, -6], 0.15);
  return { update(t) { cam(t); K.turnSky(spin, K.tick(t) * 0.02); }, dispose() {} };
}
