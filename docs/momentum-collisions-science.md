# Momentum & Collisions Lab: science notes

Page: `public/study-momentum-collisions.html`. Physics: `public/momentum-collisions/momentum-physics.js` (pure, no DOM). Tests: `tests/momentum-physics.test.mjs` (`npm run test:momentum` in `tests/`).

All quantities are SI: kg, m, s, N, J. Motion on the track is one-dimensional; positive is to the right. Friction, air drag and rolling losses are ignored, so there is no net outside force along the track during a collision.

## Equations

1. Momentum: p = m v (a vector; on the track its sign gives the direction).
2. Kinetic energy: KE = (1/2) m v^2.
3. Conservation of momentum (no net outside force): m_A v_A + m_B v_B = m_A v_A' + m_B v_B'.
4. Coefficient of restitution: e = -(v_B' - v_A') / (v_B - v_A), the ratio of the speed of separation to the speed of approach.
5. Velocities after a 1D collision, from 3 and 4:
   v_A' = (m_A v_A + m_B v_B + m_B e (v_B - v_A)) / (m_A + m_B),
   v_B' = (m_A v_A + m_B v_B + m_A e (v_A - v_B)) / (m_A + m_B).
6. Collision types: e = 1 elastic (KE kept), 0 < e < 1 inelastic (some KE lost), e = 0 perfectly inelastic (the carts stick and move together).
7. Kinetic energy lost: KE_lost = (1/2) mu (1 - e^2) (v_A - v_B)^2, with reduced mass mu = m_A m_B / (m_A + m_B).
8. Center-of-mass velocity: v_cm = (m_A v_A + m_B v_B) / (m_A + m_B). It does not change in the collision.
9. Velocities in the CM frame: u = v - v_cm. The total momentum in the CM frame is zero, and after the collision u_A' = -e u_A, u_B' = -e u_B.
10. KE split (Koenig): KE = (1/2)(m_A + m_B) v_cm^2 + (1/2) mu (v_A - v_B)^2. Only the second term, the KE in the CM frame, can be lost, so KE_lost = (1 - e^2) x KE_cm.
11. Impulse-momentum theorem: J = integral of F dt = delta p. Impulses on the two carts are equal and opposite (Newton's third law), J_A = -J_B.
12. Barrier: a cart of mass m at speed v rebounds at -e v, so J = m (1 + e) v.
13. Force-time model: half-sine pulse F(t) = F_pk sin(pi t / dt) for 0 <= t <= dt. Then J = 2 F_pk dt / pi, F_pk = (pi/2) J / dt, average force F_avg = J / dt.
14. Cart velocity during contact: v(t) = v - (J / 2m)(1 - cos(pi t / dt)). The front is pushed in furthest when v(t) = 0, at t_stop = (dt / pi) arccos(1 - 2mv/J); crush = integral of v(t) from 0 to t_stop. For e = 0 this is v dt / 2.
15. Force in cart weights: F_avg / (m g) with standard gravity g = 9.80665 m/s^2 (exact by definition).
16. 2D glancing collision of frictionless pucks: puck 1 moves along +x at speed v, puck 2 is at rest, the sideways offset of the centers is b. The line of centers at contact makes angle phi = arcsin(b / 2R) with +x. The impulse acts only along that line: equation 5 applies to the velocity components along it, and the components along the tangent are unchanged. Then p_x and p_y are each conserved.
17. For equal masses and e = 1 (and b > 0) the two pucks leave at 90 degrees to each other. Puck 2 always leaves along the line of centers, at angle -phi.

## Values used

- Masses: 0.25 kg to 4.00 kg (log slider, 200 steps).
- Speeds: 0.10 m/s to 3.00 m/s (log slider) with Left, At rest and Right buttons.
- e: 0.05 to 1 (log slider), plus buttons for e = 1, e = 0.5 and e = 0 ("Stick together").
- Contact time dt: 5 ms to 500 ms (log slider); buttons "Rigid wall (5 ms)" and "Crumple zone (100 ms)". These are illustrative model values, not measured car data.
- Puck offset b / 2R: 0.05 to 0.95 (log slider), plus "Head-on (b = 0)". Puck radius R = 4 cm.
- Cart length 0.50 m plus 5 cm bumpers (drawing scale only; carts touch when centers are 0.60 m apart).
- Presets: Elastic (1 kg at 2 m/s into 2 kg at rest, e = 1), Inelastic (same, e = 0.5), Sticky (same, e = 0), Equal masses (1 kg at 2 m/s into 1 kg at rest, e = 1), Head-on (1 kg at 1.5 m/s and 1 kg at -1.5 m/s, e = 1), Heavy into light (4 kg at 1 m/s into 0.25 kg at rest, e = 1). Barrier default 1 kg at 2 m/s, e = 0.2, dt = 100 ms.
- Worked numbers shown by the defaults: Elastic preset gives v_A' = -0.67 m/s, v_B' = 1.33 m/s, total p 2.00 kg m/s before and after, KE 2.00 J before and after. Sticky gives 0.67 m/s together and keeps 0.67 J of 2.00 J. Barrier default: J = 2.40 N s, F_avg = 24.0 N (2.45 cart weights), F_pk = 37.7 N, rebound -0.40 m/s.
- Every slider is logarithmic so a slider value changes by less than 2x per step (test: no shown value jumps 2x or more between adjacent steps, except values that pass through zero, which the physics itself does when a cart reverses).
- Animation: carts move at real speed; the barrier contact is replayed so it lasts 1.5 s on screen (the page states the slow-down factor); pucks are shown at 1/4 speed. Collisions between carts are treated as instantaneous.

## Claims shown to students

- Momentum is a vector; on a track its sign says which way.
- With no outside push along the track, total momentum is the same before and after every collision.
- Kinetic energy is kept only when e = 1; otherwise some becomes heat, sound and deformation.
- Impulse is force times time, the area under the force-time curve, and equals the change in momentum.
- The same impulse spread over a longer time needs a smaller force; crumple zones, airbags and padding work this way.
- The center of mass moves at a steady velocity before, during and after the collision. In the CM frame the carts have equal and opposite momenta and each velocity reverses and shrinks by the factor e.
- In 2D, momentum is conserved in x and in y separately; frictionless pucks push only along the line joining their centers; equal masses in an elastic glancing collision leave at 90 degrees.

## Simplifications

- The half-sine force pulse is a model. Real crash pulses have other shapes; the area (impulse) is fixed by the momentum change whatever the shape, while the peak-to-average ratio (pi/2 here) depends on the shape.
- The drawn crumple zone shows at most 70% of the bumper squeezing; the readout gives the modeled crush distance.
- Puck spin and table friction are ignored.

## Sources

- OpenStax, University Physics Volume 1, Chapter 9 "Linear Momentum and Collisions" (9.2 Impulse and Collisions, 9.3 Conservation of Linear Momentum, 9.4 Types of Collisions, 9.5 Collisions in Multiple Dimensions, 9.6 Center of Mass). https://openstax.org/books/university-physics-volume-1/pages/9-introduction
- OpenStax, College Physics 2e, Chapter 8 "Linear Momentum and Collisions" (8.2 Impulse, including padding and longer stopping times; 8.6 Collisions of Point Masses in Two Dimensions: equal masses in an elastic glancing collision separate at 90 degrees). https://openstax.org/books/college-physics-2e/pages/8-introduction
- HyperPhysics, "Coefficient of restitution" and "Elastic and inelastic collisions". http://hyperphysics.phy-astr.gsu.edu/hbase/elacol.html
- D. Kleppner and R. Kolenkow, An Introduction to Mechanics, 2nd ed., Chapter 4 (momentum, center-of-mass frame, collisions).
- BIPM, The International System of Units (SI Brochure, 9th ed.), standard acceleration of gravity g_n = 9.80665 m/s^2. https://www.bipm.org/en/publications/si-brochure
