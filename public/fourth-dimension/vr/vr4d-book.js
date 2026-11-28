// Beyond 3D VR storybook: the 27 narration pages. Captions are the storyboard's
// placeholder lines, science wording included. Socrates finalizes them; Dimitry's
// recordings replace audio/vr4d/s<N>.mp3 by the same filename.
// This file is pure data plus the page-turn rules. No DOM, no Three.js.
import { CHAPTERS, PAGES as BOOK } from "../pages.js";

export const DECK = "vr4d";

// Students pick a help level whenever they are ready. Nothing is locked.
export const HELP_LEVELS = [
  { value: 0, label: "Observe", disabled: false },
  { value: 1, label: "Reasons", disabled: false },
  { value: 2, label: "Explain", disabled: false },
];

// Answer pages play at help 1 and 2. Help 0 (Observe) skips them.
const ANSWER = new Set(["s4", "s8", "s12", "s17", "s21", "s25"]);

export const PAGES = [
  { n: 1, id: "s1", scene: "cover", control: "cover",
    text: "Welcome to Beyond 3D, in VR. Stay comfortably seated and use your hands. Six short stories are waiting. First, meet Flick." },
  { n: 2, id: "s2", scene: "flick", control: "bead",
    text: "You are Flick now, a flatlander. Your whole world is one thin, glowing sheet. Stay right where you are." },
  { n: 3, id: "s3", scene: "flick", control: "draw",
    text: "Something is coming through your world. What will it look like to you? Draw it with your finger." },
  { n: 4, id: "s4", scene: "flick", control: "bead",
    text: "A line that grows, then shrinks. Not a circle! Flick only sees the slice that touches his sheet. The disk shows only from above." },
  { n: 5, id: "s5", scene: "flatland", control: "look",
    text: "Everything fades. When it returns, you are above Flatland, looking down. Flick's house is a closed square with no doors." },
  { n: 6, id: "s6", scene: "flatland", control: "lift",
    text: "Flick's house has no doors. How did you get in? Reach down, lift the gold block, and set it back." },
  { n: 7, id: "s7", scene: "flatland", control: "lift",
    text: "Flick saw the block vanish, then appear again. What could a 4D being see of you?" },
  { n: 8, id: "s8", scene: "flatland", control: "lift",
    text: "An extra direction lets you reach inside closed shapes. It is not time: it is a direction of space, at right angles to all three of ours." },
  { n: 9, id: "s9", scene: "shadow", control: "cube",
    text: "Here is a cube made of wire, and a lamp behind you. Hold the cube and twist it. Watch its shadow on the screen." },
  { n: 10, id: "s10", scene: "shadow", control: "slice",
    text: "Now slide the glowing plane through the cube and look at the cut face. Try tilting the cube onto a corner." },
  { n: 11, id: "s11", scene: "shadow", control: "cube",
    text: "The cube did not change. Why does the shadow look squashed?" },
  { n: 12, id: "s12", scene: "shadow", control: "cube",
    text: "A shadow can lie about lengths and angles. The gold face is the same square all along. A slice is different: it is a cut, not a shadow." },
  { n: 13, id: "s13", scene: "build", control: "look",
    text: "Here is a point. It has no length, no width, no height. Zero dimensions." },
  { n: 14, id: "s14", scene: "build", control: "pull",
    text: "Pinch the point and pull sideways. Pinch the line and pull again. Then lift the square. Each pull is a brand-new direction." },
  { n: 15, id: "s15", scene: "build", control: "w",
    text: "Now pull the cube the new way, at a right angle to all three directions. In our 3D space we can show only its shadows or its slices." },
  { n: 16, id: "s16", scene: "build", control: "dial",
    text: "Point 1, line 2, square 4, cube 8. What comes next, and why? Turn the dial to guess the tesseract's corners, then its edges." },
  { n: 17, id: "s17", scene: "build", control: "look",
    text: "Each new direction doubles the corners, because we copy the shape and join the copies. So 16 corners and 32 edges. It is not a 3D diagonal, so in our 3D space we can show only its shadows or its slices." },
  { n: 18, id: "s18", scene: "tesseract", control: "cell",
    text: "Now you are sitting inside the shadow of a tesseract: a small cube inside a big cube. Tap one cell to light it up." },
  { n: 19, id: "s19", scene: "tesseract", control: "turn",
    text: "Twist the dial through a half turn, about nine seconds at a gentle pace, until the gold cell becomes the big outer cube. At a quarter turn it slides out to one side; at a half turn the inner and outer cubes swap. With one controller, the trigger picks the turn." },
  { n: 20, id: "s20", scene: "tesseract", control: "turn",
    text: "Is the small cube really smaller? Think back to the cube's shadow on the wall." },
  { n: 21, id: "s21", scene: "tesseract", control: "turn",
    text: "Nothing is stretching or bending. It is a rigid turn, seen in shadow. A quarter turn in the XW plane moves the inner cube out to one side. A half turn swaps the inner and outer cubes. All 8 cubic cells are the same size." },
  { n: 22, id: "s22", scene: "hyper", control: "look",
    text: "Back in our own room. A 4D ball is about to pass through it." },
  { n: 23, id: "s23", scene: "hyper", control: "span",
    text: "Before it starts, show with both hands how big it will get." },
  { n: 24, id: "s24", scene: "hyper", control: "bead6",
    text: "Where have you seen this before?" },
  { n: 25, id: "s25", scene: "hyper", control: "bead6",
    text: "A ball that appears, grows, shrinks and vanishes. It's the same rule as the slice Flick saw. The size is the square root of R squared minus the distance squared, one dimension up. Now it is our turn to be Flick." },
  { n: 26, id: "s26", scene: "hyper", control: "ticket", optional: true,
    text: "Which one is a slice? Which are shadows? What is confusing?" },
  { n: 27, id: "s27", scene: "finale", control: "finale",
    text: "Flick unfolds a cube from squares. What would you unfold a tesseract from? Continue in the book: Chapter 7, Unfolding." },
].map((p) => ({ ...p, answer: ANSWER.has(p.id) }));

