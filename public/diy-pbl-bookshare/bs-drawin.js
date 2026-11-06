// Canvas/WebGL threshold draw-in (Leo DRAW-IN.md). ~2.5s once on enter.
// Motif glide runs first; call startDrawIn after. Skip when reduced-motion.

const PAPER = [251 / 255, 244 / 255, 230 / 255];
const DURATION = 2500;

const VS = `attribute vec2 a; varying vec2 v; void main(){ v=a*0.5+0.5; gl_Position=vec4(a,0.0,1.0); }`;
const FS = `
precision mediump float;
uniform sampler2D uBg, uLine, uHatch, uLineOrder;
uniform float uLineT, uHatchT, uLineAlpha;
varying vec2 v;
void main(){
  vec2 uv = vec2(v.x, 1.0 - v.y);
  vec4 bg = texture2D(uBg, uv);
  vec4 line = texture2D(uLine, uv);
  float h = texture2D(uHatch, uv).r;
  float lo = texture2D(uLineOrder, uv).r;
  float showBg = step(h, uHatchT);
  float showLine = step(lo, uLineT);
  vec3 paper = vec3(0.984, 0.957, 0.902);
  vec3 col = mix(paper, bg.rgb, showBg);
  float la = line.a * showLine * uLineAlpha;
  col = mix(col, line.rgb, la);
  gl_FragColor = vec4(col, 1.0);
}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.decoding = "async";
    im.src = src;
  });
}

function makeGL(canvas) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    lineT: gl.getUniformLocation(prog, "uLineT"),
    hatchT: gl.getUniformLocation(prog, "uHatchT"),
    lineAlpha: gl.getUniformLocation(prog, "uLineAlpha"),
  };
  ["uBg","uLine","uHatch","uLineOrder"].forEach((name, i) => {
    gl.uniform1i(gl.getUniformLocation(prog, name), i);
  });
  function tex(img, unit, rgba) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, rgba ? gl.RGBA : gl.LUMINANCE, rgba ? gl.RGBA : gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
    return t;
  }
  return {
    gl,
    upload(bg, line, hatch, order) {
      this._tex = [
        tex(bg, 0, true),
        tex(line, 1, true),
        tex(hatch, 2, false),
        tex(order, 3, false),
      ];
    },
    draw(lineT, hatchT, lineAlpha) {
      const { gl } = this;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniforms.lineT, lineT);
      gl.uniform1f(uniforms.hatchT, hatchT);
      gl.uniform1f(uniforms.lineAlpha, lineAlpha);
      for (let i = 0; i < 4; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, this._tex[i]);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      this._tex?.forEach((t) => gl.deleteTexture(t));
      this._tex = null;
    },
  };
}

export function artBase(artId) {
  return `diy-pbl-bookshare/art/${artId}`;
}

/**
 * Mount a draw-in canvas into the scene root (replaces .bs-bg visibility).
 * Returns { promise, cancel, skipToEnd }.
 */
export function startDrawIn(root, artId, { reduced = false, duration = DURATION } = {}) {
  const token = { cancelled: false };
  const canvas = document.createElement("canvas");
  canvas.className = "bs-drawin";
  canvas.width = 1920;
  canvas.height = 1080;
  canvas.setAttribute("aria-hidden", "true");
  root.classList.add("is-drawing");
  root.classList.remove("is-drawn");
  // Hide baked bg img while drawing
  const bgImg = root.querySelector(".bs-bg");
  if (bgImg) bgImg.style.visibility = "hidden";
  root.insertBefore(canvas, root.firstChild);

  let raf = 0;
  let glapi = null;

  const cleanup = (final) => {
    token.cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (glapi) { try { glapi.destroy(); } catch (e) {} glapi = null; }
    if (final) {
      if (bgImg) bgImg.style.visibility = "";
      canvas.remove();
      root.classList.remove("is-drawing");
      root.classList.add("is-drawn");
    }
  };

  const finish = () => {
    cleanup(true);
  };

  const cancel = () => {
    // Jump to finished bg, no half-drawn left behind
    cleanup(true);
  };

  if (reduced) {
    // Plain fade into finished bg
    if (bgImg) {
      bgImg.style.visibility = "";
      bgImg.style.opacity = "0";
      bgImg.style.transition = "opacity 0.25s ease";
      requestAnimationFrame(() => { bgImg.style.opacity = "1"; });
    }
    canvas.remove();
    root.classList.remove("is-drawing");
    const p = new Promise((r) => setTimeout(() => {
      root.classList.add("is-drawn");
      if (bgImg) { bgImg.style.transition = ""; bgImg.style.opacity = ""; }
      r();
    }, 260));
    return { promise: p, cancel: () => {}, token };
  }

  const base = artBase(artId);
  const promise = Promise.all([
    loadImage(`${base}/bg.webp`),
    loadImage(`${base}/line.webp`),
    loadImage(`${base}/hatch_mask.webp`),
    loadImage(`${base}/line_order.webp`),
  ]).then(([bg, line, hatch, order]) => {
    if (token.cancelled) return;
    glapi = makeGL(canvas);
    if (!glapi) {
      // Fallback: just show bg
      finish();
      return;
    }
    glapi.upload(bg, line, hatch, order);
    const t0 = performance.now();
    const easeOut = (x) => 1 - Math.pow(1 - x, 2.2);
    const tick = (now) => {
      if (token.cancelled) return;
      const u = Math.min(1, (now - t0) / duration);
      // Outline 0-0.8s of timeline (~0.32 of duration), hatch overlaps last of outline
      const linePhase = Math.min(1, u / 0.32);
      const hatchPhase = Math.min(1, Math.max(0, (u - 0.22) / 0.64));
      const lineT = easeOut(linePhase);
      const hatchT = hatchPhase; // near-linear
      // Outline settle to ~30% in last 0.3s
      let lineAlpha = 1;
      if (u > 0.78) lineAlpha = 1 - (u - 0.78) / 0.22 * 0.7;
      if (u >= 1) lineAlpha = 0.3;
      glapi.draw(lineT, hatchT, lineAlpha);
      if (u < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
  }).catch(() => finish());

  return { promise, cancel, token };
}

export function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
