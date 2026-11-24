// Relative Velocity Exploration: art slots. One file per object so each can be dragged.
// Placeholders ship as SVG in relative-velocity/art/. When Leo's transparent PNG for a slot lands,
// copy it to art/<name>.png (backdrops: art/<name>-light.png and art/<name>-dark.png) and add the
// name to PNG_READY. The page then loads the PNG by the same name. Sizes are the intended pixel size
// (draw at 2x for phones if you like; keep the aspect ratio). See README.md.
export const PNG_READY = new Set([
  // "boat", "bg-river", ...
]);

// w,h: pixel size. anchor: the point (fraction of w,h) that sits on the object's position.
// themed: has -light and -dark versions. tile: repeats sideways, left edge must meet right edge.
export const ART = {
  // River Channel Lab
  "bg-river":   { w: 2400, h: 900, themed: true, tile: true, note: "tabletop under the plexi channel" },
  channel:      { w: 2000, h: 240, anchor: [0, 0.5], note: "top-down plexiglass channel; x=0 px is 0 m and x=2000 px is 5 m on the ruler (400 px per m); water lane is y 40 to 200" },
  boat:         { w: 240, h: 120, anchor: [0.5, 0.5], note: "toy motor boat, top-down, bow pointing right" },
  bead:         { w: 48, h: 48, anchor: [0.5, 0.5], note: "one floating bead (the leaf)" },
  stopwatch:    { w: 240, h: 280, anchor: [0, 0], note: "stopwatch body; the time is drawn as live text in the face, center (120,160), face radius 80" },
  "valve-knob": { w: 200, h: 200, anchor: [0.5, 0.5], note: "flow valve knob, pointer at 12 o'clock = off; the page rotates it clockwise up to 270 degrees" },
  clipboard:    { w: 640, h: 820, anchor: [0, 0], note: "pencil clipboard with an EMPTY data grid; grid box x 60 to 580, y 170 to 760; the page draws the table text on top" },
  // Truck and basketball
  "bg-truck":   { w: 2400, h: 900, themed: true, tile: true, note: "street and sidewalk, road surface along the bottom 120 px" },
  truck:        { w: 600, h: 300, anchor: [0.5, 1], note: "pickup truck, side view, facing right, wheels touch the bottom edge" },
  basketball:   { w: 96, h: 96, anchor: [0.5, 0.5], note: "basketball" },
  // Airport walkway
  "bg-walkway": { w: 2400, h: 900, themed: true, tile: true, note: "terminal floor and windows" },
  walkway:      { w: 1200, h: 160, tile: true, anchor: [0, 1], note: "moving walkway side view, one tile; the page slides it at the belt speed" },
  walker:       { w: 160, h: 320, anchor: [0.5, 1], note: "walker with rolling bag, side view, facing right, feet on the bottom edge" },
  // Kart boost road
  "bg-kart":    { w: 2400, h: 900, themed: true, tile: true, note: "race track infield and grandstand, no logos or game branding" },
  kart:         { w: 320, h: 180, anchor: [0.5, 1], note: "player kart, side view, facing right, no game branding" },
  "kart-rival": { w: 320, h: 180, anchor: [0.5, 1], note: "rival kart, a different color from the player kart" },
  "boost-pad":  { w: 400, h: 80, tile: true, anchor: [0, 0.5], note: "boost lane chevron strip, one tile, chevrons point right" },
};

export function artUrl(name, theme) {
  const a = ART[name];
  if (!a) throw new Error("unknown art " + name);
  const ext = PNG_READY.has(name) ? "png" : "svg";
  const file = a.themed ? `${name}-${theme === "dark" ? "dark" : "light"}` : name;
  return `relative-velocity/art/${file}.${ext}`;
}

// Every placeholder file the page may request (for tests and the README).
export function artFiles() {
  const out = [];
  for (const [name, a] of Object.entries(ART)) {
    if (a.themed) out.push(`${name}-light`, `${name}-dark`);
    else out.push(name);
  }
  return out;
}
