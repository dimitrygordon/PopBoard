// D02 p13 "Check for Understanding: Fort Wayne": four answer cards stand up, wobble and flip to reveal when picked: Polaris at 41° means latitude 41° N.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  return cardsPage(ctx, { title: "Polaris is 41° up in Fort Wayne. Latitude?", art: ART, items: ["A) 41° N", "B) 49° N", "C) 23.4° N", "D) need a telescope"], backs: ["Yes! altitude = latitude", "No: that is 90° minus 41°", "No: that is Earth's tilt", "No: your eyes and an angle do it"] });
}
