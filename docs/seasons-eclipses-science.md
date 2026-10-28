# Seasons, Eclipses & Celestial Geometry: science notes

Page: `public/study-seasons-eclipses.html`. Physics: `public/seasons-physics.js` (pure, no DOM, tested by
`tests/seasons-physics.test.mjs`). Render: `public/seasons-render.js`. UI: `public/seasons-ui.js`.
Theme: `public/seasons-theme.css`. Art: `public/seasons/assets/*.webp`.

Modes (`?mode=`): `seasons`, `sunlight`, `daylight`, `eclipses`, `nodes`, `precession`, `sky`, `sandbox`.
Aliases such as `?mode=free` and `?mode=eclipse` also work. Slider values can be deep linked:
`?mode=sandbox&tilt=60&lat=70&date=354&hour=12&incl=0&year=14000`.

## Model

Time `t` is days since 2026 Jan 1 00:00 UTC (`date` slider is the day of 2026, `hour` is local solar time).
The observer sits on the prime meridian, so local solar time is UTC and the equation of time is ignored.

| Quantity | Formula | Source |
|---|---|---|
| Sun longitude, distance | Meeus ch. 25 low precision (mean anomaly, equation of center) | Meeus, Astronomical Algorithms |
| Declination | sin δ = sin ε sin λ, ε = axial tilt slider | spherical trig |
| Noon altitude | 90° − abs(φ − δ) | |
| Spread of a beam | 1 / sin(altitude) m² of ground per m² of beam | |
| Noon flux on flat ground | S0 sin(alt) / R², S0 = 1361 W/m² | |
| 24 h average insolation | (S0/π R²)(H0 sin φ sin δ + cos φ cos δ sin H0) | Berger / standard |
| Day length | 2 H0 / 15 h, cos H0 = (sin h0 − sin φ sin δ)/(cos φ cos δ), h0 = −0.833° | refraction + solar radius |
| Moon | Meeus ch. 47 largest terms for longitude, latitude, distance; latitude scaled by incl / 5.145 | |
| Moon node | Ω = 125.0445° − 1934.136° T | Meeus |
| Eclipses | Shadow cones and classifiers ported verbatim from `study-eclipses.html` (parity test) | |
| Precession | pole at ecliptic longitude 90° − 360°(Y − 2000)/25,772, latitude 90° − tilt | |
| Perihelion | 2026 value found by scanning for minimum R (Jan 3), then drifts 61.9″/yr ÷ 0.9856°/day | |

The Moon's sky position uses the mean-Sun clock (hour angle = solar hour angle + Sun longitude − Moon RA),
which stays smooth when an extreme tilt puts the Sun at the celestial pole.

Checked against reality: the 2026 eclipses classify as Feb 17 annular, Mar 3 total lunar, Aug 12 total solar,
Aug 28 partial lunar; the Jan 18 new Moon gives no eclipse. Ecliptic limits come out solar 16.7°, lunar umbral
10.6°, penumbral 16.7°. Pole stars: Thuban 0.26° in 2800 BC, Polaris 0.74° in 2000, Vega 5.0° in AD 14000.

## Simplifications (shown to students as "not to scale" where it matters)

- Sizes and distances in the orbit and Moon tilt views are not to scale; the Moon's tilt is drawn 3x larger.
- Eclipse side panel: sizes and shadow widths are true, distances are squeezed.
- The tilt slider changes only the obliquity; the orbit, Moon and calendar stay real 2026 values.
- No equation of time, no longitude choice, no atmosphere beyond the −0.833° sunrise convention.
- Insolation is top of atmosphere (no clouds or absorption).
- Precession is a uniform circle (no nutation, no change of obliquity, no proper motion of stars).
- Moon latitude is scaled linearly with the tilt slider; other lunar terms are unchanged.

## Readout steadiness (2x rule)

The test sweeps every slider through every step in every mode and fails if a shown number changes by more
than 2x between adjacent steps. Exempt, because the physics really does this: values crossing or touching 0
(near 0 any ratio is large), the beam spread and noon flux when the Sun is within 3° of the horizon
(1/sin alt diverges; spread above 28 m² is shown as "more than 28 m²"), the umbra width near the cone tip,
and compass bearings (0° is due north, not "nothing").

## Art anchors (measured, `public/seasons/assets`)

Disks are 1024 px with the ink edge at radius 440 around center 512; the 2026-10-28 art update added a
thin light halo just outside the ink (pixels 69 to 71). Code strips that halo from any layer drawn on top of
another (terminator, axis, shadow cones, and the Moon, Earth or Sun when they overlap a layer underneath) so
no light ring shows between stacked layers; lone disks on the dark sky keep the halo as their light edge.

| Asset | MANIFEST says | Measured | Used as |
|---|---|---|---|
| shadow-umbra-cone | base half-height 150 at x 0, tip at 1014 | matches | scaled to the true cone |
| shadow-penumbra-cone | grows 300 to 400 px tall | grows 302 to 502 px tall | used when its flare fits, else a code polygon |
| horizon-scene | 1024 x 576 | 1280 x 720, horizon about 70% down | tiled ground |
| observer-sprite | feet at bottom | feet at y 247 of 256 | observer |

