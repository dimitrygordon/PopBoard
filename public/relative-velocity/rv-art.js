// Relative Velocity Exploration: Leo's art set (colored pencil, Physics 101), shipped as webp in art/.
// Geometry comes from Leo's SPEC.md (PNG pixels, about 2x display). Every scene is a 1600 x 900 stage.
// One file per object so each can be dragged. Backdrops come in -light (#FCF7EB) and -dark (#1F1D1A), and every
// backdrop is Leo's seamless redraw (tiles: true), so the page repeats it directly with no mirrored copy.
// To swap a file: save it as art/<name>.webp (backdrops art/<name>-light.webp and -dark.webp) at the same size.

// png: source PNG size. show: display size on the 1600 x 900 stage. anchor: the PNG pixel that sits on the
// object's position. themed: has light and dark versions. src: Leo's original file name.
export const ART = {
  // River Channel Lab
  "bg-river":    { png: [1600, 900], themed: true, tiles: true, src: "bg_lab_{theme}.png", note: "lab bench as one long counter, empty tabletop (y 204 to 795); the channel is drawn once in code" },
  channel:       { png: [2400, 355], show: [1200, 178], anchor: [0, 0], src: "channel_topdown.png", note: "water interior x 46 to 2353, y 47 to 306; placed at x 200, y 392" },
  ruler:         { png: [2400, 110], show: [1200, 55], anchor: [0, 0], src: "channel_ruler_0-5m.png", note: "0 m at x 46, 5 m at x 2353; placed at x 200, y 584" },
  boat:          { png: [480, 158], show: [200, 66], anchor: [473, 79], stern: 6, src: "boat_topdown_right.png", note: "bow right; anchored at the bow tip (473, 79), stern at x 6" },
  "bead-yellow": { png: [80, 80], show: [40, 40], anchor: [40, 40], src: "bead_yellow.png", note: "the leaf" },
  "bead-green":  { png: [80, 80], show: [40, 40], anchor: [40, 40], src: "bead_green.png" },
  "bead-violet": { png: [80, 80], show: [40, 40], anchor: [40, 40], src: "bead_violet.png" },
  "bead-red":    { png: [80, 80], show: [40, 40], anchor: [40, 40], src: "bead_red.png" },
  "valve-knob":  { png: [200, 199], show: [100, 100], anchor: [100, 100], src: "flow_valve_knob.png", note: "rotates when the flow is on" },
  clipboard:     { png: [640, 969], show: [320, 485], anchor: [0, 0], src: "clipboard_datatable.png", note: "columns x 64 185 313 443 563, rows y 231 304 409 518 625 737 855" },
  stopwatch:     { png: [240, 334], show: [120, 167], anchor: [0, 0], src: "stopwatch.png", note: "dial center (120, 203)" },
  // Truck and basketball
  "bg-truck":    { png: [1600, 900], themed: true, tiles: true, src: "bg_road_{theme}.png", note: "asphalt y 590 to 740, wheels on y 700" },
  truck:         { png: [1100, 447], show: [550, 224], anchor: [550, 436], src: "truck_side_right.png", note: "wheels y 436, bed rail top y 171, bed x 10 to 470" },
  basketball:    { png: [160, 158], show: [56, 55], anchor: [80, 79], src: "basketball.png" },
  // Airport walkway
  "bg-walkway":  { png: [1600, 900], themed: true, tiles: true, src: "bg_airport_{theme}.png", note: "floor from about y 510; walkway base on y 760" },
  // Shown 1.8x SPEC's suggestion so the handrail (PNG y 10 to 245) is about 1 m against the 1.75 m walker.
  walkway:       { png: [554, 390], show: [499, 351], anchor: [0, 245], src: "walkway_tile.png", note: "tiles sideways, belt surface y 245, rail top y 10; shown 1.8x SPEC so the rail is about 1 m" },
  walker:        { png: [400, 741], show: [200, 371], anchor: [200, 730], src: "walker_side_right.png", note: "feet at (200, 730)" },
  // Kart boost road
  "bg-kart":     { png: [1600, 900], themed: true, tiles: true, src: "bg_kart_{theme}.png", note: "asphalt y 591 to 755 between the curbs, wheels on about y 720" },
  kart:          { png: [800, 420], show: [300, 158], anchor: [400, 410], src: "kart_blue_side_right.png", note: "wheels y 410" },
  "kart-rival":  { png: [800, 420], show: [300, 158], anchor: [400, 410], src: "kart_rival_red_side_right.png", note: "wheels y 410" },
  "boost-pad":   { png: [640, 285], show: [240, 36], anchor: [320, 142], src: "boost_pad_right.png", note: "squashed to lie on the road" },
};
export const BEADS = ["bead-yellow", "bead-green", "bead-violet", "bead-red"];

export function artUrl(name, theme) {
  const a = ART[name];
  if (!a) throw new Error("unknown art " + name);
  const file = a.themed ? `${name}-${theme === "dark" ? "dark" : "light"}` : name;
  return `relative-velocity/art/${file}.webp`;
}

// Display size and the anchor offset in display pixels.
export function shown(name) {
  const a = ART[name];
  const [w, h] = a.show || [1600, 900];
  const k = w / a.png[0];
  const [ax, ay] = a.anchor || [0, 0];
  return { w, h, ax: ax * k, ay: ay * (h / a.png[1]) };
}

export function artFiles() {
  const out = [];
  for (const [name, a] of Object.entries(ART)) {
    if (a.themed) out.push(`${name}-light`, `${name}-dark`);
    else out.push(name);
  }
  return out;
}
