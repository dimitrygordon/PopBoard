// Newton's Cannonball Fire: student-facing prompt and question text.
// Socrates delivered the wording (drop-in STRINGS, same keys and placeholder tokens).
// Tesla cleared the physics and the numbers (G, Moon values, PLANET_X, and the computed answers).
// peakNote is a Turing addition for Tesla's 8 km sandbox note, written in Socrates' style.
export const PLACEHOLDER = false;
export const TESLA_PENDING = false;

export const STRINGS = {
  title: "Newton's Cannonball Fire",
  intro: "Newton imagined a cannon on top of a very tall mountain. Fire slowly and the ball lands nearby. Fire faster and it lands farther away, because Earth's surface curves away beneath it. Fire fast enough and the ball keeps falling but never reaches the ground. That is an orbit. Lesson 7.2: Using the Law of Universal Gravitation.",
  scaleNote: "The mountain is drawn much taller than any real mountain so you can see it. There is no air resistance in this thought experiment.",
  sandboxTitle: "Sandbox",
  deriveTab: "Derive it",
  practiceTab: "Practice",
  fire: "Fire",
  clear: "Clear shots",
  speedLabel: "Launch speed",
  heightLabel: "Mountain height",
  readoutV: "v",
  readoutOrbit: "v_orbit",
  readoutEsc: "v_esc",
  readoutPeriod: "Period",
  readoutOutcome: "Outcome",
  presetsLabel: "Try a preset shot",
  applyFire: "Set the launch speed to your answer, then fire to check it.",
  applyMoon: "This problem is on the Moon, so the Earth sandbox stays the same.",
  applyPlanet: "This problem is on a different planet, so the Earth sandbox stays the same.",
  teslaMark: "Numbers are being double-checked.",
  socratesMark: "Wording is still a draft.",
  notToScale: "Not to scale.",

  peakNote: "Fired from an 8 km peak, so the speed is slightly lower than the surface answer.",

  derive: {
    title: "Derive it: orbital speed and period",
    lead: "Why does one launch speed give a perfect circle? Build the answer one step at a time, starting with circular motion and gravity. We call the circular speed v_orbit. Escape speed, v_esc, is a different and faster speed, and it comes last.",
    steps: [
      {
        title: "Net force in a circle",
        body: "Anything moving in a circle at constant speed needs a net force pointing toward the center. That center-pointing net force is the centripetal force.",
        eq: "ΣF = m v² / r"
      },
      {
        title: "Gravity supplies that force",
        body: "With no air and no engines, gravity is the only force on the cannonball, and it points toward Earth's center. So gravity has to be the centripetal force.",
        eq: "F_g = m v² / r"
      },
      {
        title: "Write gravity as weight",
        body: "The ball's weight is m g, where g is the free-fall acceleration at distance r from the center. Far above the surface, g is smaller than 9.8 m/s².",
        eq: "m g = m v² / r"
      },
      {
        title: "Solve for speed",
        body: "The mass m appears on both sides, so it cancels. Any cannonball, heavy or light, needs the same speed. Solve for v to get the circular orbital speed.",
        eq: "v_orbit = √(r g)"
      },
      {
        title: "How long is one lap?",
        body: "Speed is distance divided by time. One lap around a circle is the circumference, 2πr, and the time for one lap is the period, T.",
        eq: "v = Δd / Δt = 2πr / T = √(r g)"
      },
      {
        title: "Solve for the period",
        body: "Rearrange the last equation so T is by itself.",
        eq: "T = 2πr / √(r g)"
      },
      {
        title: "Where g comes from",
        body: "The law of universal gravitation gives F_g = G M m / r². Divide by m and you get g = G M / r². Put that into v_orbit = √(r g). This form works for any planet or moon if you know its mass M.",
        eq: "v_orbit = √(G M / r)"
      },
      {
        title: "Escape speed is faster",
        body: "At v_orbit the ball falls around Earth forever. To leave and never come back, it needs escape speed, which is √2 times v_orbit (about 1.41 times as fast) at the same r.",
        eq: "v_esc = √(2 G M / r) = √(2 r g) = √2 × v_orbit"
      }
    ]
  },

  problems: [
    {
      id: "surface",
      title: "1. Orbiting at Earth's surface",
      prompt: "Pretend Earth is a perfectly smooth ball with no air and no mountains. How fast would a cannonball launched sideways at the surface need to go to orbit, and how long would one lap take?",
      apply: "surface",
      steps: [
        { title: "What we know", body: "The ball starts at Earth's surface, so r = R_E = {R}. G M_E = {GM}." },
        { title: "Physics idea", body: "Gravity provides the centripetal force, so v_orbit = √(G M / r). One lap is 2πr, so T = 2πr / v_orbit." },
        { title: "Work", body: "v_orbit = √({GM} / {R}). T = 2π × {R} / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec}, or {Tmin}." }
      ]
    },
    {
      id: "iss",
      title: "2. Orbiting at ISS height",
      prompt: "The International Space Station flies about 400 km above Earth's surface. Find its orbital speed and period. Hint: r is measured from Earth's center, not from the ground.",
      apply: "iss",
      steps: [
        { title: "What we know", body: "h = {h}. Add Earth's radius: r = R_E + h = {r}. G M_E = {GM}." },
        { title: "g at this height", body: "g = G M / r² = {g}. That is a little less than at the surface, but gravity is definitely not zero up there." },
        { title: "Physics idea", body: "v_orbit = √(G M / r), which is the same as √(r g). T = 2πr / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec}, or {Tmin}." }
      ]
    },
    {
      id: "escapeSurface",
      title: "3. Escaping Earth",
      prompt: "Find the escape speed at Earth's surface. Then show that it is √2 times the orbital speed you found in problem 1.",
      apply: "escapeSurface",
      steps: [
        { title: "What we know", body: "r = R_E = {R}. From problem 1, v_orbit = {vOrbit}." },
        { title: "Physics idea", body: "Escape speed is √2 times the circular orbital speed at the same r: v_esc = √(2 G M / r) = √2 × v_orbit." },
        { title: "Work", body: "v_esc = √2 × {vOrbit}." },
        { title: "Solve", body: "v_esc = {vEsc}. Check: √2 × {vOrbit} = {vEsc}." }
      ]
    },
    {
      id: "moon",
      title: "4. A cannon on the Moon",
      prompt: "A cannon on a very tall lunar mountain fires a projectile into a circular orbit 75 km above the Moon's surface. Find the projectile's speed and the time for one orbit. The Moon's mass is 7.35 × 10²² kg and its radius is 1.74 × 10⁶ m. (This is Study Question 16 from Lesson 7.2.)",
      apply: null,
      applyNote: "applyMoon",
      steps: [
        { title: "What we know", body: "h = 75 km = 7.5 × 10⁴ m. r = 1.74 × 10⁶ m + 7.5 × 10⁴ m = {r}. G = 6.67 × 10⁻¹¹ N·m²/kg². We need v and T." },
        { title: "Physics idea", body: "Same idea, different world: the Moon's gravity provides the centripetal force. v_orbit = √(G M / r) and T = 2πr / v_orbit." },
        { title: "Work", body: "G M = (6.67 × 10⁻¹¹)(7.35 × 10²²). Divide by r = {r}, then take the square root." },
        { title: "Solve", body: "v_orbit = {v}, or {vSci}. T = {Tsec}, or {Tmin}." }
      ]
    },
    {
      id: "planetX",
      title: "5. Planet X",
      prompt: "A planet has a radius of 2.50 × 10⁶ m, and free-fall acceleration there is 4.00 m/s². We don't know its mass, but we don't need it. Find the circular orbital speed and the period using the chalkboard form.",
      apply: null,
      applyNote: "applyPlanet",
      steps: [
        { title: "What we know", body: "r = {r}. g = {g}. The mass is unknown." },
        { title: "Physics idea", body: "When you know g at radius r, use v_orbit = √(r g) and T = 2πr / √(r g)." },
        { title: "Work", body: "v_orbit = √({r} × {g}). T = 2π × {r} / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec}, or {Tmin}." }
      ]
    },
    {
      id: "mountain",
      title: "6. Fire from the mountain",
      prompt: "The sandbox mountain starts at 150 km tall. Lesson 7.2 uses that height because it is above most of the air. Find v_orbit and the period from the mountaintop. Then set the slider to your answer and fire. Does your shot go all the way around?",
      apply: "mountain",
      steps: [
        { title: "What we know", body: "h = {h}. r = R_E + h = {r}." },
        { title: "Physics idea", body: "v_orbit = √(G M / r). T = 2πr / v_orbit." },
        { title: "Work", body: "v_orbit = √(G M_E / {r}). T = 2π × {r} / v_orbit." },
        { title: "Solve", body: "v_orbit = {v}. T = {Tsec}, or {Tmin}." }
      ]
    }
  ]
};
