// Newton's Cannonball Fire: student-facing prompt and question text.
// SOCRATES: every entry below is a PLACEHOLDER draft written by Turing. Replace the text, keep the keys.
// TESLA: every number is computed in ncf-physics.js and marked pending.
// Rules: plain text or simple HTML for math, no em dashes.
export const PLACEHOLDER = true;
export const TESLA_PENDING = true;

export const STRINGS = {
  title: "Newton's Cannonball Fire",
  intro: "Section 7.2: Using the Law of Universal Gravitation. Fire a cannon from a tall mountain. Faster shots land farther away, until one falls around Earth and never lands.",
  scaleNote: "The mountain is not to scale. The thought experiment ignores air resistance.",
  sandboxTitle: "Sandbox",
  deriveTab: "Derive it",
  practiceTab: "Practice",
  fire: "Fire",
  clear: "Clear",
  speedLabel: "Launch speed",
  heightLabel: "Mountain height",
  readoutV: "v",
  readoutOrbit: "v_orbit",
  readoutEsc: "v_esc",
  readoutPeriod: "Period",
  readoutOutcome: "Outcome",
  presetsLabel: "Preset shots",
  applyFire: "Set the slider to your answer and fire",
  applyMoon: "This one is on the Moon, so the Earth sandbox stays put.",
  applyPlanet: "This one is not Earth, so the Earth sandbox stays put.",
  teslaMark: "Numbers pending Tesla.",
  socratesMark: "Wording is a placeholder for Socrates.",
  notToScale: "Not to scale.",

  derive: {
    title: "Derive it: orbital speed and period",
    lead: "Start from circular motion and gravity, the way the chalkboard notes do. The notes label the circular speed v_esc. That name is reserved for escape speed, so the circular result is written v_orbit here.",
    steps: [
      {
        title: "Net force in a circle",
        body: "For uniform circular motion, the net force toward the center is the centripetal force.",
        eq: "ΣF = m v² / r"
      },
      {
        title: "Gravity supplies that force",
        body: "The only inward force on the cannonball (no air, no engines) is gravity, so set F_g equal to that centripetal force.",
        eq: "F_g = m v² / r"
      },
      {
        title: "Write gravity as weight at radius r",
        body: "At a distance r from the center, the free-fall acceleration is g (not necessarily the surface value). So F_g = m g.",
        eq: "m g = m v² / r"
      },
      {
        title: "Solve for speed",
        body: "Cancel m, then solve for v. This is the circular orbital speed, v_orbit. The chalkboard notes labeled this v_esc. Escape speed is a different, faster value, derived in the last steps.",
        eq: "v_orbit = √(r g)"
      },
      {
        title: "How long is one lap?",
        body: "Speed is distance over time. One full circle has length 2πr, and that takes period T.",
        eq: "v = Δd / Δt = 2πr / T = √(r g)"
      },
      {
        title: "Solve for the period",
        body: "Rearrange 2πr / T = √(r g).",
        eq: "T = 2πr / √(r g)"
      },
      {
        title: "Where g comes from",
        body: "Universal gravitation says F_g = G M m / r², so the free-fall acceleration at radius r is g = G M / r². Put that into v_orbit = √(r g) and you get the general form.",
        eq: "v_orbit = √(G M / r)"
      },
      {
        title: "Escape speed is faster",
        body: "To leave and not come back, the launch speed must reach escape speed. That is √2 times the circular orbital speed at the same r.",
        eq: "v_esc = √(2 G M / r) = √(2 r g) = √2 × v_orbit"
      }
    ]
  },

  problems: [
    {
      id: "surface",
      title: "1. Circular orbit at Earth's surface",
      prompt: "Treat Earth as a smooth sphere with no air and no mountains. Find the circular orbital speed and the period for a launch at Earth's surface. Use v_orbit = √(G M / r) and T = 2πr / v_orbit, with r = R_E.",
      apply: "surface",
      steps: [
        { title: "What we know", body: "r = R_E = {R}. G M_E is the Tesla-verified value {GM}." },
        { title: "Physics idea", body: "Circular orbit: v_orbit = √(G M / r). Period: T = 2πr / v_orbit." },
        { title: "Work", body: "v_orbit = √({GM} / {R}). T = 2π × {R} / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec} = {Tmin}." }
      ]
    },
    {
      id: "iss",
      title: "2. Circular orbit 400 km up (ISS height)",
      prompt: "The International Space Station flies about 400 km above Earth's surface. Find v_orbit and the period at that height. Use g at that radius if you start from v = √(r g), or use v = √(G M / r) directly.",
      apply: "iss",
      steps: [
        { title: "What we know", body: "h = {h}. r = R_E + h = {r}. G M_E = {GM}." },
        { title: "g at this height", body: "g = G M / r² = {g}." },
        { title: "Physics idea", body: "v_orbit = √(G M / r) = √(r g). T = 2πr / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec} = {Tmin}." }
      ]
    },
    {
      id: "escapeSurface",
      title: "3. Escape speed at Earth's surface",
      prompt: "Find the escape speed at Earth's surface, and show that it is √2 times the circular orbital speed from problem 1.",
      apply: "escapeSurface",
      steps: [
        { title: "What we know", body: "r = R_E = {R}. v_orbit at this r is {vOrbit}." },
        { title: "Physics idea", body: "v_esc = √(2 G M / r) = √2 × v_orbit." },
        { title: "Solve", body: "v_esc = {vEsc}. Check: √2 × {vOrbit} = {vEsc}." }
      ]
    },
    {
      id: "moon",
      title: "4. A cannon on a tall lunar mountain",
      prompt: "A very tall mountain on the Moon has a cannon that fires a projectile into a circular orbit 75 km above the lunar surface. Find the projectile's speed and the time for one orbit. (Moon: M = 7.35 × 10²² kg, radius 1.74 × 10⁶ m.) These givens match Physics 101 Module 7 Lesson 2, Study Question 16.",
      apply: null,
      applyNote: "applyMoon",
      steps: [
        { title: "What we know", body: "h = 7.5 × 10⁴ m, so r = 1.74 × 10⁶ + 7.5 × 10⁴ = {r}. Unknown v and T. Use G = 6.67 × 10⁻¹¹ N·m²/kg², the value in that Study Question." },
        { title: "Physics idea", body: "v_orbit = √(G M / r). T = 2πr / v_orbit." },
        { title: "Work", body: "G M = (6.67 × 10⁻¹¹)(7.35 × 10²²). r = {r}." },
        { title: "Solve", body: "v_orbit = {v} = {vSci}. T = {Tsec} = {Tmin}." }
      ]
    },
    {
      id: "planetX",
      title: "5. A different planet, using g",
      prompt: "A planet has radius r = 2.50 × 10⁶ m, and the free-fall acceleration at that radius is g = 4.00 m/s². Find the circular orbital speed and the period. Use the chalkboard form v_orbit = √(r g) and T = 2πr / √(r g).",
      apply: null,
      applyNote: "applyPlanet",
      steps: [
        { title: "What we know", body: "r = {r}, g = {g}." },
        { title: "Physics idea", body: "v_orbit = √(r g). T = 2πr / √(r g)." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec} = {Tmin}." }
      ]
    },
    {
      id: "mountain",
      title: "6. Circular orbit from the sandbox mountain",
      prompt: "The sandbox mountain defaults to 150 km, the height Lesson 7.2 gives for sitting above most of the air. Find v_orbit and the period at that launch radius, then set the slider to your answer and fire the red shot.",
      apply: "mountain",
      steps: [
        { title: "What we know", body: "h = {h}, so r = R_E + h = {r}." },
        { title: "Physics idea", body: "v_orbit = √(G M / r). T = 2πr / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec} = {Tmin}." }
      ]
    }
  ]
};
