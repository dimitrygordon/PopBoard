// D02 p29 "Your Turn: Tide Model": two sketch frames lie on a tilted desk with Sun and Earth standing ready for you to draw the Moon and the bulges.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L29-7.webp",[50.75,54.88,9.188,18.758]],["v2/L29-8.webp",[24.938,56.147,7.875,16.223]],["v2/L29-9.webp",[72.562,56.274,7.875,15.97]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Your turn: draw spring and neap tides", kind: "standards", art: ART, items: ["Frame 1: spring tide", "Frame 2: neap tide", "Label the Moon, bulges, high and low"],
    extra: (K) => { K.sun(0.35, [-4.8, 1.2, 0.6], { layer: "mid" }); K.ball(0.25, "earth", { pos: [-4.8, 0.1, 0.6] }); } });
}
