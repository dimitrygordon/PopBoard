// Grids and markers: alt/az (local frame), RA/Dec of date and the celestial pole mark (dateGroup),
// ecliptic of J2000 (skyGroup), and a pulsing highlight ring (hl=polaris | hl=<con> | hl=hip:N, "Find Polaris").
import { SKY_R } from "../ns-util.js";
import { OBLIQUITY_J2000, altAzToWorld } from "../ns-astro.js";

function circlePts(fn, n = 180) { const p = []; for (let i = 0; i < n; i++) { const a = fn(i / n), b = fn((i + 1) / n); p.push(...a, ...b); } return p; }
const sph = (lonDeg, latDeg, r) => { const l = lonDeg * Math.PI / 180, b = latDeg * Math.PI / 180; return [r * Math.cos(b) * Math.cos(l), r * Math.cos(b) * Math.sin(l), r * Math.sin(b)]; };

export function gridLayer() {
  let altaz, eq, ecl, pole, ring, ringTarget = null;
  return {
    id: "grid",
    init(ctx) {
      const { THREE, skin } = ctx; const G = skin.grid, R = SKY_R - 6;
      const mk = (pts, color, parent) => { const l = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: G.opacity, depthWrite: false })); l.renderOrder = 3; l.frustumCulled = false; parent.add(l); return l; };
      // alt/az: altitude circles every 10 deg, azimuth lines every 15 deg (local frame)
      let p = [];
      for (let alt = 0; alt < 90; alt += 10) p.push(...circlePts((t) => altAzToWorld(alt, t * 360).map((v) => v * R)));
      for (let az = 0; az < 360; az += 15) for (let alt = 0; alt < 90; alt += 2) p.push(...altAzToWorld(alt, az).map((v) => v * R), ...altAzToWorld(alt + 2, az).map((v) => v * R));
      altaz = mk(p, G.altaz, ctx.skyRoot);
      // RA/Dec of date: dec circles every 15 deg, RA lines every 1 h
      p = [];
      for (let dec = -75; dec <= 75; dec += 15) p.push(...circlePts((t) => sph(t * 360, dec, R)));
      for (let h = 0; h < 24; h++) for (let dec = -88; dec < 88; dec += 4) p.push(...sph(h * 15, dec, R), ...sph(h * 15, dec + 4, R));
      eq = mk(p, G.eq, ctx.dateGroup);
      // ecliptic (J2000): the equator turned by the obliquity about x
      const e = OBLIQUITY_J2000 * Math.PI / 180;
      ecl = mk(circlePts((t) => { const l = t * Math.PI * 2; return [R * Math.cos(l), R * Math.sin(l) * Math.cos(e), R * Math.sin(l) * Math.sin(e)]; }, 360), G.ecl, ctx.skyGroup);
      // pole mark: small cross at the north celestial pole of date (always on, it is a marker not a grid)
      const k = 6; pole = mk([-k, 0, R, k, 0, R, 0, -k, R, 0, k, R], G.pole, ctx.dateGroup); pole.material.opacity = 0.9;
      const rp = circlePts((t) => [Math.cos(t * Math.PI * 2), Math.sin(t * Math.PI * 2), 0], 64);
      ring = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)), new THREE.LineBasicMaterial({ color: skin.highlight.color, transparent: true, depthWrite: false }));
      ring.renderOrder = 15; ring.frustumCulled = false; ring.visible = false; ctx.skyRoot.add(ring);
    },
    update(ctx, dt) {
      const st = ctx.state;
      altaz.visible = st.grid.includes("altaz"); eq.visible = st.grid.includes("eq"); ecl.visible = st.grid.includes("ecl");
      ringTarget = ctx.highlightDir ? ctx.highlightDir() : null;
      ring.visible = !!ringTarget;
      if (ringTarget) {
        const t = performance.now() / 1000, radDeg = ringTarget.radiusDeg || 2.2;
        const s = 700 * Math.tan(radDeg * Math.PI / 180) * (1 + 0.12 * Math.sin(t * 4));
        ring.position.set(ringTarget.dir[0] * 700, ringTarget.dir[1] * 700, ringTarget.dir[2] * 700);
        ring.lookAt(ctx.skyRoot.localToWorld(new ctx.THREE.Vector3(0, 0, 0)));
        ring.scale.set(s, s, s); ring.material.opacity = 0.6 + 0.4 * Math.sin(t * 4);
      }
    },
    setVisible() {},
    dispose() { for (const o of [altaz, eq, ecl, pole, ring]) o.geometry.dispose(); },
  };
}
