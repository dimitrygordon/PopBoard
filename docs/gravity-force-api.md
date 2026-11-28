# Gravity Force Lab: API for the scene side

Off-headset half of the Gravity Force VR lab (teaching spec v1.2). These modules own the numbers, the URL, and the equation panel. Scene code should import them and not retype a mass, a radius, or a force.

The scene side is in `study-gravity-force.html` and the files below the table (see "Scenes and headset").

## Files

| File | Role |
|---|---|
| `public/gravity-force/gf-sim.js` | Constants and pure physics. No DOM. |
| `public/gravity-force/gf-state.js` | `parseState` / `serializeState`. No DOM. |
| `public/gravity-force/gf-panel.js` | Equation strip, Set A / Set B, answer key. DOM only in the two render functions. |

Run the checks with:

```
node --test tests/gf-sim.test.mjs tests/gf-state.test.mjs tests/gf-panel.test.mjs
```

## Constants

`export const GF` is the only constants object. `pull` and the other functions read `GF.G`, which is `6.6743e-11`. `GF.GStudent` is `6.674e-11`, the value students write on paper (section 6.3). Do not point the sim at `GStudent`.

Worlds on `GF.worlds` are `earth`, `moon`, `mars`, `jupiter`, and `ns` (1.4 Suns, radius 12 km, so about 24 km across). Each has `massKg` and `radiusM`.

Also on `GF`: the 50 kg traveler (`travelerKg`), ISS altitude 400 (`issAltKm`), Earth-Moon distance (`earthMoonM`), 1 AU (`auM`), Sun mass and the IAU solar radius (`sunMassKg`, `sunRadiusM`), the same-mass twin (`twinMassKg`, equal to the Sun), bowling ball 7.3 kg, the two students, the 1,000 kg satellite at `7.0e6` m, the white dwarf (0.6 Suns, 9,000 km), the 10 Sun example black hole, and the sheet strengths (`GF.sheet`: Earth 1, white dwarf 5, Sun 8, black hole 16). S2 chips are `GF.chips` (`ball`, `earth`, `sun`, `wd`).

`GF.sunRadiusM` is not in the section 3.1 table. It is the IAU nominal radius, `6.957e8` m, so "above the Sun's radius" has a length. Surface g there is 274.2 m/s^2.

`GF.sunGmQuoted` (`1.32712440018e20`) is the parenthetical GM in the spec. `GF.G * GF.sunMassKg` is about 0.003 percent higher. Forces use `G` times the listed mass.

The lab ignores spin. Neutron-star results are Newton's law only.

## Sim

```
pull(m1, m2, r) -> newtons
surfaceG(world) -> m/s^2
weighN(world, kg) -> newtons
timesEarth(world) -> g / g_earth
worldsBySurfaceG() -> ["moon", "mars", "earth", "jupiter", "ns"]
lbFromN(n) -> { lbf, pounds, text }
s3NewtonText(world) -> "491 N" or "1,240 N" or "about 6.5 x 10^13 N"
issAt(altKm) -> { ratio, g, pull, speedKms, periodMin }
moonDistanceRatio() -> (R_earth / Earth-Moon distance)^2
distanceFactor(times) -> 1 / times^2
massFactor(aTimes, bTimes) -> aTimes * bTimes
accelOf(mass, otherMass, r) -> m/s^2
pairForce(m1, m2, r) -> { on1, on2 }   // always equal
s2Arrows(m1, m2, r) -> { a, b }         // always the same length
s1ArrowLength(distanceRatio, startLength = 0.2) -> meters, capped at 4x
sameMassTwin(r, kg = 1) -> { sun, twin, aboveSurface }
bhHorizonText() -> "about 29.5 km"
wellDepth(s, r, e) -> -s / sqrt(r^2 + e^2)
marbleAccel(x, y, s, e) -> { ax, ay }   // toward the origin
stepMarble(state, dt) -> next state
roundSig(n, sig)
formatSci(n, sig) -> "1.98 x 10^20"
```

`issAt(altKm).pull` is the pull on the 50 kg traveler. `speedKms` and `periodMin` are the circular orbit at that radius. The URL only allows altitudes 0, 100, 400, 35786, and 384400. `issAt` itself accepts any altitude, including 420.

