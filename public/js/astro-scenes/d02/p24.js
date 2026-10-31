// D02 p24 "Check for Understanding: Which Phase?": answer cards stand up, wobble and flip: a lunar eclipse can only happen at full Moon.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L24-6.webp",[4.438,51.307,13.312,29.436]],["v2/L24-7.webp",[28.312,51.307,13.312,29.436]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Which phase can have a lunar eclipse?", art: ART, items: ["A) new", "B) first quarter", "C) full", "D) third quarter"], backs: ["No: Moon is toward the Sun", "No: off to the side", "Yes! behind Earth, in its shadow", "No: off to the side"] });
}
