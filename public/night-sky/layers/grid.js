// Grids and markers: alt/az (local frame), RA/Dec of date and the celestial pole mark (dateGroup),
// ecliptic of J2000 (skyGroup), and a pulsing highlight ring (hl=polaris | hl=<con> | hl=hip:N, "Find Polaris").
import { SKY_R } from "../ns-util.js";
import { OBLIQUITY_J2000, altAzToWorld } from "../ns-astro.js";
import { fatLineSegments } from "../ns-lines.js";

function circlePts(fn, n = 180) { const p = []; for (let i = 0; i < n; i++) { const a = fn(i / n), b = fn((i + 1) / n); p.push(...a, ...b); } return p; }
const sph = (lonDeg, latDeg, r) => { const l = lonDeg * Math.PI / 180, b = latDeg * Math.PI / 180; return [r * Math.cos(b) * Math.cos(l), r * Math.cos(b) * Math.sin(l), r * Math.sin(b)]; };

export function gridLayer() {
  let altaz, eq, ecl, pole, ring, ringTarget = null;
  return {
    id: "grid",
    init(ctx) {
      const { THREE, skin } = ctx; const G = skin.grid, R = SKY_R - 6;
      const mk = (pts, color, parent, opacity = G.opacity) => {
        const fat = fatLineSegments(THREE, pts, { color, opacity, widthPx: ctx.frame.lineWidthPx || 2, uRefract: ctx.frame.uRefract });
        fat.mesh.renderOrder = 3; parent.add(fat.mesh); return fat;
      };
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
      const k = 6; pole = mk([-k, 0, R, k, 0, R, 0, -k, R, 0, k, R], G.pole, ctx.dateGroup, 0.9);
      const rp = circlePts((t) => [Math.cos(t * Math.PI * 2), Math.sin(t * Math.PI * 2), 0], 64);
      ring = fatLineSegments(THREE, rp, { color: skin.highlight.color, opacity: 1, widthPx: 2, uRefract: ctx.frame.uRefract });
      ring.mesh.renderOrder = 15; ring.mesh.visible = false; ctx.skyRoot.add(ring.mesh);
    },
    update(ctx, dt) {
      const st = ctx.state, vw = ctx.frame.viewportW || 1280, vh = ctx.frame.viewportH || 800, px = ctx.frame.lineWidthPx || 2, pass = !!ctx.frame.passthrough;
      altaz.mesh.visible = st.grid.includes("altaz"); eq.mesh.visible = st.grid.includes("eq"); ecl.mesh.visible = st.grid.includes("ecl");
      for (const g of [altaz, eq, ecl, pole]) { g.setWidth(px); g.setResolution(vw, vh); g.setAdditive(pass); }
      ringTarget = ctx.highlightDir ? ctx.highlightDir() : null;
      ring.mesh.visible = !!ringTarget;
      if (ringTarget) {
        const t = performance.now() / 1000, radDeg = ringTarget.radiusDeg || 2.2;
        const s = 700 * Math.tan(radDeg * Math.PI / 180) * (1 + 0.12 * Math.sin(t * 4));
        ring.mesh.position.set(ringTarget.dir[0] * 700, ringTarget.dir[1] * 700, ringTarget.dir[2] * 700);
        ring.mesh.lookAt(ctx.skyRoot.localToWorld(new ctx.THREE.Vector3(0, 0, 0)));
        ring.mesh.scale.set(s, s, s); ring.setOpacity(0.6 + 0.4 * Math.sin(t * 4)); ring.setWidth(px); ring.setResolution(vw, vh); ring.setAdditive(pass);
      }
    },
    setVisible() {},
    dispose() { for (const o of [altaz, eq, ecl, pole, ring]) o.dispose(); },
  };
}