`lbFromN` is the only pound conversion. S3 calls it. Nobody else should. It divides newtons by `4.4482216152605`, then rounds to the nearest pound. At or above a million pounds-force it keeps two significant figures. The neutron star label is `about 15 trillion pounds`. Pass the unrounded `weighN` result, not a pre-rounded newton value. `lbf` is the exact quotient, `pounds` is the rounded number, and `text` is the label (`about 110 lb`).

Build the spring-scale face from the two pieces. Newtons from `s3NewtonText`, pounds from `lbFromN`:

```
s3NewtonText("earth")                         // "491 N"
lbFromN(weighN("earth", GF.travelerKg)).text  // "about 110 lb"
```

`weighN("jupiter", 50)` stays the unrounded 1239.33 N. Every student-facing newton line uses three significant figures, so `s3NewtonText("jupiter")` and `formatNewtons` of that pull are both `1,240 N`. `lbFromN` of the unrounded pull is still `about 279 lb`.

`GF.bhHorizonM` stays 29530 (29.53 km). The student line is `bhHorizonText()`, `about 29.5 km`.

`stepMarble` takes one velocity-Verlet step of exactly `dt`. It does not subdivide, and it does not read `state.mass`.

```
state = { x, y, vx, vy, s, e, mass }
```

`s` is the strength in `a = s r / (r^2 + e^2)^1.5`. The spec writes that as an inward magnitude. `marbleAccel` points toward the origin. Sheet play can pass a strength from `GF.sheet`. A real-mass flick passes `G * mass` as `s` only if the scene wants meters and newtons. The marble's mass does not belong in `s`.

The same-mass twin is a 1 Sun black hole. `sameMassTwin(r)` is equal at every r, including above the Sun's radius. Stopping a marble at the Sun's surface is the scene's job. Do not give the twin the 10 Sun sheet strength (16). Far from the Sun the twin uses the Sun's mass.

## URL state

```
parseState(url | search | URL) -> state
serializeState(state) -> query string, no "?"
defaultState()
canSetHelp(level, source, state) -> boolean
isLocked(state, group) -> boolean
flags.HELP2_REQUIRES_URL   // boolean, default false
```

All params are optional. A bad value falls back to the default and does not throw. Unknown keys come back on `state.extra` and survive `serializeState`. Defaults are omitted from the query string.

| Param | Values | Default |
|---|---|---|
| `scene` | `pull`, `mass`, `weigh`, `iss`, `well` | `pull` |
| `help` | `0`, `1`, `2` | `0` |
| `lock` | comma list of `help`, `scene`, `predict` | none |
| `dist` | 0.25 to 4 | 1 |
| `a`, `b` | `ball`, `earth`, `sun`, `wd` | `earth`, `sun` |
| `world` | `earth`, `moon`, `mars`, `jupiter`, `ns` | `earth` |
| `alt` | 0, 100, 400, 35786, 384400 | 0 |
| `obj` | `earth`, `wd`, `sun`, `bh` | `earth` |
| `twin` | 0 or 1 | 0 |
| `ui` | 0 or 1 | 1 |
| `v` | integer | 1 |

`state.twin` and `state.ui` are booleans. `state.lock` is an array in the order `help`, `scene`, `predict`.

`canSetHelp(level, source, state)`:

- `source` is `"url"` or `"qr"` for the address bar. Any other string is the Help tab.
- `lock` containing `"help"` refuses a level that is not already `state.help`.
- `flags.HELP2_REQUIRES_URL` defaults to `false`, so levels 0, 1, and 2 can all be chosen from the Help tab. Dimitry has not decided the QR gate. Set that one property to `true` and level 2 is accepted only from `"url"` or `"qr"`. `parseState("help=2")` still returns help 2 either way. The flag gates later changes, which is what the Help tab checks.

Spec section 5 and acceptance test T15 describe the `true` setting. This build ships `false` until that decision is made.

## Panel

```
equationModel({ m1, m2, r, help, previous }) -> { help, visible, form, text, tiles, notes, force }
changeNotes(prev, next) -> [{ tile, text }]
formatNewtons(n, sig = 3) -> "491 N" or "1,240 N" or "1.98 x 10^20 N"
formatValue(n) -> tile text
workedProblems() -> Set A, Set B, and exit item E1
problemById(id)
formatAnswer(id, help) -> "" when that level hides the answer
helpButtons(state) -> [{ level, label, selected, enabled }]
panelMarkup(opts) -> HTML string
renderPanel(container, opts) -> HTML string, and sets container.innerHTML
answerKeyMarkup() / renderAnswerKey(container)
RATIO_RULES, WATCH_FOR, TEACHER_NOTES
```

