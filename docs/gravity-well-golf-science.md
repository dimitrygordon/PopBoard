# Gravity Well Golf module: science reference

Every number and science claim the Gravity Well Golf module (`public/study-gravity-well-golf.html`, slug `gravity-well-golf`) shows to students. Physics: `public/gravity-well-golf/gwg-physics.js`. View: `public/gravity-well-golf/gwg-scene.js`. Tests: `tests/gravity-well-golf.test.mjs` (`npm run test:gravitywellgolf`). Rules from Leo's notes (`modules/gravity-well-golf/LEO-NOTES.md`) are followed as written.

Status: every row is TODO-TESLA except the caveat text, which is Tesla's own wording, copied verbatim.

## Caveat card (first load and behind "?")

> "This stretchy sheet is a model, not the real thing. In the model, the ball rolls into the dents because Earth's gravity pulls it down. Real gravity has no 'down' to roll toward: mass curves space and time themselves, and objects follow those curves."

Source: Tesla, via LEO-NOTES.md. Stored as `CAVEAT` in `gwg-physics.js`; a test checks it character for character. It opens on first load (until "Got it" is pressed, `popboard.gravity-well-golf.caveatSeen`) and any time from the "?" button.

## Claims

| # | Where | Claim | Code | Status |
|---|---|---|---|---|
| 1 | Label under the field, caveat card, sr-only intro | "Pull: Newtonian, 1/r² toward each mass." The ball moves under a Newtonian inverse-square pull from every mass, a = G·M·r̂ / r², summed. | `accel()` | TODO-TESLA |
| 2 | Physics only (not shown) | The pull is softened near each center, a = GM·r / (r² + s²)^1.5 with s = 0.35, so it stays finite. Far from a mass (r ≫ s) it is 1/r². | `P.soften` | TODO-TESLA |
| 3 | Label, caveat card | "The cup's grab and the slow-down are game friction, not gravity." Rolling friction (exp decay, 0.18 per s) and cup capture are game rules. | `P.friction`, `P.cupR`, `P.cupMaxSpeed` | TODO-TESLA |
| 4 | Sandbox "Friction" off | With friction off the motion is frictionless and the integrator is symplectic (semi-implicit Euler), so orbits do not decay or grow (tests check energy drift). A real rubber sheet would not give true orbits; this game uses the Newtonian pull, not a sheet. | `step()` | TODO-TESLA |
| 5 | The drawn sheet | The dent depth follows the softened potential, -Σ k·GM / √(r² + s²) (k = 0.09, s = 0.6), capped at 2.2 units. Visual only: the ball's motion does not come from the slope of the drawing. | `depth()` | TODO-TESLA |
| 6 | Copy | The word used is "curved spacetime". "Dent" appears only inside Tesla's caveat. | `MODEL_LABEL`, html intro, study card | TODO-TESLA |
| 7 | Masses | Relative pull strengths (G·M, game units): moon 2, planet 6, star 14, heavy mass 30. Sizes on screen follow the sprite manifest (2x, 3.5x, 5x, 6x the ball). Neither is to scale. | `KINDS` | TODO-TESLA |
| 8 | Bounces | Bounces off walls and mass surfaces keep 0.6 of the normal speed (game rule). | `P.restitution` | TODO-TESLA |
| 9 | Putt | Putt speed = 3.2 × pull-back length, capped at 9 units/s. | `puttVelocity()` | TODO-TESLA |
| 10 | Study library card | "moons, planets, stars and a heavy mass pull the ball with a Newtonian 1/r² pull", "a stretchy sheet that models curved spacetime", "The sheet is an analogy". | `public/study.html` | TODO-TESLA |

## Art rules from Leo (no numbers to check, listed for review)

- The ball is the only gold on screen; UI accents are teal (`--fun-gold` is mapped to teal for this page).
- The collision puff fades out over 280 ms (`PUFF_MS`).
- Every sprite texture, the heavy mass included, is mipmapped with trilinear and anisotropic filtering.
- A teal additive glow ring is drawn in code at the cup (normal blending on Paper, where additive would vanish).
