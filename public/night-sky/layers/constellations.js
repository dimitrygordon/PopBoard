// Constellations: three independent sub-layers (design 2.2). Lines and art live in skyGroup (J2000);
// names are upright billboards in the local frame. All three share the same star anchors.
import { SKY_R, apply, raDecVec } from "../ns-util.js";
import { REFRACT_GLSL, refractDir } from "../ns-astro.js";
import { artMesh } from "../ns-artmap.js";
import { TextBillboards } from "../ns-labels.js";
import { fatLineSegments, passthroughArtAlpha } from "../ns-lines.js";


// Name collision culling: of any two names whose boxes overlap, the bigger figure wins (plus hysteresis).
// Alt/az boxes, so it does not depend on where you look and nothing pops while you turn your head.
// These 20 figures are never dropped for a neighbour; the horizon floor still applies.
export const NEVER_CULL_IDS = ["Ori", "CMa", "CMi", "UMa", "UMi", "Cas", "Cyg", "Lyr", "Aql", "Leo", "Sco", "Sgr", "Tau", "Gem", "Cru", "Cen", "Boo", "Peg", "And", "Per"];
const NAMES_PAD = { x: 0.6, y: 0.4 }; // degrees of air around each name block
/** Pure. dirs[i] is a local-frame unit vector or null. sizes are atlas px [w,h]. shown is a Uint8Array mutated in place. */
export function cullNameBoxes(dirs, { sizes, pxPerDeg, offsetDeg, prio, shown, floorDeg, ids = [], pinned = NEVER_CULL_IDS, padX = NAMES_PAD.x, padY = NAMES_PAD.y, scale = 1 }) {
  const pin = pinned instanceof Set ? pinned : new Set(pinned);
  const n = dirs.length, k = scale / pxPerDeg, R = [];
  for (let i = 0; i < n; i++) {
    const d = dirs[i]; if (!d) continue;
    const alt = Math.asin(Math.max(-1, Math.min(1, d[1]))) * 180 / Math.PI, az = Math.atan2(d[0], d[2]) * 180 / Math.PI;
    const hw = sizes[i][0] * k / 2, hh = sizes[i][1] * k / 2;
    const cy = alt - (hh + offsetDeg), hx = hw / Math.max(0.25, Math.cos(cy * Math.PI / 180));
    if (cy - hh < floorDeg) continue; // the name block would touch the horizon band / compass letters
    R.push({ i, az, cy, hx: hx + padX, hy: hh + padY, pin: pin.has(ids[i]) });
  }
  const w = (r) => prio[r.i] + (shown[r.i] ? 3 : 0) + (r.pin ? 1000 : 0); // +3 hysteresis; pinned names always beat a neighbour
  R.sort((a, b) => w(b) - w(a));
  const kept = [], out = dirs.map(() => null);
  for (const r of R) {
    let ok = true;
    for (const q of kept) {
      let da = Math.abs(r.az - q.az); if (da > 180) da = 360 - da;
      if (da < r.hx + q.hx && Math.abs(r.cy - q.cy) < r.hy + q.hy) { ok = false; break; }
    }
    if (ok || r.pin) kept.push(r);
  }
  shown.fill(0); for (const r of kept) { out[r.i] = dirs[r.i]; shown[r.i] = 1; }
  return out;
}

