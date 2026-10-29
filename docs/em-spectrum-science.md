# Electromagnetic Spectrum Explorer: science reference

For fact-checking. Every number the page shows comes from `public/em-spectrum/emspec-physics.js`. The render file draws it; Leo's art (`public/em-spectrum/assets/`) supplies pictures only. Tests: `tests/emspec-physics.test.mjs` (`node --test`).

Page: `/study-em-spectrum.html`. Deep links: `?mode=wave|energy|atmosphere|telescopes|sky`, `&band=radio|infrared|visible|ultraviolet|xray|gamma` (aliases `ir`, `uv`, `x-ray`, `optical`, `microwave`), `&object=crab|galaxy|sun`.

## 1. Constants (SI 2019, exact)

| Symbol | Value |
|---|---|
| c | 299 792 458 m/s |
| h | 6.626 070 15e-34 J s |
| e (1 eV) | 1.602 176 634e-19 J |
| k_B | 1.380 649e-23 J/K |
| hc | 1239.842 eV nm (derived) |

## 2. Equations

- c = lambda f, so f = c / lambda and lambda = c / f.
- E = h f = h c / lambda. In eV: E = h f / e. Shortcut: E(eV) = 1239.84 / lambda(nm).
- Thermal energy: E = k_B T. At 300 K: 0.02585 eV.
- Diffraction limit: theta = 1.22 lambda / D (radians), times 206 264.8 arcsec per radian.
- Ratio of two photon energies: E_A / E_B = lambda_B / lambda_A.

## 3. Slider

One log slider, t in [0, 1]: lambda = 10^(-14 + 18 t) m, from 10 fm to 10 km. The frequency slider uses 1 - t, so moving one slider right moves the other left. The spectrum bar puts long wavelengths (radio) on the left, as in the style frame. Arrow keys on the bar step 0.05 decades.

## 4. Bands (vacuum wavelength)

| Band | Range | Center used for the band button |
|---|---|---|
| Radio (includes microwave) | above 1 mm | 21 cm (1.43 GHz, hydrogen line) |
| Infrared | 700 nm to 1 mm | 10 um |
| Visible | 380 nm to 700 nm | 550 nm |
| Ultraviolet | 10 nm to 380 nm | 150 nm |
| X-ray | 0.01 nm to 10 nm (about 124 eV to 124 keV) | 0.1 nm (12.4 keV) |
| Gamma | below 0.01 nm (above about 124 keV) | 1 pm (1.24 MeV) |

Boundaries between bands are conventions, not sharp edges (shown under the spectrum bar). X-rays and gamma rays overlap in energy and are often split by source (electrons for X-rays, atomic nuclei and particle processes for gamma rays) rather than by wavelength; the page uses 0.01 nm only as a drawing convention. Band colors on screen are false colors from the style frame, except the visible strip, which uses an approximate rainbow (display only).

## 5. Photon energy reference marks

| Mark | Value |
|---|---|
| kT at 300 K | 0.0259 eV |
| Red light, 700 nm | 1.77 eV |
| Violet light, 380 nm | 3.26 eV |
| Ionize hydrogen | 13.6 eV |
| Electron rest energy | 511.0 keV (510 998.95 eV) |
| "Ionizing" threshold drawn | 10 eV (round number; first ionization energies of common atoms and molecules are about 10 to 15 eV) |

Ionizing caption: "Far UV, X-rays and gamma rays ionize atoms. UVB (280 to 315 nm) can still damage DNA without ionizing." The 10 eV line is kept.

## 6. Size scale ("one wavelength is about the size of a ...")

Order-of-magnitude typical sizes; the nearest in log10 is highlighted.

| Icon | Size |
|---|---|
| building | 100 m |
| person | 1.7 m |
| bee | 1.2 cm |
| pinhead | 1.5 mm |
| cell | 10 um |
| molecule | 0.3 nm |
| atom | 0.1 nm |
| nucleus | 10 fm |

## 7. Atmospheric transmission (schematic)

