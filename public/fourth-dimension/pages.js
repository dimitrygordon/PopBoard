// Beyond 3D: every page and every word of narration lives here, so writers can edit
// without touching code. PLACEHOLDER COPY: Socrates finalizes wording, Tesla checks the math.
// Fields: id (unique), chapter (1-8, see CHAPTERS), scene (renderer key, see fd-scene.js),
// text (2-4 short sentences), opts (scene options), hint (optional one-line control tip).

export const CHAPTERS = [
  { n: 1, title: "Building up", stamp: "Builder" },
  { n: 2, title: "Flatland", stamp: "Flatlander" },
  { n: 3, title: "Shadows", stamp: "Shadow caster" },
  { n: 4, title: "Up to 4D", stamp: "Extruder" },
  { n: 5, title: "Tesseract shadow", stamp: "Shadow of 4D" },
  { n: 6, title: "Slicing", stamp: "Slicer" },
  { n: 7, title: "Unfolding", stamp: "Unfolder" },
  { n: 8, title: "Sandbox", stamp: "Explorer" }
];

export const PAGES = [
  { id: "point", chapter: 1, scene: "extrude", opts: { n: 0, start: 1 },
    text: "Meet a point. It has no length, no width, no height. Nowhere to go, nothing to measure. That is zero dimensions." },
  { id: "line", chapter: 1, scene: "extrude", opts: { n: 1 }, hint: "Drag sideways to stretch the point",
    text: "Drag the point sideways and it leaves a trail: a line segment. Now there is one direction to move in, back and forth. One dimension." },
  { id: "square", chapter: 1, scene: "extrude", opts: { n: 2 }, hint: "Drag to sweep the line",
    text: "Sweep the whole segment in a brand-new direction, at a right angle to the first. It paints a square. Two directions: two dimensions." },
  { id: "cube", chapter: 1, scene: "extrude", opts: { n: 3 }, hint: "Drag to lift the square",
    text: "Lift the square straight up, at a right angle to both of its directions, and you get a cube. Every step used one new direction. Hold that thought." },

  { id: "flatland", chapter: 2, scene: "flatland", opts: { mode: "meet" },
    text: "Meet Flick, a flatlander: a little paper person drawn in ink. Flick lives on the wall, a world with length and width but no thickness. Flick has never imagined a direction that points out of it." },
  { id: "sphere-visit", chapter: 2, scene: "flatland", opts: { mode: "sphere" }, hint: "Slide the ball through Flick's world",
    text: "A ball drifts through Flick's wall. Flick only sees where it touches his world: a dot, then a circle that grows, shrinks, and vanishes. To Flick it is a magic circle." },
  { id: "cube-visit", chapter: 2, scene: "flatland", opts: { mode: "cube" }, hint: "Slide the tilted cube through",
    text: "Now a tilted cube passes through. Flick sees a triangle that turns into a hexagon and back again. Same cube, wildly different shapes, depending on where the wall cuts it." },

  { id: "shadow", chapter: 3, scene: "shadow", hint: "Drag to spin the cube",
    text: "Here is another way to squeeze 3D into 2D: a shadow. Shine a light on a cube and the floor gets a flat picture of it. Spin the cube and watch the shadow change." },
  { id: "shadow-gold", chapter: 3, scene: "shadow", opts: { goldShadow: true }, hint: "Drag. Can you hide the gold face from view?",
    text: "One face is painted gold so you can follow it. Its shadow stretches and squashes, but it is the same square the whole time. Shadows lie about lengths and angles." },
  { id: "slice-cube", chapter: 3, scene: "slicecube", hint: "Slide the cut. Drag to tilt the cube",
    text: "Slice a cube with a flat knife and look at the cut face. Straight on, you get squares. Tip the cube onto a corner and you can find triangles and even a perfect hexagon." },

  { id: "counting", chapter: 4, scene: "counting",
    text: "Count the corners: 1, 2, 4, 8. Each new direction doubles them, because you copy the old shape and join the copies. Guess what comes next before you look at the last row." },
  { id: "extrude-4d", chapter: 4, scene: "extrude", opts: { n: 4 }, hint: "Drag to push the cube into the fourth direction",
    text: "Now push the cube in a fourth direction, called w, at a right angle to all three of ours. Here w is a fourth direction of space, not time. Relativity's spacetime is a different idea. The result is a tesseract." },
  { id: "cells", chapter: 4, scene: "cells", hint: "Tap the scene to light up the next cell",
    text: "A cube is wrapped in 6 square faces. A tesseract is wrapped in 8 cubes, called cells. Tap to light them up one at a time. Some look squashed: that is the shadow lying again." },

  { id: "tesseract", chapter: 5, scene: "tesseract", opts: { proj: "perspective" }, hint: "Use 3D or 4D on the sides, then drag",
    text: "We cannot see a tesseract, but we can see its shadow in 3D, the way the floor saw the cube's shadow. The small inner cube is just the far side, shrunk by distance in w." },
  { id: "tesseract-4d", chapter: 5, scene: "tesseract", opts: { proj: "perspective", mode: "4d" }, hint: "4D mode: drag sideways for XW, up and down for YW or ZW",
    text: "Switch to 4D and drag. The gold cell slides from the inside to the outside and the whole thing seems to turn inside out. Nothing is bending: it is a rigid turn we see in shadow." },
  { id: "tesseract-ortho", chapter: 5, scene: "tesseract", opts: { proj: "ortho", mode: "4d", tilt: true }, hint: "Flat light: try to make it look like one cube",
    text: "Swap the lamp for flat, straight light. Now near and far cells come out the same size. Turn it just right and the whole tesseract hides behind what looks like a plain cube." },

  { id: "slice-tesseract", chapter: 6, scene: "slice4", hint: "Slide the 3D knife through w",
    text: "Back to Flick's ball trick, one step up. Slide a 3D 'knife' through a tesseract and look at the cut. Lined up straight, every slice is a cube that pops in, holds still, and pops out." },
  { id: "slice-tilted", chapter: 6, scene: "slice4", opts: { tilt: true }, hint: "Slide the knife. Use 4D to tilt the tesseract",
    text: "Slicing a tilted tesseract gives other solids. Their faces can be triangles, four-sided shapes, pentagons or hexagons, just like the slices of a cube. Slice across the long diagonal and you get a tetrahedron, then a solid of triangles and hexagons, then an octahedron at the center." },
  { id: "hypersphere", chapter: 6, scene: "hypersphere", hint: "Slide the knife through the hypersphere",
    text: "A 4D ball passing through our world would look like a ball that appears from nowhere, swells, then shrinks to a dot and disappears. That is what Flick saw, one dimension up." },

  { id: "net-cube", chapter: 7, scene: "unfold3", hint: "Drag or slide to unfold",
    text: "Cut a cardboard box along some edges and lay it flat: 6 squares in a cross. A flatlander could cut that out of paper, but could never fold it up. There is no 'up' in Flatland." },
  { id: "net-tesseract", chapter: 7, scene: "unfold4", hint: "Drag or slide to unfold all the way",
    text: "Unfold a tesseract and its 8 cubes lie flat in 3D: a cross of cubes stacked like a plus sign. During unfolding the cubes never pass through each other in 4D; any overlap you see is only in the shadow." },
  { id: "net-tesseract-turn", chapter: 7, scene: "unfold4", opts: { start: 0.5, mode: "3d" }, hint: "Drag to look around the net",
    text: "Halfway folded, the cubes seem to crash into each other. In 4D they never touch: each one turns into w, so there is always room. Our shadow just stacks them up." },

  { id: "recap", chapter: 8, scene: "counting", opts: { recap: true },
    text: "Point, line, square, cube, tesseract. Each one is two copies of the last, joined up. You now know more about the fourth dimension than most grown-ups. Time to play." },
  { id: "sandbox", chapter: 8, scene: "sandbox", hint: "Pick a shape, a light, a knife. Drag in 3D or 4D",
    text: "Your turn. Pick a shape, spin it in 3D or 4D, switch the light, and slide the knife. Try the 24-cell: it is the only regular shape, in any dimension, with no matching shape in any other dimension." }
];