export function constellationsLayer() {
  let lines, nodePts, nodeMat, art = null, artLoading = false, names, labelVecs, prio = [], shown = null, nameIds = [];
  let artTex = null, focusCtx = null, focusId = null, focusLines = null, focusArt = null, focusAlpha = 0, focusTarget = 0;
  const status = { art: "idle" }; // idle | loading | ready | error (read by the UI)

  function lineSegs(ctx, onlyId) {
    const s = ctx.catalog.stars, gap = ctx.skin.lines.gapDeg * Math.PI / 180, R = SKY_R - 2, seg = [];
    for (const c of ctx.catalog.constellations.constellations) {
      if (onlyId && c.id !== onlyId) continue;
      for (const l of c.lines) for (let k = 0; k + 1 < l.length; k++) {
        const A = s.starVec(l[k]), B = s.starVec(l[k + 1]);
        const ang = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
        if (ang <= 2.5 * gap) continue;
        const sl = (t) => { const a = Math.sin((1 - t) * ang) / Math.sin(ang), b = Math.sin(t * ang) / Math.sin(ang); return [(a * A[0] + b * B[0]) * R, (a * A[1] + b * B[1]) * R, (a * A[2] + b * B[2]) * R]; };
        seg.push(...sl(gap / ang), ...sl(1 - gap / ang));
      }
    }
    return seg;
  }
  function dropFocusLines() { if (focusLines) { focusCtx && focusCtx.skyGroup.remove(focusLines.mesh); focusLines.dispose(); focusLines = null; } }
  function dropFocusArt() { if (focusArt) { focusCtx && focusCtx.skyGroup.remove(focusArt); focusArt.geometry.dispose(); focusArt.material.dispose(); focusArt = null; } }
  function makeFocusLines(ctx, id) {
    dropFocusLines();
    const seg = lineSegs(ctx, id); if (!seg.length) return;
    const { THREE, skin } = ctx;
    focusLines = fatLineSegments(THREE, seg, { color: skin.lines.color, opacity: 0, widthPx: ctx.frame.lineWidthPx || 2, uRefract: ctx.frame.uRefract });
    focusLines.mesh.renderOrder = 4; ctx.skyGroup.add(focusLines.mesh);
  }
  function makeFocusArt(ctx, id) {
    dropFocusArt();
    if (!artTex) return;
    const c = ctx.catalog.constellations.constellations.find((x) => x.id === id);
    if (!c || !c.art) return;
    const { THREE, catalog, skin } = ctx;
    const m = artMesh(c.art, catalog.stars.starVec, catalog.constellations.atlas.size, 8);
    const pos = []; for (let i = 0; i < m.pos.length; i++) pos.push(m.pos[i] * (SKY_R - 4));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(m.uv, 2)); g.setIndex(m.idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uRefract: ctx.frame.uRefract, uMap: { value: artTex }, uTint: { value: new THREE.Vector3(...skin.art.tint) }, uArtAlpha: { value: 0 } },
      vertexShader: REFRACT_GLSL + "varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); wp.xyz = nsRefractWorld(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
      fragmentShader: "uniform sampler2D uMap; uniform vec3 uTint; uniform float uArtAlpha; varying vec2 vUv; void main(){ gl_FragColor = vec4(uTint * pow(texture2D(uMap, vUv).r, 1.35) * uArtAlpha, 1.0); }",
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    });
    focusArt = new THREE.Mesh(g, mat); focusArt.renderOrder = 2; focusArt.frustumCulled = false; ctx.skyGroup.add(focusArt);
  }
  function setFocus(id) {
    const ctx = focusCtx; if (!ctx) return;
    if (id === focusId) { if (id) focusTarget = 1; return; }
    focusId = id || null; focusTarget = id ? 1 : 0;
    if (id) {
      focusAlpha = 0;
      makeFocusLines(ctx, id);
      if (artTex) makeFocusArt(ctx, id);
      else if (!art && !artLoading) buildArt(ctx);
    }
  }

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
        uniforms: { uRefract: ctx.frame.uRefract, uMap: { value: tex }, uTint: { value: new THREE.Vector3(...skin.art.tint) }, uArtAlpha: { value: 0.40 } },
        vertexShader: REFRACT_GLSL + "varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); wp.xyz = nsRefractWorld(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
        fragmentShader: "uniform sampler2D uMap; uniform vec3 uTint; uniform float uArtAlpha; varying vec2 vUv; void main(){ gl_FragColor = vec4(uTint * pow(texture2D(uMap, vUv).r, 1.35) * uArtAlpha, 1.0); }",
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      });
      artTex = tex;
      art = new THREE.Mesh(g, mat); art.renderOrder = 1; art.frustumCulled = false; art.visible = ctx.state.art;
      ctx.skyGroup.add(art); status.art = "ready"; artLoading = false;
      if (focusId) makeFocusArt(ctx, focusId);
      ctx.onLayerStatus && ctx.onLayerStatus("art", "ready");
    }, undefined, () => { status.art = "error"; artLoading = false; ctx.onLayerStatus && ctx.onLayerStatus("art", "error"); });
  }
  return {
    id: "constellations", status,
    init(ctx) {
      focusCtx = ctx;
      const { THREE, catalog, skin } = ctx; const s = catalog.stars;
      const seg = [], nodes = new Set(), gap = skin.lines.gapDeg * Math.PI / 180, R = SKY_R - 2;
      for (const c of catalog.constellations.constellations) for (const l of c.lines) for (let k = 0; k + 1 < l.length; k++) {
        const A = s.starVec(l[k]), B = s.starVec(l[k + 1]); nodes.add(l[k]); nodes.add(l[k + 1]);
        const ang = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
        if (ang <= 2.5 * gap) continue; // too short to show with a gap at each star
        const sl = (t) => { const a = Math.sin((1 - t) * ang) / Math.sin(ang), b = Math.sin(t * ang) / Math.sin(ang); return [(a * A[0] + b * B[0]) * R, (a * A[1] + b * B[1]) * R, (a * A[2] + b * B[2]) * R]; };
        seg.push(...sl(gap / ang), ...sl(1 - gap / ang)); // Leo: 0.35 deg gap at each star
      }
      lines = fatLineSegments(THREE, seg, { color: skin.lines.color, opacity: skin.lines.opacity, widthPx: ctx.frame.lineWidthPx || 2, uRefract: ctx.frame.uRefract });
      lines.mesh.renderOrder = 3; ctx.skyGroup.add(lines.mesh);
      // node rings at line stars (Leo: radius 0.2 deg)
      const np = []; for (const i of nodes) np.push(s.vec[3 * i] * R, s.vec[3 * i + 1] * R, s.vec[3 * i + 2] * R);
      const ND = skin.lines.node;
      nodeMat = new THREE.ShaderMaterial({ uniforms: { uRefract: ctx.frame.uRefract, uViewportH: { value: 800 }, uRad: { value: ND.radiusDeg }, uColor: { value: new THREE.Color(ND.color) }, uOpacity: { value: ND.opacity } },
        vertexShader: REFRACT_GLSL + "uniform float uViewportH, uRad; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); wp.xyz = nsRefractWorld(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; gl_PointSize = clamp(2.0 * radians(uRad) * 0.5 * uViewportH * projectionMatrix[1][1] + 2.0, 4.0, 48.0); }",
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
      nameIds = catalog.constellations.constellations.map((c) => c.id);
      prio = catalog.constellations.constellations.map((c) => new Set(c.lines.flat()).size); // bigger figures win a collision
      shown = new Uint8Array(prio.length);
      ctx.skyRoot.add(names.mesh);
      if (ctx.state.art) (window.requestIdleCallback || setTimeout)(() => { if (!art && !artLoading) buildArt(ctx); });
    },
    update(ctx, dt) {
      const st = ctx.state, pass = !!ctx.frame.passthrough, vw = ctx.frame.viewportW || 1280, vh = ctx.frame.viewportH || 800;
      const linePx = ctx.frame.lineWidthPx || 2, artA = pass ? passthroughArtAlpha(st.artalpha) : (st.artalpha ?? 0.40);
      const lineOp = ctx.skin.lines.opacity * (pass ? 1.2 : 1);
      lines.mesh.visible = nodePts.visible = st.lines;
      lines.setWidth(linePx); lines.setOpacity(lineOp); lines.setResolution(vw, vh);
      nodeMat.uniforms.uViewportH.value = vh;
      if (st.art && !art && !artLoading) buildArt(ctx);
      if (art) { art.visible = st.art; art.material.uniforms.uArtAlpha.value = artA; }
      names.mesh.visible = st.names;
      if (st.names) {
        const M = ctx.frame.M, hideBelow = (st.ground && !pass) ? -2 : -91;
        const dirs = labelVecs.map((v) => { const d = refractDir(apply(M, v), ctx.frame.refract); return Math.asin(d[1]) * 180 / Math.PI < hideBelow ? null : d; });
        names.update(cullNameBoxes(dirs, { sizes: names.sizes, pxPerDeg: names.pxPerDeg, offsetDeg: names.opts.offsetDeg, prio, shown, floorDeg: (st.ground && !pass) ? 4 : -91, ids: nameIds, scale: TextBillboards.scale }), ctx.frame.fallbackUp);
      }
      const k = Math.min(1, (dt || 0.016) * 6);
      focusAlpha += (focusTarget - focusAlpha) * k;
      if (focusLines) {
        const show = !!(focusId && focusAlpha > 0.01);
        focusLines.mesh.visible = show;
        focusLines.setWidth(linePx); focusLines.setResolution(vw, vh);
        if (show) focusLines.setOpacity(lineOp * (st.lines ? 0.4 + 0.6 * focusAlpha : focusAlpha));
      }
      if (focusArt) {
        // When the art layer is already on, do not add a second additive copy of the same picture.
        const show = !!(focusId && !st.art && focusAlpha > 0.01);
        focusArt.visible = show;
        focusArt.material.uniforms.uArtAlpha.value = artA * focusAlpha;
      }
    },
    setFocus, getFocus: () => focusId, focusArtAlpha: () => focusAlpha,
    setVisible() {},
    dispose() { dropFocusLines(); dropFocusArt(); lines.dispose(); names.dispose(); if (art) art.geometry.dispose(); },
  };
}
