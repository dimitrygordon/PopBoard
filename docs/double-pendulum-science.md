# Chaos and the Double Pendulum: science notes

Page: `public/study-double-pendulum.html` (modes via `?mode=`: `sensitivity`, `phase`, `determinism`, `regimes`, `prediction`, `sandbox`).
Physics: `public/double-pendulum-physics.js` (pure, tested in `tests/double-pendulum-physics.test.mjs`).

## Model
Two point bobs on massless rigid rods with frictionless pivots. Angles are measured from straight down.
The equations of motion come from the Lagrangian (see the file header for the exact formulas).
Fixed defaults outside the sandbox: L1 = L2 = 1 m, g = 9.81 m/s^2, m1 = 2 kg, m2 = 1 kg.
The sandbox lets students set L1, L2 (0.5 to 2 m), g (1 to 25 m/s^2), masses (0.5 to 5 kg), angles and playback speed.

## Integrator
Classical RK4 with a fixed 0.5 ms step, the same scheme the single-pendulum module uses. The frame rate never changes the step.
RK4 is not symplectic, so energy drifts slowly. The page shows (E - E0) / E_scale, where E_scale is the energy needed to raise both rods from straight down to straight up.
In tests the drift stays below 1e-9 of that scale over 30 s of chaotic motion. On screen it reads around 1e-13 after several seconds.

## Separation and the Lyapunov-style estimate
Separation is the phase-space distance between the two runs: sqrt(dθ1² + dθ2² + (dω1² + dω2²) L1/g). The angle gaps are wrapped.
The estimate is the least-squares slope of ln(separation) against time. It runs from t = 0.5 s until the separation first reaches 0.3, the point where it saturates.
This is a finite-time estimate from one pair of runs. It is not the true largest Lyapunov exponent, which would need repeated renormalisation over long times.

Measured values for the default 120 deg / -10 deg start with a 0.001 deg offset: λ ≈ 0.85 to 0.97 /s, so the gap doubles roughly every 0.7 to 0.8 s.
For the 10 deg / 10 deg start the fitted slope is about 0. That swing is regular, quasi-periodic motion.
Big swings are usually chaotic, not always, so the page says "usually".

## Phase space
The phase plot is a picture of the motion: each rod's angle against its angular speed, traced over time. It shows the path of this one run, nothing more.

## Prediction horizon
A forecast is counted as failed once either rod angle differs by more than 10 deg.
Simulated horizons for the default start:

| Starting error | Forecast holds for |
|---|---|
| 0.1 deg | 5.8 s |
| 0.01 deg | 7.2 s |
| 0.001 deg | 9.5 s |
| 1e-4 deg | 10.8 s |
| 1e-5 deg | 12.4 s |
| 1e-6 deg | 14.0 s |
| 1e-7 deg | 16.3 s |
| 1e-8 deg | 17.8 s |

Each 10x improvement in the starting measurement adds about 1.7 s (least-squares fit over the table: 1.72 s per decade).
If the gap grew at one steady rate λ, each decade would add ln(10)/λ. Reading that backwards, 1.72 s per decade implies an effective rate of ln(10)/1.72 ≈ 1.34 /s. The page shows both numbers side by side: "Each 10x better start buys 1.7 s" and "Growth rate this implies 1.34 /s".

Why this is faster than the 0.85 to 0.97 /s from the Butterfly effect mode (checked with the physics module, default start):
- Growth is not steady. Local slopes of ln(separation) over 2 s windows for a 1e-8 deg start run 0.46 /s (0 to 2 s), 1.45, 0.76, 1.96, 1.51, 1.08, 1.58, 1.17 /s. The first couple of seconds are slow.
- The 0.001 deg Butterfly fit covers 0.5 to 9.5 s and so is weighted by that slow start. The extra time bought by tiny starting errors is spent later, from about 6 to 18 s, where growth is faster. Fitting the 1e-8 deg run over 0.5 to 17.9 s already gives 1.22 /s.
- The 10 deg threshold matters little: thresholds of 1, 3, 10 and 30 deg give 1.88, 1.79, 1.72 and 1.63 s per decade.
So the two numbers measure growth over different parts of the motion; they do not contradict each other. Students see the prediction text say that growth speeds up later in the motion, so the implied rate is higher than the Butterfly effect estimate.
A ten-million-fold better measurement only triples the forecast. This is why long-term prediction fails even though the laws are exact.

## Determinism
Two runs from bit-identical numbers stay bit-identical, so the separation is exactly 0. A replay reproduces the earlier run to 0 m.
The replay matches exactly because the computer repeats the same arithmetic exactly. A real pendulum can't be restarted that precisely.
Chaos is extreme sensitivity, not randomness.

## Small-angle check
For small swings, the linearised normal modes with equal rods and masses have ω = sqrt((g/L)(2 ∓ sqrt2)) = 2.40 and 5.79 rad/s.
The test starts the slow mode with θ2 = sqrt2 θ1 and matches its period to better than 0.1 %.

## Art
Sprite anchors were measured from the files:
- pivot-mount pin at (256, 300)
- rod holes at (32, 32) and (992, 32)
- bob centre at (128, 128) with radius 100
- lab-stand arm tip at about (701, 243). MANIFEST.md lists (701, 341); the alpha channel puts it near y = 243. The stand is decorative only, and the pendulum hangs from pivot-mount.

The orange comparison bob is bob-mask tinted in code. The art carries its own light halo for dark mode.
