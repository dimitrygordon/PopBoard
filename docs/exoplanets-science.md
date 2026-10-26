# Exoplanet Hunter: science reference

For fact-checking (Tesla). Every number the page draws comes from `public/exoplanets-physics.js`. The art pack (`public/exoplanets/assets/`) supplies sprites and colors only. Tests: `tests/exoplanets-physics.test.mjs` (13 tests, `node --test`).

## 1. Constants (SI)

| Symbol | Value | Source |
|---|---|---|
| G | 6.67430e-11 m³ kg⁻¹ s⁻² | CODATA 2018 |
| GM☉ | 1.3271244e20 m³ s⁻² | IAU 2015 B3 nominal |
| M☉ | GM☉ / G ≈ 1.98841e30 kg | derived |
| R☉ | 6.957e8 m | IAU 2015 B3 |
| L☉ | 3.828e26 W | IAU 2015 B3 |
| T☉ | 5772 K | IAU 2015 B3 |
| M⊕ | 5.9722e24 kg | IAU 2015 / JPL |
| R⊕ | 6.3781e6 m (equatorial) | IAU 2015 B3 |
| M_J | 1.89813e27 kg | JPL |
| R_J | 7.1492e7 m (equatorial) | IAU 2015 B3 |
| AU | 1.495978707e11 m (exact) | IAU 2012 B2 |
| day | 86400 s | |
| σ_SB | 5.670374419e-8 W m⁻² K⁻⁴ | CODATA 2018 |

## 2. Stars (teaching approximations)

Host masses are drawn uniformly from 0.45 to 1.35 M☉. Main-sequence relations (rough, for a game, not a stellar model):

- R = M^0.8 for M < 1 M☉, otherwise M^0.57 (R☉)
- L = 0.23 M^2.3 for M < 0.43 M☉, otherwise M^4 (L☉)
- Teff = T☉ (L / R²)^(1/4) (Stefan–Boltzmann)
- Spectral class from Teff: M < 3900 K, K < 5300 K, G < 6000 K, otherwise F

Quadratic limb darkening: u1 = max(0, 0.6 − 0.1 (Teff − 4000)/2000), u2 = 0.2. Ballpark values; real coefficients come from Claret tables. **Check:** whether these are acceptable for teaching.

## 3. Orbits

- Kepler III: a = [G (M* + Mp) P² / 4π²]^(1/3)
- Mean anomaly: M = 2π (t − tp) / P. Kepler's equation M = E − e sin E is solved by Newton iteration (start E = M, or π for e ≥ 0.8). Tested to |residual| < 1e-12 for e up to 0.99.
- True anomaly: f = 2 atan2(√(1+e) sin(E/2), √(1−e) cos(E/2)). Separation: r = a (1 − e cos E).
- Sky frame, observer on −Z (positive Z points away from the observer); ω is the star's argument of periastron:
  X = r cos(ω+f), Y = r sin(ω+f) cos i, Z = r sin(ω+f) sin i.
- Barycentric positions: star = +(Mp/Mt)·rel, planet = −(M*/Mt)·rel, so M*·r* + Mp·rp = 0 and M*·v* + Mp·vp = 0 (tested).
- Mid-transit t0 sets tp: f_tr = π/2 − ω, convert to E and then M, and tp = t0 − M/n.
- The planet is in front of the star when sin(ω+f) > 0. Projected separation in stellar radii: z = √(X²+Y²) / R*.

## 4. Transits

- Radius ratio: k = Rp/R*. Depth ≈ k² (exact for a uniform disc; tested).
- Impact parameter: b = (a cos i / R*) · (1 − e²) / (1 + e sin ω) (Winn 2010, eq. 7). Circular: b = a cos i / R*.
- No transit when b ≥ 1 + k (tested: the light curve stays at exactly 1). Grazing when 1 − k < b < 1 + k: overlap uses the exact two-circle lens area.
- Duration: T14 = (P/π) · asin[√((1+k)² − b²) / ((a/R*) sin i)] · √(1−e²)/(1 + e sin ω) (Winn 2010, eqs. 14 and 16). Tested against the light curve edges.
- Limb darkening, quadratic: I(μ)/I(1) = 1 − u1(1−μ) − u2(1−μ)², μ = √(1 − r²). Disc-mean normalisation: 1 − u1/3 − u2/6.
- Flux deficit (small-planet approximation, Mandel & Agol 2002 §5): ΔF = k² · overlap · I(r)/(1 − u1/3 − u2/6). Here r = z for a full transit and the middle of the covered annulus, (z − k + 1)/2, at ingress and egress. A central transit is therefore k²/(1 − u1/3 − u2/6), slightly deeper than k² (tested).
- Multiple planets: the deficits add.
- Noise: white Gaussian, σ drawn log-uniform from 200 to 1500 ppm per 30-minute point. Optional stellar variability (40% of stars): a sinusoid with amplitude 200–2000 ppm and period 8–30 d.
- Cadence: 30 minutes over 40 days, 1920 points.

