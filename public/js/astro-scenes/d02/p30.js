// D02 p30 "Exit Ticket": three prompt cards fold up one at a time while a pencil taps beside each.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L30-7.webp",[77.938,71.835,12.062,18.35]],["v2/L30-2.webp",[81.062,9.104,9.375,21.479]],["v2/L30-6.webp",[0.125,71.408,8.375,20.057]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Exit ticket", kind: "exit", art: ART, items: ["1. Phases without Earth's shadow", "2. Why no solar eclipse every new Moon?", "3. Full Moon tonight: spring or neap?"] });
}
