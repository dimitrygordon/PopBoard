// Newton's Mountain VR: every default and tunable in one place (spec_v1 section 14.1, recommended answers).
// Mr. Dimitry's open questions are answered here with the spec's recommendation. Change a value here and every
// part of the module follows. Earth GM and R are imported from the Tesla-cleared 2D module, never retyped.
import { GM_E, R_E, H_DEFAULT, V_MAX } from "../newtons-cannonball-fire/ncf-config.js";

export const NM_CONFIG = {
  // Q1 constants: "lesson" = textbook pair (matches Orbit Lab and the 2D module), "real" = WGS 84 GM and IUGG mean radius.
  consts: "lesson",
  CONSTS: {
    lesson: { GM: GM_E, R: R_E },
    real: { GM: 3.986004418e14, R: 6.371e6 },
  },
  // Q2 mountain height: 150 km, choices below. 8 km is the "why must it be tall" extension.
  heightsKm: [8, 50, 100, 150, 250, 400, 1000],
  defaultHeightKm: H_DEFAULT / 1000,
  // Q3 who unlocks the numbers: Mr. Dimitry, by link (help=2). No button in the sandbox reaches level 2.
  helpDefault: 0,
  helpLevels: [0, 1, 2],
  // Launch speed
  speedDefault: 2000, speedMax: V_MAX, speedMin: 0,
  coarseStep: 100, fineStep: 1,
  // Integrator (spec 8.3)
  dt: 0.5, stepCapPerFrame: 4000,
  endRadii: 100,        // a shot that passes 100 Earth radii "left Earth's neighbourhood"
  endDays: 7,           // or reaches 7 sim days
  warpLadder: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
  smartPaceSeconds: 12, smartPaceCapS: 6000,
  maxShots: 8,
  // Air (B1, default off). Ball: 0.2 m across, Cd 0.47, mass from iron (7,870 kg/m^3).
  ball: { diameterM: 0.2, cd: 0.47, massKg: 33, massChoices: [1, 33, 1000] },
  airDefault: false,
  gdialDefault: 100,
  // Model view sizes (cm across)
  sizeVr: [25, 50, 100], sizeVrDefault: 50,
  sizeAr: [15, 30, 60, 120], sizeArDefault: 30,
  // Reference rings (B6)
  rings: { iss: 400e3, geo: 35786e3, moon: 384400e3 },
  moonRadiusM: 1737.4e3,
  // Scene (spec 7.5)
  rig: { cannonX: 2.0, baseZ: -0.5, muzzleZ: -1.5, muzzleY: 1.1, platformCentre: [1.0, -0.25], platformRadius: 2.0, fadeHeadM: 1.5, fadeHandM: 0.5 },
  // Sun direction in the flight plane frame: (up at cannon, along the barrel, out of the plane). Fixed.
  sunPlane: [0.55, 0.55, 0.63],
  // Ball and trail look (spec 12): minimum angular sizes in degrees
  ballMinDeg: 0.4, trailDeg: 0.3,
  // Cannon over this point of the Earth map (degrees). Cosmetic: Earth does not spin in this model.
  cannonLatLon: [30, -40],
  // Okabe-Ito based palette, colour-blind safe. Colour never means the outcome.
  palette: ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#BBBBBB"],
};
