# Powers of Ten module: science reference

Every number and science claim the Powers of Ten module (`public/study-powers-of-ten.html`, slug `powers-of-ten`) shows to students. Data and math: `public/powers-of-ten/p10-logic.js`. Tests: `tests/powers-of-ten.test.mjs` (`npm run test:powersoften`).

Status: every row below was cleared by Tesla 2026-10-29. The plate sizes were cleared by Tesla on 2026-10-29 in `modules/powers-of-ten/MANIFEST.md`; they are listed again here because the app now shows them as rounded copy and short captions next to the art.

## How the zoom works

| # | Claim | Code | Status |
|---|---|---|---|
| 1 | The readout `10^n m` is the height of the view, rounded to the nearest whole power. Range 10⁻¹⁶ m to 10²⁷ m, 44 whole powers. | `Z_MIN`, `Z_MAX`, `POWERS`, `formatPower` | Cleared by Tesla 2026-10-29 |
| 2 | Each plate is "in focus" when the object fills 0.6 of the view height, so its focus is log10(size / 0.6). | `FILL`, `PLATES[].focus` | Cleared by Tesla 2026-10-29 |
| 3 | Between focus points the drawn size is eased (10^(±0.9) band, tanh), not a strict 10x per power, so plates do not shrink to a dot across long gaps. The readout and the scale bar stay exact. | `plateFraction`, `SPREAD` | Cleared by Tesla 2026-10-29 |
| 4 | Scale bar: at whole power n the bar is one tenth of the view height and is labelled 10^(n-1) m. | `drawRuler` in `p10-render.js` | Cleared by Tesla 2026-10-29 |
| 5 | "View: about X tall" uses 10^n m in plain units (pm, nm, µm, mm, m, km). | `plainSize` | Cleared by Tesla 2026-10-29 |

## Plate sizes and captions (shown as live text under each plate)

| # | Plate | Size shown | Caption | Status |
|---|---|---|---|---|
| 6 | Proton | About 1.7 × 10⁻¹⁵ m | "Three quarks, held together by gluons." | Cleared by Tesla 2026-10-29 |
| 7 | Atom | About 100 pm (1e-10 m) | "Nucleus enlarged; electrons form a cloud, not orbits." | Cleared by Tesla 2026-10-29 |
| 8 | DNA double helix | About 2 nm | "About two nanometers wide." | Cleared by Tesla 2026-10-29 |
| 9 | Virus | About 100 nm | "Much smaller than a cell." | Cleared by Tesla 2026-10-29 |
| 10 | Animal cell | About 10 µm | "A nucleus sits inside." | Cleared by Tesla 2026-10-29 |
| 11 | Ant | About 1 mm | "Six legs, all on the thorax." | Cleared by Tesla 2026-10-29 |
| 12 | Person | About 1.7 m | "You are here." | Cleared by Tesla 2026-10-29 |
| 13 | Office building | About 100 m | "About thirty floors." | Cleared by Tesla 2026-10-29 |
| 14 | City | About 10 km | "Streets, parks and a river." | Cleared by Tesla 2026-10-29 |
| 15 | Earth | About 12,700 km (diameter) | "Our home planet." | Cleared by Tesla 2026-10-29 |
| 16 | Earth and Moon | About 770,000 km (7.7e8 m, the Moon's orbit across) | "Not to scale." | Cleared by Tesla 2026-10-29 |
| 17 | Solar system | 10¹³ m (Neptune's orbit is about 9 × 10¹² m across) | "Not to scale." | Cleared by Tesla 2026-10-29 |
| 18 | Nearby stars | 10¹⁷ m | "Our Sun's neighbors." | Cleared by Tesla 2026-10-29 |
| 19 | Milky Way | 10²¹ m | "Our galaxy, as it would look face on." | Cleared by Tesla 2026-10-29 |
| 20 | Local Group | 10²³ m | "Our galaxy's neighborhood." | Cleared by Tesla 2026-10-29 |
| 21 | Cosmic web | 10²⁶ m | "Galaxies strung along threads." | Cleared by Tesla 2026-10-29 |

## Predict, then run (answers are rounded log10 of the size ratio)

| # | Question | Answer | Status |
|---|---|---|---|
| 22 | Person (1.7 m) to Earth (1.27e7 m) | 7 | Cleared by Tesla 2026-10-29 |
| 23 | Ant (1e-3 m) to person (1.7 m) | 3 | Cleared by Tesla 2026-10-29 |
| 24 | Atom (1e-10 m) to cell (1e-5 m) | 5 | Cleared by Tesla 2026-10-29 |
| 25 | Earth (1.27e7 m) to solar system (1e13 m) | 6 | Cleared by Tesla 2026-10-29 |
| 26 | City (1e4 m) to Earth (1.27e7 m) | 3 | Cleared by Tesla 2026-10-29 |
| 27 | Milky Way (1e21 m) to cosmic web (1e26 m) | 5 | Cleared by Tesla 2026-10-29 |

## Sandbox copy

| # | Claim | Code | Status |
|---|---|---|---|
| 28 | "B is about 10^k times bigger than A", k = round(log10(size B / size A)); "within a power of ten" when k = 0. | `powersBetween` | Cleared by Tesla 2026-10-29 |

## Study library card

| # | Claim | Status |
|---|---|---|
| 29 | "every power of ten from 10⁻¹⁶ m to 10²⁷ m" and the object list in `public/study.html`. | Cleared by Tesla 2026-10-29 |
