// D02 p18 "Check for Understanding: No Tilt?": two Earths side by side, one straight up and one tilted 23.4°; prompt cards flip to reveal.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L18-4.webp",[32.562,38.192,16.562,51.957]],["v2/L18-6.webp",[0.0,41.7,10.625,57.76]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Earth with 0° tilt: still seasons?", art: ART, items: ["Real Earth: 23.4° tilt", "Pretend Earth: 0° tilt"], backs: ["Light patch changes all year: seasons", "Same light all year: no seasons"],
    extra: (K) => { const a = K.tiltedEarth(0.5, 23.4, { pos: [-4.7, 1.0, 0.4] }), b = K.tiltedEarth(0.5, 0, { pos: [-4.7, -0.6, 0.4] }); } });
}