export const SCENE_TITLE = {
  cover: "Cover", flick: "Be Flick", flatland: "Step out", shadow: "Shadows and slices",
  build: "Build up", tesseract: "Inside the shadow", hyper: "Flick's turn", finale: "The last page",
};

// Seated look the inline camera cuts to when a scene opens. Pitch is radians, negative looks down.
export const LOOK = {
  cover: { yaw: 0, pitch: -0.16 },
  flick: { yaw: 0, pitch: 0 },
  flatland: { yaw: 0, pitch: -25 * Math.PI / 180 },
  shadow: { yaw: 0, pitch: -0.04 },
  build: { yaw: 0, pitch: -0.06 },
  tesseract: { yaw: 0, pitch: -0.08 },
  hyper: { yaw: 0, pitch: -0.02 },
  finale: { yaw: 0, pitch: -0.08 },
};

export const FADE = { out: 0.7, hold: 0.5, fadeIn: 0.7 };
export const LEAF_SEC = 1.8;

// Scene to the flat chapter it hands back to. Titles come from CHAPTERS, page ids from the book.
const HAND_SCENE = {
  flick: { chapter: 2, transition: "black" },
  flatland: { chapter: 2, transition: "leaf" },
  shadow: { chapter: 3, transition: "leaf" },
  build: { chapter: 4, transition: "leaf" },
  tesseract: { chapter: 5, transition: "leaf" },
  hyper: { chapter: 6, transition: "leaf" },
};

export function handbackFor(scene) {
  const spec = HAND_SCENE[scene];
  if (!spec) return null;
  const ch = CHAPTERS.find((c) => c.n === spec.chapter);
  const page = BOOK.find((p) => p.chapter === spec.chapter);
  return {
    scene, chapter: spec.chapter, transition: spec.transition,
    title: ch.title, pageId: page.id,
    text: `Continue in the book: Chapter ${spec.chapter}, ${ch.title}.`,
  };
}

// Help 0 skips answer pages. exitTicket false skips s26. A hand-back card is inserted
// at the end of each scene, before the next scene's first page.
export function buildSteps(help, { exitTicket = true } = {}) {
  const steps = [];
  let current = null;
  for (const page of PAGES) {
    if (page.answer && help < 1) continue;
    if (page.optional && !exitTicket) continue;
    if (current && page.scene !== current) {
      const card = handbackFor(current);
      if (card) steps.push({ kind: "handback", ...card });
    }
    steps.push({ kind: "page", page, scene: page.scene });
    current = page.scene;
  }
  return steps;
}

export function bookHref(pageId) {
  return `study-fourth-dimension.html?page=${encodeURIComponent(pageId)}`;
}

export function defaultModel() {
  return {
    scene: "cover", pageId: "s1", help: 1, paper: false, reduced: false,
    captionScale: 1, tabletop: false, muted: false, stopped: false,
    bead: -1, sealed: false, strokes: [],
    lift: 0,
    cubeQ: { x: 0, y: 0, z: 0, w: 1 }, planeT: 0, tile: null, corner: false,
    pull: [0, 0, 0, 0], dial: 0, lockC: null, lockE: null, reveal: 0, dialPhase: "corners",
    plane: "XW", angle: 0, cell: null,
    bead6: 1, guessD: null,
    ticket: { slice: false, shadow: false, tess: false },
    card: null,
  };
}