Fraction of light from straight overhead that reaches sea level through clear, dry air. Linear interpolation in log10(lambda) between these points. Opacity = 1 - transmission. Simplified for teaching; real values depend on water vapor, altitude and angle.

| lambda | T | Note |
|---|---|---|
| 10 fm to 295 nm | 0 | gamma, X-ray, UV-C, most UV-B absorbed |
| 310 nm | 0.2 | UV-B tail |
| 340 nm | 0.5 | UV-A |
| 400 nm | 0.75 | |
| 550 nm | 0.85 | |
| 1.1 um | 0.85 | |
| 1.3 / 1.4 / 1.5 um | 0.8 / 0.1 / 0.8 | water band |
| 1.8 / 1.9 / 2.0 / 2.4 um | 0.75 / 0.1 / 0.75 / 0.75 | water band, K window |
| 2.7 / 3.0 / 3.4 / 4.1 um | 0.05 / 0.1 / 0.7 / 0.7 | L window |
| 4.3 / 4.6 / 5.0 um | 0.05 / 0.5 / 0.5 | CO2 band, M window |
| 5.5 to 7.5 um | 0 | water band |
| 8 to 13 um | 0.6 | N window |
| 15 to 300 um | 0 | CO2, then water |
| 350 / 400 um | 0.15 / 0 | weak submillimeter window |
| 800 um / 1 mm / 3 mm / 1 cm | 0.2 / 0.3 / 0.7 / 0.95 | millimeter |
| 1 cm to 15 m | 0.95 | radio window |
| 30 m to 10 km | 0 | ionosphere reflects |

### Where each band is stopped (representative)

The atmosphere panel draws one arrow per band ending at this altitude. Layer tops used: troposphere 12 km, stratosphere 50 km, mesosphere 85 km, panel top 150 km. Measured on Leo's art: ground line at y = 0.91 of the height (manifest says 0.92; mountains run from about 0.85 to 0.93), layer lines at 0.72, 0.50, 0.30. Altitude maps linearly between those.

| Band | Stop altitude | Text shown |
|---|---|---|
| Radio | 0 (ground) | Reaches the ground. Waves longer than about 10 to 30 m bounce off the ionosphere. |
| Infrared | 5 km, dashed to ground | Mostly absorbed by water vapor and carbon dioxide low in the troposphere. A few windows reach high, dry mountaintops. |
| Visible | 0 (ground) | Reaches the ground. Air scatters blue light more than red. |
| Ultraviolet | 30 km, dashed to ground | Ozone in the stratosphere absorbs most UV shorter than about 300 nm. Some UV-A reaches the ground. |
| X-ray | 80 km | Absorbed high in the atmosphere by nitrogen and oxygen atoms. |
| Gamma | 25 km | Absorbed in the upper atmosphere, where each photon starts a shower of particles. Gamma rays are more penetrating, so they reach lower before the air stops them. |

## 8. Telescopes

Diffraction limit shown for one representative (lambda, D):

| Band | Art | Where | D | lambda | theta = 1.22 lambda / D |
|---|---|---|---|---|---|
| Radio | telescope-radio-dish | ground | 100 m | 21 cm | 528 arcsec (8.81 arcmin) |
| Infrared | telescope-infrared-space | space | 6.5 m | 2 um | 0.077 arcsec |
| Visible | telescope-optical-reflector (refractor art kept as alt) | ground | 2.4 m | 550 nm | 0.058 arcsec |
| Ultraviolet | telescope-ultraviolet | space | 2.4 m | 150 nm | 0.016 arcsec |
| X-ray | telescope-xray-grazing | space | 1.2 m | 0.1 nm | 2.1e-5 arcsec; the page adds that real X-ray mirrors are limited by surface shape, about 0.5 arcsec for the best |
| Gamma | telescope-gamma-ray | space | none | 1 pm | not shown; text: direction from particle tracks; Fermi-LAT 68% containment about 5 deg at 100 MeV, 0.8 deg at 1 GeV, 0.15 deg at 10 GeV, 0.1 deg above 30 GeV (see below) |