**Art pack note:** the README recipe uses linear limb darkening with u = 0.6, and `--ex-limb-u` affects the sprites only. The physics uses the quadratic law above. The README dip-depth rule (≈ (Rp/R*)², about 1% for a Jupiter and about 0.01% (84 ppm) for an Earth around a Sun-like star) agrees with the code. Because the light-curve y axis is auto-stretched, the panel always shows the "⌕ stretched y" mark.

## 5. Radial velocity

- K = (2πG/P)^(1/3) · Mp sin i / (M* + Mp)^(2/3) / √(1 − e²). Tested against the sampled curve for e = 0, 0.3 and 0.6. Jupiter–Sun gives 12.5 m/s.
- v_r(t) = K [cos(ω+f) + e cos ω], positive = receding. The code's v_r equals the star's barycentric vz (tested). The wobble view and the RV curve therefore come from the same state.
- Observations: 28 epochs at uneven nightly cadence. Each night is clear with probability 0.65, with occasional 3–8-day weather gaps and a 0.4-day jitter. Gaussian noise σ = 1.5–4 m/s.
- Color tint: blue means approaching (v < 0), red means receding (art-pack rule).
- Student model on the RV panel: circular v(φ) = −K sin(2πφ), with φ = 0 at mid-transit (see the sign check below). With the convention above, at mid-transit (ω+f = π/2) v_r = e cos ω, and dv/dt < 0, so v = −K sin(2πφ) for e = 0. **Check:** this sign convention.

**Art pack note:** the README shows v = K sin(2πt/P) as a recipe. That is only a phase convention; the physics uses the full Keplerian form above.

## 6. Eclipsing-binary impostor

- The companion is a 0.15–0.40 M☉ main-sequence star, with P = 1.5–8 d, e = 0, and b drawn from 0.95 to 1 + 0.8k (grazing, so V-shaped).
- Primary eclipse: the companion blocks the primary. It is diluted by the primary's light share L1/(L1+L2).
- Secondary eclipse at phase 0.5: lost flux = L2/(L1+L2) × covered fraction of the companion (two-circle overlap, companion treated as uniform). It is shallower than the primary (tested), which is the tell.
- K comes out in km/s (tested > 1 km/s).
- README rule: "alternate deep and shallow eclipses; only grazing systems look V-shaped". Our impostors are all grazing. **Gap:** there are no flat-bottomed, fully eclipsing binaries yet.

## 7. Target generator (seeded)

- RNG: mulberry32, with Box–Muller normal deviates. The same seed gives the same data (tested).
- The field seed comes from `?seed=` (default 2026) and gives 12 targets.
- Class mix: 45% one planet, 20% no planet, 15% eclipsing binary, 20% multi (2–3 planets, period ratios 1.6–2.6).
- Planet presets:

| Type | Radius | Mass | Period (d) |
|---|---|---|---|
| hot Jupiter | 0.8–1.6 R_J | 0.3–3 M_J | 1.2–6 |
| warm Neptune | 2.5–5 R⊕ | 8–30 M⊕ | 3–25 |
| super-Earth | 1.2–2 R⊕ | 2–8 M⊕ | 1–15 |
| warm Jupiter | 0.8–1.2 R_J | 0.5–5 M_J | 8–25 |

- Periods are capped at baseline/3, so at least three transits are seen.
- e = 0 for P < 5 d, otherwise |N(0, 0.12)| capped at 0.4. ω is uniform.
- Single planets transit 85% of the time (b < 0.85). The rest have b drawn up to 2.5 and may be RV-only.

## 8. Inference helpers

