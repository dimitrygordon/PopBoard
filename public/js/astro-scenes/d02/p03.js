// D02 p03 "Today I Can": four goal tabs fold up one by one and each gets a hand-drawn check.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L03-2.webp",[1.0,12.376,8.375,19.061]],["v2/L03-5.webp",[1.5,59.602,7.75,17.496]],["v2/L03-6.webp",[0.188,87.198,10.625,11.949]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Today I can...", kind: "goals", art: ART, items: ["use Polaris to find my latitude", "explain seasons with Earth's 23.4° tilt", "explain Moon phases and rare eclipses", "explain daily, spring and neap tides"] });
}
