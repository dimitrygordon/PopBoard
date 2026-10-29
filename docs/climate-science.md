# Planetary Climate: science reference

Every equation, constant, number and claim shown in the Planetary Climate module (`public/study-climate.html`, `public/climate/`), with sources. Values live in `public/climate/climate-physics.js` and are checked by `tests/climate-physics.test.mjs`.

## Constants
| Quantity | Value | Source |
|---|---|---|
| Stefan-Boltzmann constant sigma | 5.670374e-8 W m^-2 K^-4 | CODATA 2018; OpenStax University Physics Vol. 2, 1.7 |
| Earth solar constant S | 1361.0 W/m^2 | NASA Earth Fact Sheet |
| Earth Bond albedo | 0.294 | NASA Earth Fact Sheet |
| Earth mean surface temperature | 288 K (15 C) | NASA Earth Fact Sheet |
| Earth surface pressure | 1014 mb | NASA Earth Fact Sheet |
| Earth air: N2 78.08 %, O2 20.95 % | | NASA Earth Fact Sheet |
| Venus: S 2601.3 W/m^2, albedo 0.77, 0.723 AU, 737 K, 92 bar, 96.5 % CO2, blackbody 226.6 K | | NASA Venus Fact Sheet |
| Mars: S 586.2 W/m^2, albedo 0.250, 1.524 AU, about 214 K mean, 6.36 mb, 95.1 % CO2, blackbody 209.8 K | | NASA Mars Fact Sheet |
| Wien constant | 2898 um K | OpenStax University Physics Vol. 3, 6.1 |
| Pre-industrial CO2 | 280 ppm | IPCC AR6 WG1 Ch. 2 |
| CO2 annual means, Mauna Loa: 1959 315.98 ppm, 2024 424.61 ppm, 2025 427.35 ppm | | NOAA GML Mauna Loa annual mean record |

## Equations
1. Sunlight at distance d (AU): S(d) = S_Earth / d^2 (inverse square; OpenStax).
2. Average sunlight per square metre = S/4 (disc pi R^2 versus sphere 4 pi R^2). Earth: 1361/4 = 340 W/m^2.
3. Absorbed = (1 - a) S/4; reflected = a S/4. Earth: 240 W/m^2 absorbed.
4. Equilibrium temperature T_e = [S(1 - a)/(4 sigma)]^(1/4). Earth 255 K (-18 C), Venus 227 K, Mars 210 K; matches the NASA blackbody values above.
5. One-layer gray atmosphere: T_s = T_e [2/(2 - eps)]^(1/4), layer T_a = T_s / 2^(1/4). eps = 0.77 gives Earth 288 K, layer 242 K; ground emits sigma T_s^4 = 390 W/m^2, the layer sends about 150 W/m^2 back down.
6. N opaque layers (sandbox): T_s = T_e (1 + N)^(1/4). Earth is about 0.62 layers, Venus about 110, Mars warms about 4 K.
7. CO2 forcing: dF = 5.35 ln(C/280) W/m^2 (Myhre et al. 1998, used in IPCC TAR/AR5). Doubling gives 3.71 W/m^2; AR6 best estimate 3.93 W/m^2.
8. Eventual warming dT = ECS x dF / F_2x. ECS best estimate 3 C, likely 2.5 to 4 C, very likely 2 to 5 C (IPCC AR6 WG1 SPM A.4.4, Ch. 7).
9. Feedbacks: dT = -dF / lambda. AR6 Table 7.10: Planck -3.22, water vapour + lapse rate +1.30, surface albedo +0.35, clouds +0.42 W m^-2 K^-1; net -1.16 (includes -0.01 biogeophysical/other not shown). Module sum -1.15 gives 3.42 K for 3.93 W/m^2; Planck alone 1.22 K; gain 2.8.

## Claims
- Sunlight peaks in visible light; Earth's surface emission peaks near 10 um (2898/288) in the infrared (Wien; OpenStax).
- The atmospheric window is about 8 to 13 um (NOAA/NASA Earth Observatory).
- CO2 absorbs near 4.3 and 15 um; H2O near 6.3 um and beyond about 20 um; CH4 near 3.3 and 7.7 um; N2 and O2 hardly absorb infrared (OpenStax Chemistry/Astronomy; IPCC AR6 Ch. 7).
- Each extra bit of CO2 adds less warming (logarithmic forcing) because the 15 um band centre is saturated (IPCC AR6 Ch. 7).
- Warm air holds about 7 % more water vapour per degree C (Clausius-Clapeyron; IPCC AR6 Ch. 8).
- Venus is hotter than Mercury despite reflecting 77 % of sunlight; its 92 bar surface pressure is about 90 times Earth's (NASA fact sheets).
- Mars' thin CO2 air warms it by only a few kelvin (NASA Mars Fact Sheet).

## Sources
- NASA Planetary Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/ (Venus, Earth, Mars)
- IPCC AR6 WG1 (2021), SPM and Chapter 7: https://www.ipcc.ch/report/ar6/wg1/
- NOAA GML Mauna Loa CO2: https://gml.noaa.gov/ccgg/trends/data.html
- OpenStax University Physics, Astronomy 2e, Chemistry 2e: https://openstax.org
- Myhre et al. (1998), GRL 25, 2715.
