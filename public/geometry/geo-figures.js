// Geometry course: every static lesson figure by id (the "fig" field of a lesson). Figures draw on a
// 1000 x 700 board. To replace one with hand-drawn art, list it in geometry/art/manifest.json instead.
import { FIGS as A } from "./geo-figures-a.js";
import { FIGS as B } from "./geo-figures-b.js";
import { FIGS as C } from "./geo-figures-c.js";
export const FIG_W = 1000, FIG_H = 700;
export const FIGS = { ...A, ...B, ...C };
