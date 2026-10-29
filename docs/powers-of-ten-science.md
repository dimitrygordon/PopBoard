# Powers of Ten module: science reference

Every number and science claim the Powers of Ten module (`public/study-powers-of-ten.html`, slug `powers-of-ten`) shows to students. Data and math: `public/powers-of-ten/p10-logic.js`. Tests: `tests/powers-of-ten.test.mjs` (`npm run test:powersoften`).

Status: every row below is TODO-TESLA. The plate sizes were cleared by Tesla on 2026-10-29 in `modules/powers-of-ten/MANIFEST.md`; they are listed again here because the app now shows them as rounded copy and short captions next to the art.

## How the zoom works

| # | Claim | Code | Status |
|---|---|---|---|
| 1 | The readout `10^n m` is the height of the view, rounded to the nearest whole power. Range 10⁻¹⁶ m to 10²⁷ m, 44 whole powers. | `Z_MIN`, `Z_MAX`, `POWERS`, `formatPower` | TODO-TESLA |
| 2 | Each plate is "in focus" when the object fills 0.6 of the view height, so its focus is log10(size / 0.6). | `FILL`, `PLATES[].focus` | TODO-TESLA |
| 3 | Between focus points the drawn size is eased (10^(±0.9) band, tanh), not a strict 10x per power, so plates do not shrink to a dot across long gaps. The readout and the scale bar stay exact. | `plateFraction`, `SPREAD` | TODO-TESLA |
| 4 | Scale bar: at whole power n the bar is one tenth of the view height and is labelled 10^(n-1) m. | `drawRuler` in `p10-render.js` | TODO-TESLA |
| 5 | "View: about X tall" uses 10^n m in plain units (pm, nm, µm, mm, m, km). | `plainSize` | TODO-TESLA |

## Plate sizes and captions (shown as live text under each plate)

| # | Plate | Size shown | Caption | Status |
|---|---|---|---|---|
| 6 | Proton | About 1.7 × 10⁻¹⁵ m | "Three quarks held together inside." | TODO-TESLA |
| 7 | Atom | About 100 pm (1e-10 m) | "Nucleus enlarged; electrons form a cloud, not orbits." | TODO-TESLA |
| 8 | DNA double helix | About 2 nm | "About two nanometers across." | TODO-TESLA |
| 9 | Virus | About 100 nm | "Much smaller than a cell." | TODO-TESLA |
| 10 | Animal cell | About 10 µm | "A nucleus sits inside." | TODO-TESLA |
| 11 | Ant | About 1 mm | "Six legs, all on the thorax." | TODO-TESLA |
| 12 | Person | About 1.7 m | "You are here." | TODO-TESLA |
| 13 | Office building | About 100 m | "About thirty floors." | TODO-TESLA |
| 14 | City | About 10 km | "Streets, parks and a river." | TODO-TESLA |
| 15 | Earth | About 12,700 km (diameter) | "Our home planet." | TODO-TESLA |
| 16 | Earth and Moon | About 770,000 km (7.7e8 m, the Moon's orbit across) | "Not to scale." | TODO-TESLA |
| 17 | Solar system | 10¹³ m (Neptune's orbit is about 9 × 10¹² m across) | "Not to scale." | TODO-TESLA |
| 18 | Nearby stars | 10¹⁷ m | "Our Sun's neighbors." | TODO-TESLA |
| 19 | Milky Way | 10²¹ m | "Our galaxy, seen face on." | TODO-TESLA |
| 20 | Local Group | 10²³ m | "Our galaxy's neighborhood." | TODO-TESLA |
| 21 | Cosmic web | 10²⁶ m | "Galaxies strung along threads." | TODO-TESLA |

## Predict, then run (answers are rounded log10 of the size ratio)

| # | Question | Answer | Status |
|---|---|---|---|
| 22 | Person (1.7 m) to Earth (1.27e7 m) | 7 | TODO-TESLA |
| 23 | Ant (1e-3 m) to person (1.7 m) | 3 | TODO-TESLA |
| 24 | Atom (1e-10 m) to cell (1e-5 m) | 5 | TODO-TESLA |
| 25 | Earth (1.27e7 m) to solar system (1e13 m) | 6 | TODO-TESLA |
| 26 | City (1e4 m) to Earth (1.27e7 m) | 3 | TODO-TESLA |
| 27 | Milky Way (1e21 m) to cosmic web (1e26 m) | 5 | TODO-TESLA |

## Sandbox copy

| # | Claim | Code | Status |
|---|---|---|---|
| 28 | "B is about 10^k times bigger than A", k = round(log10(size B / size A)); "within a power of ten" when k = 0. | `powersBetween` | TODO-TESLA |

## Study library card

| # | Claim | Status |
|---|---|---|
| 29 | "every power of ten from 10⁻¹⁶ m to 10²⁷ m" and the object list in `public/study.html`. | TODO-TESLA |
