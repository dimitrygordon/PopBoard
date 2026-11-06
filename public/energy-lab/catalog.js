// Energy Lab: the ten Physics 101 energy3d sims, listed for the standalone hub.
// Cards open the existing lesson story pages (same scene modules under physics101/scenes/energy3d/).
export const ENERGY_LAB = Object.freeze({
  id: "energy-lab",
  name: "Energy Lab",
  // Leo: replace cover.svg with cover.webp at 960 x 540.
  cover: "energy-lab/cover.svg",
  coverSize: { width: 960, height: 540 },
  // Leo: replace each thumbs/<id>.svg with thumbs/<id>.webp at 640 x 360.
  thumbSize: { width: 640, height: 360 },
  sims: Object.freeze([
    { id: "stores", title: "Energy stores", lesson: "m10-l02", page: 1, module: 10, lessonNum: 2 },
    { id: "track", title: "Release and return", lesson: "m10-l03", page: 2, module: 10, lessonNum: 3 },
    { id: "spring", title: "Spring launcher", lesson: "m13-l01", page: 2, module: 13, lessonNum: 1 },
    { id: "bounce", title: "Why a bouncing ball stops", lesson: "m10-l03", page: 8, module: 10, lessonNum: 3 },
    { id: "kettle", title: "Full or half kettle", lesson: "m11-l01", page: 9, module: 11, lessonNum: 1 },
    { id: "insulation", title: "Jacket or no jacket", lesson: "m11-l01", page: 16, module: 11, lessonNum: 1 },
    { id: "lamps", title: "Same light, less power", lesson: "m19-l02", page: 3, module: 19, lessonNum: 2 },
    { id: "grid", title: "Power station to lamp", lesson: "m21-l02", page: 11, module: 21, lessonNum: 2 },
    { id: "food", title: "Breakfast to the top", lesson: "m10-l02", page: 11, module: 10, lessonNum: 2 },
    { id: "journey", title: "Where did breakfast go?", lesson: "m10-l03", page: 1, module: 10, lessonNum: 3 }
  ])
});

export function simHref(sim) {
  return `study-physics101-story.html?lesson=${encodeURIComponent(sim.lesson)}&page=${sim.page}`;
}

export function lessonLabel(sim) {
  return `Physics 101 M${sim.module} L${sim.lessonNum} p${sim.page}`;
}

export function thumbSrc(sim) {
  return `energy-lab/thumbs/${sim.id}.svg`;
}