- Phase fold: φ = ((t − t0)/P) mod 1, mapped to [−0.5, 0.5). The UI picks t0 at the deepest bin of an 80-bin fold.
- BLS (Kovács, Zucker & Mazeh 2002): binned, uniform grid in frequency from 0.8 d to baseline/2, duty cycle 0.5–12%. Signal residue SR² = S²/(R(1−R/N))/N for dips (S < 0). Depth = −S/R · N/(N−R). Tested to recover the injected period within 1%.
- Generalised Lomb–Scargle (floating mean): a weighted linear least-squares fit of A sin ωt + B cos ωt + C at each period, with power = R². K = √(A²+B²). Tested on uneven noisy data within 1%.
- Depth to radius: Rp = R* √depth (the UI uses no LD correction, matching the README rule; the helper accepts u1 and u2).
- K to mass: iterate Mp = K√(1−e²)(M*+Mp)^(2/3) / [(2πG/P)^(1/3) sin i]. This gives Mp sin i if i is unknown, and the true mass for transiting planets (i ≈ 90°). Tested round trip to 1e-9.
- Bulk density: ρ = Mp / (4/3 π Rp³). Earth gives 5.50 g/cm³ (tested).
- Insolation: S/S⊕ = L / a² (L☉, AU).

## 9. Habitable zone

Primary model: Kopparapu et al. 2013, ApJ 765, 131 (arXiv:1301.6674), Table 3.
S_eff = S0 + aT + bT² + cT³ + dT⁴, with T = Teff − 5780 K (clamped to 2600–7200 K), and d = √(L/S_eff) AU.

| Limit | S0 | a | b | c | d |
|---|---|---|---|---|---|
| Recent Venus | 1.7753 | 1.4316e-4 | 2.9875e-9 | -7.5702e-12 | -1.1635e-15 |
| Runaway greenhouse | 1.0512 | 1.3242e-4 | 1.5418e-8 | -7.9895e-12 | -1.8328e-15 |
| Moist greenhouse | 1.0140 | 8.1774e-5 | 1.7063e-9 | -4.3241e-12 | -6.6462e-16 |
| Maximum greenhouse | 0.3438 | 5.8942e-5 | 1.6558e-9 | -3.0045e-12 | -5.2983e-16 |
| Early Mars | 0.3179 | 5.4513e-5 | 1.5313e-9 | -2.7786e-12 | -4.8997e-16 |

- Conservative zone (drawn on the orbit view) runs from moist greenhouse to maximum greenhouse. For the Sun it is 0.993–1.705 AU; the paper quotes 0.99–1.70 (tested).
- Optimistic zone runs from recent Venus to early Mars: 0.750–1.769 AU for the Sun (tested).
- Simple model: Kasting et al. 1993, 0.95–1.67 AU × √L (tested).
- Note: Kopparapu et al. 2014 revised the moist-greenhouse limit. We use the 2013 table as published.

Comparison with the art pack after Tesla's review (`tokens.css` `--ex-L-*` / `--ex-hz-*`):

| Class | Art assumption | Art HZ (AU) | Code at that L (and our assumed Teff) |
|---|---|---|---|
| M | 0.03 L☉ | 0.18–0.34 | 0.186–0.358 (3300 K) |
| K | 0.2 L☉ | 0.45–0.85 | 0.466–0.851 (4500 K) |
| G | 1 L☉ | 0.99–1.70 | 0.993–1.705 (5780 K) ✓ |
| F | 1.9 L☉, 6500 K | 1.3–2.2 | 1.331–2.219 ✓ (tested) |

The art pack does not give a Teff for M and K, and the small differences there come from that. The page never uses the hz_ring sprites or these token values. It draws the band from `habitableZone(L, Teff)` for each target star, so a token fix changes only colors.

## 10. Inclination view

Transits need cos i < (R* + Rp)/a, roughly R*/a. The window from edge-on is asin(R*/a). For an Earth–Sun twin, asin(R☉/1 AU) = 0.266°. The caption shows "about 0.27°" (the README says "about 0.25°"; the same idea, rounded differently). The geometric transit probability for a random orientation is ≈ R*/a, which is 0.47% for Earth. The view uses the student's period (giving a) and depth (giving k), and the student drags i.

## 11. Scoring (`scoreVerdict`)

- 40 points for the right class ("multi" counts as planet).
- For planets, up to 20 points each for period, radius and mass, compared with the planet whose period is closest to the guess. Full marks within 10%, falling linearly in |ln ratio| to 0 at a factor of 2.
- Non-transiting planets are scored on Mp sin i, and the radius gets full marks when left blank.
- Binary: 40 for the class, 20 for period, plus 40 (no planet properties to estimate). No planet: 100 when correct.

## 12. Known simplifications

- No red noise or systematics beyond one sinusoid. No transit-timing variations. No dilution from background stars.
- The small-planet LD approximation is evaluated at one point in the overlap. It is not exact Mandel–Agol for large k or grazing geometry (error up to a few percent of the depth for k ≈ 0.15).
- Multi-planet RV is a simple sum. There are no planet–planet interactions.
- The wobble on the orbit view is exaggerated, with the factor shown on the panel ("wobble ×N").
