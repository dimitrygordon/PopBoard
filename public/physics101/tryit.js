// Try it cards: a link from a Physics 101 lesson to an ORIGINAL PopBoard Study Library sim, sandbox or game.
// Targets come from the library inventory; which lesson gets which target comes only from
// physics101/tryit/map.json ({ "<lesson slug>": [{ "id": "<target id>", "caption": "...", "thumb": "<optional img>" }] }),
// filled from Leo's match list (pairs he marked "a stretch" left out).
// Placement: the Study Questions tab and the end of a Test it sandbox. Never on Read this page slides.
const ROOT = new URL("../", import.meta.url).href;

// id -> [name, link to the original page]
export const TARGETS = {
  // from /workspace/physics101/library-port-map.json; astronomy items open the storybook page that holds them
  "3d-cannon": ["Newton's cannon (3D)", "study-astronomy-story.html?deck=d01&page=18"],
  "3d-cannonball": ["Newton's cannonball (3D)", "study-astronomy-story.html?deck=d03&page=21"],
  "3d-kepler2": ["Kepler's 2nd law (3D)", "study-astronomy-story.html?deck=d03&page=14"],
  "3d-retrograde": ["Copernicus's way (3D)", "study-astronomy-story.html?deck=d03&page=11"],
  "atom-builder": ["Atom Builder", "study-atom-builder.html"],
  "checkride": ["PRAXIS Physics 5266 Prep", "study-checkride.html"],
  "circuit-builder": ["Circuit Builder", "study-circuit-builder.html"],
  "double-pendulum": ["Chaos and the Double Pendulum", "study-double-pendulum.html"],
  "em-fields": ["E&M Field Sandbox", "study-em-fields.html"],
  "em-spectrum": ["Electromagnetic Spectrum Explorer", "study-em-spectrum.html"],
  "friction": ["Friction Lab", "study-friction.html"],
  "gas-thermo": ["Gases & Thermodynamics", "study-gas-thermo.html"],
  "gravity-well-golf": ["Gravity Well Golf", "study-gravity-well-golf.html"],
  "harmonics": ["Harmonics and Standing Waves Sandbox", "study-harmonics.html"],
  "induction-motors": ["Induction & Motors", "study-induction-motors.html"],
  "kepler": ["Kepler's Laws Sandbox", "study-kepler.html"],
  "luminosity": ["Luminosity & Brightness Sandbox", "study-luminosity.html"],
  "machines": ["Simple Machines Sandbox", "study-machines.html"],
  "mechanics": ["Mechanics Playground", "study-mechanics.html"],
  "momentum-collisions": ["Momentum & Collisions Lab", "study-momentum-collisions.html"],
  "optics": ["Optics", "study-optics.html"],
  "orbits": ["Orbital Mechanics & Gravity Playground", "study-orbits.html"],
  "pendulum": ["Pendulum Physics Sandbox", "study-pendulum.html"],
  "powers-of-ten": ["Powers of Ten", "study-powers-of-ten.html"],
  "projectile": ["Projectile Motion", "study-projectile.html"],
  "quantum": ["Quantum Physics", "study-quantum.html"],
  "rbmk": ["RBMK Reactor Simulator", "study-rbm.html"],
  "ripple-tank": ["Ripple Tank", "study-ripple-tank.html"],
  "rocket-mission": ["Rocket Science & Space Mission", "study-rocket-mission.html"],
  "sb-doppler": ["Doppler sandbox", "study-astronomy-story.html?deck=d01&page=14"],
  "sb-dose": ["Radiation dose sandbox", "study-astronomy-story.html?deck=d24-5&page=5"],
  "sb-gravity": ["Gravitation sandbox", "study-astronomy-story.html?deck=d01&page=17"],
  "sb-kepler": ["Kepler orbit sandbox", "study-astronomy-story.html?deck=d01&page=19"],
  "sb-powers": ["Powers of Ten sandbox", "study-astronomy-story.html?deck=d01&page=8"],
  "sb-waves": ["Light waves sandbox", "study-astronomy-story.html?deck=d01&page=12"],
  "space-sandbox": ["Space Sandbox", "study-sandbox.html"],
  "spectra": ["Light Spectra Sandbox", "study-spectra.html"],
  "springs": ["Hooke's Law and Springs Sandbox", "study-springs.html"],
  "stars": ["Build a Star: Stellar Evolution Laboratory", "study-stars.html"],
  "tides": ["Lunar Tides and Tidal Cycles Sandbox", "study-tides.html"],
  "vectors": ["Vectors & Forces in 2D", "study-vectors.html"],
  "waves": ["Waves & Interference", "study-waves.html"]
};
const MAP = fetch(ROOT + "physics101/tryit/map.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function tryItCard({ name, caption, href, thumb }) {
  const a = document.createElement("a");
  a.className = "tryit-card"; a.href = new URL(href, ROOT).href;
  a.innerHTML = `<span class="tryit-thumb" aria-hidden="true">${thumb ? `<img src="${esc(new URL(thumb, ROOT).href)}" alt="" loading="lazy">` : ""}</span>`
    + `<span class="tryit-text"><span class="tryit-name">Try it: ${esc(name)}</span><span class="tryit-cap">${esc(caption || "")}</span></span>`;
  return a;
}

// Fill host with this lesson's cards. Returns how many were drawn; host stays hidden when zero.
export async function renderTryIt(host, slug) {
  if (!host || host.closest("#readBox")) return 0;
  const rows = ((await MAP)[slug] || []).filter((r) => TARGETS[r.id]);
  host.replaceChildren(...rows.map((r) => tryItCard({ name: TARGETS[r.id][0], href: TARGETS[r.id][1], caption: r.caption, thumb: r.thumb })));
  host.hidden = !rows.length;
  return rows.length;
}
