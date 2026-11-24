// Relative Velocity Exploration: student-facing prompt and question text.
// SOCRATES: every entry below is a PLACEHOLDER draft written by Turing. Replace the text, keep the keys.
// Rules for this file: plain text only, no em dashes, {L} {vb} {u} are filled in by the page.
export const PLACEHOLDER = true; // flip to false when Socrates signs off on the wording

export const STRINGS = {
  intro: "Section 6.3: Relative Velocity. Every speed is measured by someone. Pick who is watching and see what changes.",

  lab: {
    title: "River Channel Lab",
    tag: "Lab",
    step1Title: "Step 1. Time the boat in still water",
    step1Body: "The valve is off. Run the boat the full {L} m and time it with the stopwatch. Do at least 3 trials.",
    step2Title: "Step 2. Predict",
    step2Body: "The water will flow downstream at a known {u} m/s. Using your still-water speed, predict the boat's speed relative to the shore going downstream and going upstream.",
    predictDown: "Predicted downstream speed (m/s)",
    predictUp: "Predicted upstream speed (m/s)",
    predictLocked: "Fill in both predictions to unlock Step 3.",
    step3Title: "Step 3. Turn the water on and run it",
    step3Body: "Turn the valve on. Run the boat downstream and upstream. Time at least 3 trials each way.",
    step4Title: "Step 4. Compare",
    step4Body: "How close were your predictions? What could explain the difference?",
    leafQuestion: "Switch to the Leaf view. How fast does the boat move relative to the leaf, downstream and upstream?",
    summaryTitle: "Results",
  },

  truck: {
    title: "Truck and basketball",
    prompt: "A truck drives at 25 mph. Someone throws a basketball backward at 25 mph. What does a person on the sidewalk see? What does the driver see?",
  },
  walkway: {
    title: "Airport walkway",
    prompt: "Walk with the belt, against it, or stand still. Who sees you move fastest: someone on the floor, or someone riding the belt?",
  },
  kart: {
    title: "Kart boost road",
    prompt: "Your kart drives on a boost road that slides forward under it. How fast are you going to the track? To the rival kart next to you?",
  },

  exploreHeading: "Explore",
};
