// Sun, Moon (lit by the Sun, so the phase is real geometry) and the five naked-eye planets. Tier B.
// Positions come from ns-ephem.js in the equator-of-date frame and are drawn through frame.Md.
import { sunPosition, moonTopocentric, planetPosition, moonPhase, PLANETS } from "../ns-ephem.js";
import { apply, raDecVec } from "../ns-util.js";
import { refractDir } from "../ns-astro.js";
import { TextBillboards } from "../ns-labels.js";

// planetDeg is a radius (semidiameter). 0.12 => 0.24 deg across, star-like but findable (true sizes are ~0.01 deg).
// planetScale nudges that radius a little by typical brightness: Venus and Jupiter slightly larger, Mercury slightly smaller.
export const SOLAR_CONFIG = { moonScale: 1, sunScale: 1, planetDeg: 0.12, radius: 860,
  planetScale: { mercury: 0.85, venus: 1.15, mars: 0.92, jupiter: 1.08, saturn: 0.92 } };
export const PLANET_SIZE_NOTE = "Planets are enlarged so you can find them. Through your eyes they look like bright stars.";
const MOON_RADIUS_KM = 1737.4, SUN_SEMI_DEG = 0.2666; // IAU mean lunar radius; mean solar semidiameter 16.0'
const NAMES = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn" };

export function solarLayer() {
  let group, sun, moon, light, planets = {}, labels, ids = ["sun", "moon", ...PLANETS];
  return {
    id: "solar",
    init(ctx) {
      const { THREE, skin } = ctx; const P = skin.planets, R = SOLAR_CONFIG.radius;
      group = new THREE.Group(); ctx.skyRoot.add(group);
      const sunR = R * Math.tan(SUN_SEMI_DEG * Math.PI / 180) * SOLAR_CONFIG.sunScale;
      sun = new THREE.Mesh(new THREE.SphereGeometry(sunR, 24, 16), new THREE.MeshBasicMaterial({ color: P.sun, transparent: true }));
      moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshLambertMaterial({ color: P.moon, emissive: 0x0b0b0d, transparent: true }));
      light = new THREE.DirectionalLight(0xffffff, 3.2); light.target = moon;
      group.add(sun, moon, light, new THREE.AmbientLight(0xffffff, 0.02));
      for (const p of PLANETS) {
        planets[p] = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: P[p], transparent: true }));
        group.add(planets[p]);
      }
      for (const o of [sun, moon, ...Object.values(planets)]) { o.renderOrder = 4; o.frustumCulled = false; }
      labels = new TextBillboards(THREE, ids.map((id) => ({ lines: [{ text: NAMES[id], font: skin.starNames.font, color: skin.starNames.color }] })), { radius: R - 20, capDeg: skin.starNames.capDeg, refPx: 30, anchor: "right-of", offsetDeg: 0.5 });
      ctx.skyRoot.add(labels.mesh);
    },
    update(ctx) {
      const st = ctx.state, f = ctx.frame, R = SOLAR_CONFIG.radius, t = f.simMs;
      const s = sunPosition(t), m = moonTopocentric(t, st.lat, st.lon);
      const bodies = { sun: { ...s }, moon: { ...m } };
      for (const p of PLANETS) bodies[p] = planetPosition(p, t);
      const out = [];
      for (const id of ids) { const b = bodies[id]; const d = refractDir(apply(f.Md, raDecVec(b.raDeg, b.decDeg)), f.refract); out.push({ id, name: NAMES[id], dir: d, body: b }); }
      f.solar = out; // used by picking, the label card and the "real sky" brightness
      f.sunDir = out[0].dir; f.moonPhase = moonPhase(t);
      const place = (o, d, r = R) => o.position.set(d[0] * r, d[1] * r, d[2] * r);
      place(sun, out[0].dir); place(moon, out[1].dir);
      const mr = R * MOON_RADIUS_KM / m.distKm * SOLAR_CONFIG.moonScale; moon.scale.set(mr, mr, mr);
      light.position.set(moon.position.x + f.sunDir[0] * 50, moon.position.y + f.sunDir[1] * 50, moon.position.z + f.sunDir[2] * 50);
      PLANETS.forEach((p, i) => {
        const deg = SOLAR_CONFIG.planetDeg * (SOLAR_CONFIG.planetScale[p] || 1);
        const r = R * Math.tan(deg * Math.PI / 180) * (f.starScale || 1); // headset: 0.12 deg radius; flat screens match the star size boost
        planets[p].scale.set(r, r, r);
        place(planets[p], out[i + 2].dir);
      });
      group.visible = st.planets;
      // Sun is drawn in both modes (it is a body, not help); in night mode the sky stays dark.
      labels.mesh.visible = st.planets && st.starnames;
      if (labels.mesh.visible) labels.update(out.map((o) => ((st.ground && !f.passthrough) && o.dir[1] < -0.02 ? null : o.dir)), f.fallbackUp);
    },
    setVisible(on) { group.visible = on; },
    dispose() { labels.dispose(); },
  };
}