Help 0 renders no formula, no G, and no newtons. Help 1 renders "F is proportional to m1 x m2 / r^2." and the Set A ratio answers. Help 2 renders `F = G x m1 x m2 / r^2` with values, Set A, Set B, and the exit ticket. `previous` draws the change bubbles (`m1 x2`, `r x2 so r^2 x4`).

Worked answers are computed from `gf-sim`, then rounded to the printed section 6.3 lines (491 N, 1.98 x 10^20 N, 2.0 x 10^-7 N, 3.54 x 10^22 N, 435 N at 88.5 percent, and so on). The panel does not contain a pound label. S3 is the only place that calls `lbFromN`.

## Scenes and headset

| File | Role |
|---|---|
| `public/study-gravity-force.html` | The page. Study library entry `gravity-force` in `public/study.html`. |
| `public/gravity-force/gf-scenes.js` | S1 to S5 as pure models: `sceneModel(lab)`, `controlsFor(lab)`, `act(lab, id, canSetHelp)`. No DOM. The page and the headset panel both draw from it. Two views sit on top of the URL scenes: S5c "Real or model?" (`view:sort`, inside S5) and S6 "The Equation" (`view:eq`, inside S1). `?view=sort` or `?view=eq` opens them. |
| `public/gravity-force/gf-paint.js` | Leo's painted style B: banded painted tone with warm cream highlights, ink outlines in screen pixels, line boil at 8 fps, and screen-space fat lines (marble paths, the orbit). Calm lines holds the boil still. |
| `public/gravity-force/models/` | Angelo's four meshopt GLBs (spring scale v4.2, balance v2.2, robot v3.2, step platform). Dimitry's exception to the no-GLB rule; nothing else of Angelo's goes in the repo. |
| `public/gravity-force/gf-view.js` | three.js scenes in real metres (student at the origin, floor at y = 0, local-floor). |
| `public/gravity-force/gf-props.js` | S3 props built in code at Angelo's real sizes. |
| `public/gravity-force/gf-xr.js` | Headset panel (one canvas texture, Leo's readout dial) and the Quest 3 button map. |
| `public/gravity-force/gf-main.js` | Renderer, flat panel, pointer and keys, WebXR session. |

Run `node --test tests/gravity-force-vr.test.mjs`. It covers T13 to T19 that can run without a headset.

**Props.** `MODEL_BASE` in `gf-props.js` is `models/`, relative to the module, so popboard.us and every branch preview load the same four GLBs (about 1.1 MB in total) with GLTFLoader and the meshopt decoder. The code-built props draw first and stay as the fallback if a load fails. The S3 traveler is the robot on every world, standing at scale-local (0, 0.0485, -0.086). The scale needle turns about the hub (angle_Y = -45 deg - 270 deg x f) and the numbers are drawn on the blank readout node. The balance beam pivots at (0, 0.300, 0) with the pans counter-rotated. Angelo's unlit paint is kept; the painted treatment only adds the ink outline shell. The code-built traveler (legs half its height) rides the S4 elevator cab.

**Labels.** One style: a cream pill with warm ink Inter semibold, upright and facing the camera, sized every frame from distance (16 CSS px, 15 on phones, and 56 panel px at 1.2 m in the headset), with a small declutter pass on flat screens.

**Headset controls.** Ray plus trigger (or a hand pinch) presses panel buttons, drags the S1 Moon and flicks from the S5 start ball. Right A flicks a marble. Right thumbstick press goes to the next scene. Left thumbstick steps through the scene's chips. Right thumbstick left and right nudges the Moon. Grip held pauses motion. B or Y shows or hides the panel. The rail gives a haptic tick at each whole number.

**Flat keys.** 1 to 5 pick a scene, 6 opens S5c and 7 opens S6, arrow keys move the Moon, Space pins (S1, S6) or flicks (S5), C toggles Calm lines, E shows or hides the equation (help 1 and 2).
