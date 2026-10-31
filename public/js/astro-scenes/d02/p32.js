// D02 p32 "The Standards Behind This Lesson": the standards cards sketch in and tilt gently.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L32-6.webp",[0.188,73.664,12.25,11.082]],["v2/L32-4.webp",[0.188,16.167,11.188,11.082]],["v2/L32-1.webp",[79.0,0.0,6.75,12.777]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "The standards behind this lesson", kind: "standards", art: ART, items: ["ES.4.7: tides from Sun and Moon gravity", "ES.4.6: tilt, wobble, orbit shape and ice ages", "ES.2.5: how science changes"] });
}
