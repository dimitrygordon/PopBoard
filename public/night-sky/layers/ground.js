// Sky dome, ground disc, horizon glow line and cardinal letters (local frame: x East, y Up, z South). Look: Leo, ui-spec 5.
// The ground is in the transparent pass (renderOrder 10) so it is drawn after art, stars and lines and covers them below
// the horizon; see-through mode makes it translucent and the star shader stops hiding stars.
import { TextBillboards } from "../ns-labels.js";
import { altAzToWorld } from "../ns-astro.js";

export function groundLayer() {
  let dome, disc, ring, cards, cardDirs;
  return {
    id: "ground",
    init(ctx) {
      const { THREE, skin } = ctx; const G = skin.ground, K = skin.sky;
      const c = (h) => new THREE.Color(h);
      // sky gradient by altitude (night): zenith, 30 deg, horizon. "Real sky" mixes toward twilight and day by Sun altitude.
      dome = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
        uniforms: { uZen: { value: c(K.zenith) }, uMid: { value: c(K.mid) }, uHor: { value: c(K.horizon) }, uTw: { value: c(K.twilight) }, uDay: { value: c(K.day) }, uDayHor: { value: c(K.dayHorizon) }, uTwi: { value: 0 }, uDaylight: { value: 0 } },
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: `uniform vec3 uZen, uMid, uHor, uTw, uDay, uDayHor; uniform float uTwi, uDaylight; varying vec3 vP;
          void main(){ float alt = degrees(asin(clamp(normalize(vP).y, -1.0, 1.0)));
            vec3 n = alt > 30.0 ? mix(uMid, uZen, clamp((alt - 30.0) / 60.0, 0.0, 1.0)) : mix(uHor, uMid, clamp(alt / 30.0, 0.0, 1.0));
            vec3 d = mix(uDayHor, uDay, clamp(alt / 50.0, 0.0, 1.0));
            vec3 col = mix(mix(n, uTw, uTwi), d, uDaylight);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`, // uniforms are linear (THREE.Color); encode so the hex values in ns-skin show as written
        side: THREE.BackSide, depthWrite: false }));
      dome.renderOrder = -10; dome.frustumCulled = false; ctx.skyRoot.add(dome);
      // ground: radial gradient inner -> outer
      const geo = new THREE.CircleGeometry(1500, 96, 0, Math.PI * 2).rotateX(-Math.PI / 2);
      const col = [], p = geo.attributes.position, ci = c(G.inner), co = c(G.outer);
      for (let i = 0; i < p.count; i++) { const r = Math.min(1, Math.hypot(p.getX(i), p.getZ(i)) / 60); const k = ci.clone().lerp(co, r); col.push(k.r, k.g, k.b); }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      disc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: true, side: THREE.DoubleSide }));
      disc.renderOrder = 10; disc.frustumCulled = false;
      const pts = []; for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(Math.sin(a) * 860, 0.5, -Math.cos(a) * 860); }
      ring = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)), new THREE.LineBasicMaterial({ color: G.horizon, transparent: true, opacity: G.horizonOpacity }));
      ring.renderOrder = 11;
      ctx.groundGroup.add(disc, ring);
      const C = skin.cardinals;
      const labels = [["N", 0, 1], ["NE", 45, 0], ["E", 90, 1], ["SE", 135, 0], ["S", 180, 1], ["SW", 225, 0], ["W", 270, 1], ["NW", 315, 0]];
      cards = new TextBillboards(THREE, labels.map(([t, , big]) => ({ lines: [{ text: t, font: big ? C.font : C.smallFont, color: big ? C.color : C.smallColor }] })), { radius: 700, capDeg: C.capDeg, refPx: parseFloat(/(\d+)px/.exec(C.font)[1]) });
      cardDirs = labels.map(([, az]) => altAzToWorld(2.6, az)); ctx.skyRoot.add(cards.mesh);
    },
    update(ctx) {
      const st = ctx.state, f = ctx.frame, u = dome.material.uniforms;
      disc.material.opacity = st.ground ? 1 : ctx.skin.ground.seeThroughOpacity;
      disc.material.depthWrite = st.ground;
      cards.update(cardDirs, ctx.frame.fallbackUp);
      const real = st.sky === "real";
      u.uDaylight.value = real ? Math.min(1, Math.max(0, (f.sunAlt + 6) / 12)) : 0;          // day blue from -6 deg up
      u.uTwi.value = real ? Math.min(1, Math.max(0, (f.sunAlt + 18) / 12)) : 0;               // twilight from -18 deg (astronomical)
    },
    setVisible(on) { disc.visible = ring.visible = cards.mesh.visible = on; },
    dispose() { dome.geometry.dispose(); disc.geometry.dispose(); ring.geometry.dispose(); cards.dispose(); },
  };
}