Explanations shown:
- Radio: a curved metal dish reflects radio waves to a receiver at the focus; the surface only needs to be smooth to a small fraction of the wavelength, so mesh or panels work.
- Infrared: gold-coated mirrors reflect infrared well; a sunshield keeps the telescope cold so its own heat does not swamp the signal.
- Visible: a lens (refractor) or curved mirror (reflector) brings light to a focus; big research telescopes use mirrors.
- Ultraviolet: ozone blocks most UV, so UV telescopes fly above the atmosphere; mirrors still work, with special coatings.
- X-ray: X-rays reflect only when they skim the surface at under about 1 degree, so nested barrel-shaped mirrors guide them to a focus (diagram angle exaggerated).
### Gamma-ray angular resolution (verified)

Source: Fermi LAT Performance, https://www.slac.stanford.edu/exp/glast/groups/canda/lat_Performance.htm, table "PSF68 Acc. weighted Total" (P8R3_SOURCE_V3, 68% containment, acceptance weighted), fetched 2026-10-28:

| Energy | PSF68 |
|---|---|
| 99 MeV | 5.29 deg |
| 981 MeV | 0.85 deg |
| 9.7 GeV | 0.16 deg |
| 30.6 GeV | 0.11 deg |
| 96 GeV | 0.10 deg |

The brief's "3 to 5 deg at 100 MeV" matches the total at the top of that range (FRONT-converting events are about a factor of two sharper). The brief's "0.1 deg above 10 GeV" is slightly optimistic at exactly 10 GeV (0.16 deg); the table reaches about 0.1 deg from about 30 GeV, so the page says 0.15 deg at 10 GeV and 0.1 deg above 30 GeV.

- Gamma: too energetic to focus; each photon converts to an electron and positron in the detector (pair production), and their tracks point back to the source; a calorimeter measures the energy.

## 9. Band views

Leo's masks, tinted by multiplying luminance with the band color (false color). All six masks of one object share center and scale, so the crossfade (450 ms, off with reduced motion) is pixel aligned. A soft glow is drawn behind the small gamma cores of the galaxy and the Crab (manifest known issue). Captions:

- Crab Nebula: radio, synchrotron light from fast electrons in magnetic fields across the whole nebula; infrared, warm dust and gas trace the filaments; visible, glowing filaments of hot gas from the supernova seen in 1054; UV, a smaller inner nebula of the most energetic electrons; X-ray, the pulsar powers a ring and jets of very hot, fast particles; gamma, a compact point at the pulsar.
- Spiral galaxy: radio, cold hydrogen (21 cm line) beyond the stars; infrared, dust warmed by starlight and the old stars of the bulge; visible, starlight in arms with dark dust lanes; UV, hot young massive stars in knots; X-ray, scattered points from gas falling onto neutron stars and black holes, plus the nucleus; gamma, only a faint core (cosmic rays striking gas, or the central black hole).
- Sun: radio, from the hot corona above the surface, so the disk looks bigger and blotchy; infrared, a smooth low-contrast disk; visible, the photosphere with limb darkening and sunspots; UV, hot gas over active regions (plage) and loops at the edge; X-ray, "In X-rays the Sun's visible surface is dark; we see the million-degree corona as bright loops over active regions, with dark coronal holes."; gamma, usually dark, gamma rays appear during strong flares.

## Sandbox mode (?mode=sandbox)

The sandbox puts the wavelength, frequency and photon B sliders, the object picker and the sky view on one screen. Numbers shown, all computed as in the other views: wavelength, frequency, c = lambda f, photon energy E = h f in eV and J, photon B energy in eV and J, and the energy ratio between the two photons (always shown as the larger over the smaller, so it is at least 1). It also states ionizing or not (threshold about 10 eV, as in the energy view) and names the telescope for the current band. Atmospheric transmission is not shown in the sandbox because the schematic curve changes by more than 2x between adjacent slider steps near the absorption bands; it stays in the atmosphere view.
