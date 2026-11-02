// Try it cards: a link from a Physics 101 lesson to an ORIGINAL PopBoard Study Library sim, sandbox or game.
// Targets come from the library inventory; which lesson gets which target comes only from
// physics101/tryit/map.json ({ "<lesson slug>": [{ "id": "<target id>", "caption": "...", "thumb": "<optional img>" }] }),
// filled from Leo's match list (pairs he marked "a stretch" left out).
// Placement: the Study Questions tab and the end of a Test it sandbox. Never on Read this page slides.
const ROOT = new URL("../", import.meta.url).href;

// id -> [name, link to the original page, Leo's pencil thumbnail]
export const TARGETS = {
  // from /workspace/physics101/library-port-map.json; astronomy items open the storybook page that holds them
  "3d-cannon": ["Newton's cannon (3D)", "study-astronomy-story.html?deck=d01&page=18", "physics101/tryit/thumbs/study-3d-cannon.svg"],
  "3d-cannonball": ["Newton's cannonball (3D)", "study-astronomy-story.html?deck=d03&page=21", "physics101/tryit/thumbs/study-3d-cannonball.svg"],
  "3d-kepler2": ["Kepler's 2nd law (3D)", "study-astronomy-story.html?deck=d03&page=14", "physics101/tryit/thumbs/study-3d-kepler2.svg"],
  "3d-retrograde": ["Copernicus's way (3D)", "study-astronomy-story.html?deck=d03&page=11", "physics101/tryit/thumbs/study-3d-retrograde.svg"],
  "atom-builder": ["Atom Builder", "study-atom-builder.html", "physics101/tryit/thumbs/study-atom-builder.svg"],
  "checkride": ["PRAXIS Physics 5266 Prep", "study-checkride.html", "physics101/tryit/thumbs/study-checkride.svg"],
  "circuit-builder": ["Circuit Builder", "study-circuit-builder.html", "physics101/tryit/thumbs/study-circuit-builder.svg"],
  "double-pendulum": ["Chaos and the Double Pendulum", "study-double-pendulum.html", "physics101/tryit/thumbs/study-double-pendulum.svg"],
  "em-fields": ["E&M Field Sandbox", "study-em-fields.html", "physics101/tryit/thumbs/study-em-fields.svg"],
  "em-spectrum": ["Electromagnetic Spectrum Explorer", "study-em-spectrum.html", "physics101/tryit/thumbs/study-em-spectrum.svg"],
  "friction": ["Friction Lab", "study-friction.html", "physics101/tryit/thumbs/study-friction.svg"],
  "gas-thermo": ["Gases & Thermodynamics", "study-gas-thermo.html", "physics101/tryit/thumbs/study-gas-thermo.svg"],
  "gravity-well-golf": ["Gravity Well Golf", "study-gravity-well-golf.html", "physics101/tryit/thumbs/study-gravity-well-golf.svg"],
  "harmonics": ["Harmonics and Standing Waves Sandbox", "study-harmonics.html", "physics101/tryit/thumbs/study-harmonics.svg"],
  "induction-motors": ["Induction & Motors", "study-induction-motors.html", "physics101/tryit/thumbs/study-induction-motors.svg"],
  "kepler": ["Kepler's Laws Sandbox", "study-kepler.html", "physics101/tryit/thumbs/study-kepler.svg"],
  "luminosity": ["Luminosity & Brightness Sandbox", "study-luminosity.html", "physics101/tryit/thumbs/study-luminosity.svg"],
  "machines": ["Simple Machines Sandbox", "study-machines.html", "physics101/tryit/thumbs/study-machines.svg"],
  "mechanics": ["Mechanics Playground", "study-mechanics.html", "physics101/tryit/thumbs/study-mechanics.svg"],
  "momentum-collisions": ["Momentum & Collisions Lab", "study-momentum-collisions.html", "physics101/tryit/thumbs/study-momentum-collisions.svg"],
  "optics": ["Optics", "study-optics.html", "physics101/tryit/thumbs/study-optics.svg"],
  "orbits": ["Orbital Mechanics & Gravity Playground", "study-orbits.html", "physics101/tryit/thumbs/study-orbits.svg"],
  "pendulum": ["Pendulum Physics Sandbox", "study-pendulum.html", "physics101/tryit/thumbs/study-pendulum.svg"],
  "powers-of-ten": ["Powers of Ten", "study-powers-of-ten.html", "physics101/tryit/thumbs/study-powers-of-ten.svg"],
  "projectile": ["Projectile Motion", "study-projectile.html", "physics101/tryit/thumbs/study-projectile.svg"],
  "quantum": ["Quantum Physics", "study-quantum.html", "physics101/tryit/thumbs/study-quantum.svg"],
  "rbmk": ["RBMK Reactor Simulator", "study-rbm.html", "physics101/tryit/thumbs/study-rbmk.svg"],
  "ripple-tank": ["Ripple Tank", "study-ripple-tank.html", "physics101/tryit/thumbs/study-ripple-tank.svg"],
  "rocket-mission": ["Rocket Science & Space Mission", "study-rocket-mission.html", "physics101/tryit/thumbs/study-rocket-mission.svg"],
  "sb-doppler": ["Doppler sandbox", "study-astronomy-story.html?deck=d01&page=14", "physics101/tryit/thumbs/study-sb-doppler.svg"],
  "sb-dose": ["Radiation dose sandbox", "study-astronomy-story.html?deck=d24-5&page=5", "physics101/tryit/thumbs/study-sb-dose.svg"],
  "sb-gravity": ["Gravitation sandbox", "study-astronomy-story.html?deck=d01&page=17", "physics101/tryit/thumbs/study-sb-gravity.svg"],
  "sb-kepler": ["Kepler orbit sandbox", "study-astronomy-story.html?deck=d01&page=19", "physics101/tryit/thumbs/study-sb-kepler.svg"],
  "sb-powers": ["Powers of Ten sandbox", "study-astronomy-story.html?deck=d01&page=8", "physics101/tryit/thumbs/study-sb-powers.svg"],
  "sb-waves": ["Light waves sandbox", "study-astronomy-story.html?deck=d01&page=12", "physics101/tryit/thumbs/study-sb-waves.svg"],
  "space-sandbox": ["Space Sandbox", "study-sandbox.html", "physics101/tryit/thumbs/study-space-sandbox.svg"],
  "spectra": ["Light Spectra Sandbox", "study-spectra.html", "physics101/tryit/thumbs/study-spectra.svg"],
  "springs": ["Hooke's Law and Springs Sandbox", "study-springs.html", "physics101/tryit/thumbs/study-springs.svg"],
  "stars": ["Build a Star: Stellar Evolution Laboratory", "study-stars.html", "physics101/tryit/thumbs/study-stars.svg"],
  "tides": ["Lunar Tides and Tidal Cycles Sandbox", "study-tides.html", "physics101/tryit/thumbs/study-tides.svg"],
  "vectors": ["Vectors & Forces in 2D", "study-vectors.html", "physics101/tryit/thumbs/study-vectors.svg"],
  "waves": ["Waves & Interference", "study-waves.html", "physics101/tryit/thumbs/study-waves.svg"]
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
  host.replaceChildren(...rows.map((r) => tryItCard({ name: TARGETS[r.id][0], href: TARGETS[r.id][1], caption: r.caption, thumb: r.thumb || TARGETS[r.id][2] })));
  host.hidden = !rows.length;
  return rows.length;
}