The solar penumbra needs a flare ratio of about 2.0 and the art reaches 1.66, so the solar penumbra is a code
polygon in the same gray. The antumbra is drawn in code.

## Dark and light themes

A header button switches themes; the choice is saved in `localStorage` (`seasonsTheme`). With no saved
choice the page follows `prefers-color-scheme` and tracks changes. Text tokens keep at least 4.5:1 contrast
on the stage and panels in both themes (tested). The eclipse panel stays paper colored and the sky view stays
blue in both themes; in dark mode the ground art is dimmed in code.

## Every claim and number shown to students

1. Seasons come from the axial tilt, not from Earth's distance from the Sun.
2. The axis keeps pointing the same way in space through the year.
3. In June the north half leans toward the Sun; in December the south half does.
4. Earth is closest to the Sun in early January (about Jan 3 in 2026).
5. Tilt 0 removes the seasons; tilt near 90 makes the poles take turns facing the Sun.
6. Tilt is about 23.4° (slider default 23.4°; 23.44° today).
7. Subsolar latitude at noon equals the declination; at the June solstice it is 23.4°N.
8. Tilt is about 23.4°, so the tropics are at 23.4° N and S and the polar circles at 66.6° N and S (90° minus the tilt).
9. Earth to Sun: about 0.983 to 1.017 AU, shown in AU and million km.
10. A low Sun spreads one square meter of beam over 1/sin(alt) square meters of ground (2 m² at 30°).
11. Noon flux on flat ground is 1361 W/m² × sin(alt) / R² (top of atmosphere).
12. 24 hour average sunlight from the daily insolation formula; in June the pole gets more than the equator.
13. Longer days and a higher Sun together make summer warmer.
14. On the equinoxes daylight is close to 12 hours everywhere (about 12 h 9 min at 42°N), a few minutes more because of refraction and the Sun's disk.
15. Daylight stays near 12 hours all year at the equator (about 12 h 7 min).
16. Inside the polar circles there is midnight Sun (24 h) and polar night (0 h).
17. About 15 h 15 min of daylight at 42°N on Jun 21; sunrise and sunset times and directions.
18. A solar eclipse happens at new Moon when the Moon's shadow reaches Earth; a lunar eclipse at full Moon when the Moon enters Earth's shadow.
19. Umbra: Sun fully hidden; penumbra: partly hidden; antumbra: annular eclipse when the umbra ends before Earth.
20. Shadow widths in km, measured square to the shadow axis at Earth's center distance and at the Moon (Aug 12 2026 at 17:48 UTC: umbra about 105 km across the axis, penumbra about 6,900 km). The path of totality on the ground is up to about 290 km wide (NASA: 294 km at greatest eclipse), wider than the cross-section because the shadow meets the curved ground at a slant. Source: https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2026Aug12Tpath.html
21. Earth's umbra at the Moon's distance is about 9,400 km wide, wider than the Moon (3,474 km).
22. Sun and Moon sizes in the sky in arcminutes, seen from Earth's center (about 31.6′ and 32.6′ on Aug 12 2026, ratio 32.6/31.6 = 1.032). Any percent shown is computed from that same ratio (`apparentSizes`, `sizeComparison`), so the model readout says about 3% wider. From the ground at greatest eclipse NASA gives magnitude 1.0386: on Aug 12 2026 the Moon looks about 4% wider than the Sun, so it can cover the Sun completely (caption). Source: https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=20260812
23. 2026 eclipses: Feb 17 annular solar, Mar 3 total lunar, Aug 12 total solar, Aug 28 partial lunar.
24. The Moon's orbit is tilted about 5.1° (5.15°) to Earth's orbit.
25. A solar eclipse can happen only if new Moon falls within about 17° of a node (model 16.7° at mean distances). An umbral lunar eclipse (partial or total) needs full Moon within about 11° (model 10.6° at mean distances); a total lunar eclipse needs a tighter alignment than that.
26. The Sun lines up with a node about every 173.3 days (two eclipse seasons a year, eclipse year 346.62 days).
27. The nodes circle the sky westward every 18.61 years.
28. With no Moon tilt there would be an eclipse every new and full Moon.
29. Moon phase name, percent lit and age in days (synodic month 29.53 days).
30. Precession: the axis traces a circle about every 25,800 years (model 25,772).
31. Polaris is the pole star today (0.7° from the pole in 2000).
32. Thuban was the pole star about 4,800 years ago (2800 BC).
33. Vega will be near the pole in about 12,000 years (AD 14000, about 5° away).
34. Precession leaves the tilt and the season months unchanged but moves the pole star and the date of perihelion (to about early July around AD 12500).
35. The Sun rises in the east and sets in the west. North of the Tropic of Cancer, the noon Sun is always due south. Between the equator and the Tropic, it can be overhead or even in the north in summer. The sky view faces the noon Sun (south, or north when the Sun passes north of the zenith) and shows a "Noon Sun direction" readout.
36. In summer the Sun's path is higher and longer, in winter lower and shorter.
37. The pole star's height is almost exactly your latitude.
38. Sun and Moon height and compass direction for the chosen time and place.
39. Sandbox: all of the above from one model with any tilt, date, time, latitude, Moon tilt and year.
