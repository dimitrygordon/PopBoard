// Constellations: three independent sub-layers (design 2.2). Lines and art live in skyGroup (J2000);
// names are upright billboards in the local frame. All three share the same star anchors.
import { SKY_R, apply, raDecVec } from "../ns-util.js";
import { artMesh } from "../ns-artmap.js";
import { TextBillboards } from "../ns-labels.js";

export function constellationsLayer() {
  let lines, nodePts, nodeMat, art = null, artLoading = false, names, labelVecs;
  const status = { art: "idle" }; // idle | loading | ready | error (read by the UI)
  function buildArt(ctx) {
    const { THREE, catalog, skin } = ctx; const C = catalog.constellations;
    artLoading = true; status.art = "loading";
    new THREE.TextureLoader().load(new URL(skin.art.atlas, ctx.baseUrl).href, (tex) => {
      // Brightness-only atlas (Leo): red channel, linear filter, no mipmaps in v1 (design 8.3, Q3), no color space.
      tex.format = THREE.RedFormat; tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
      const pos = [], uv = [], idx = [];
      for (const c of C.constellations) {
        if (!c.art) continue; // Pup, Ser and Vel have lines but no art: skipped silently
        const m = artMesh(c.art, catalog.stars.starVec, C.atlas.size, 8);
        const base = pos.length / 3;
        for (let i = 0; i < m.pos.length; i++) pos.push(m.pos[i] * (SKY_R - 4));
        uv.push(...m.uv); for (const k of m.idx) idx.push(base + k);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uTint: { value: new THREE.Vector3(...skin.art.tint) }, uArtAlpha: { value: 0.35 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform sampler2D uMap; uniform vec3 uTint; uniform float uArtAlpha; varying vec2 vUv; void main(){ gl_FragColor = vec4(uTint * texture2D(uMap, vUv).r * uArtAlpha, 1.0); }",
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      });
      art = new THREE.Mesh(g, mat); art.renderOrder = 1; art.frustumCulled = false; art.visible = ctx.state.art;
      ctx.skyGroup.add(art); status.art = "ready"; artLoading = false;
      ctx.onLayerStatus && ctx.onLayerStatus("art", "ready");
    }, undefined, () => { status.art = "error"; artLoading = false; ctx.onLayerStatus && ctx.onLayerStatus("art", "error"); });
  }
  return {
    id: "constellations", status,
    init(ctx) {
      const { THREE, catalog, skin } = ctx; const s = catalog.stars;
      const seg = [], nodes = new Set(), gap = skin.lines.gapDeg * Math.PI / 180, R = SKY_R - 2;
      for (const c of catalog.constellations.constellations) for (const l of c.lines) for (let k = 0; k + 1 < l.length; k++) {
        const A = s.starVec(l[k]), B = s.starVec(l[k + 1]); nodes.add(l[k]); nodes.add(l[k + 1]);
        const ang = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
        if (ang <= 2.5 * gap) continue; // too short to show with a gap at each star
        const sl = (t) => { const a = Math.sin((1 - t) * ang) / Math.sin(ang), b = Math.sin(t * ang) / Math.sin(ang); return [(a * A[0] + b * B[0]) * R, (a * A[1] + b * B[1]) * R, (a * A[2] + b * B[2]) * R]; };
        seg.push(...sl(gap / ang), ...sl(1 - gap / ang)); // Leo: 0.35 deg gap at each star
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
      lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: skin.lines.color, transparent: true, opacity: skin.lines.opacity, depthWrite: false }));
      lines.renderOrder = 3; lines.frustumCulled = false; ctx.skyGroup.add(lines);
      // node rings at line stars (Leo: radius 0.2 deg)
      const np = []; for (const i of nodes) np.push(s.vec[3 * i] * R, s.vec[3 * i + 1] * R, s.vec[3 * i + 2] * R);
      const ND = skin.lines.node;
      nodeMat = new THREE.ShaderMaterial({ uniforms: { uViewportH: { value: 800 }, uRad: { value: ND.radiusDeg }, uColor: { value: new THREE.Color(ND.color) }, uOpacity: { value: ND.opacity } },
        vertexShader: "uniform float uViewportH, uRad; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(2.0 * radians(uRad) * 0.5 * uViewportH * projectionMatrix[1][1] + 2.0, 4.0, 48.0); }",
        fragmentShader: "uniform vec3 uColor; uniform float uOpacity; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(0.62, 0.75, r) * (1.0 - smoothstep(0.88, 1.0, r)) * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a);\n#include <colorspace_fragment>\n}",
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      nodePts = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(np, 3)), nodeMat);
      nodePts.renderOrder = 3; nodePts.frustumCulled = false; ctx.skyGroup.add(nodePts);
      const N = skin.names;
      const sp = (font) => N.spacingEm * parseFloat(/(\d+)px/.exec(font)[1]);
      names = new TextBillboards(THREE, catalog.constellations.constellations.map((c) => ({ lines: [
        { text: c.latin, font: N.latinFont, color: N.color, upper: N.uppercase, spacing: sp(N.latinFont), shadow: N.shadow, blur: N.shadowBlur },
        { text: c.english, font: N.englishFont, color: N.englishColor, upper: N.uppercase, spacing: sp(N.englishFont), shadow: N.shadow, blur: N.shadowBlur }] })),
        { radius: SKY_R - 30, capDeg: N.capDeg, refPx: parseFloat(/(\d+)px/.exec(N.latinFont)[1]), anchor: "below", offsetDeg: N.belowDeg });
      labelVecs = catalog.constellations.constellations.map((c) => raDecVec(c.labelRa * 15, c.labelDec));
      ctx.skyRoot.add(names.mesh);
      if (ctx.state.art) (window.requestIdleCallback || setTimeout)(() => { if (!art && !artLoading) buildArt(ctx); });
    },
    update(ctx) {
      const st = ctx.state;
      lines.visible = nodePts.visible = st.lines; nodeMat.uniforms.uViewportH.value = ctx.frame.viewportH;
      if (st.art && !art && !artLoading) buildArt(ctx);
      if (art) { art.visible = st.art; art.material.uniforms.uArtAlpha.value = st.artalpha; }
      names.mesh.visible = st.names;
      if (st.names) {
        const M = ctx.frame.M, hideBelow = st.ground ? -2 : -91;
        names.update(labelVecs.map((v) => { const d = apply(M, v); return Math.asin(d[1]) * 180 / Math.PI < hideBelow ? null : d; }), ctx.frame.fallbackUp);
      }
    },
    setVisible() {},
    dispose() { lines.geometry.dispose(); names.dispose(); if (art) art.geometry.dispose(); },
  };
}
