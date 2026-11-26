// PopBoard Night Sky: reference look for the in-headset panel (Canvas 2D, 1024 x 1024).
// Art direction by Leo. Turing: port or import into ns-ui.js. Pure drawing, no state logic.
// Units are canvas pixels. Panel quad is 0.80 m x 0.80 m, so 1280 px per meter, about 26.8 px per degree at 1.2 m.

export const THEME = {
  size: 1024,
  font: 'Inter',                       // vendored: fonts/inter-latin-var.woff2 (OFL 1.1)
  panel: { inset: 8, radius: 88, fillTop: 'rgba(24,29,60,0.96)', fillBottom: 'rgba(10,13,32,0.97)',
           border: 'rgba(255,255,255,0.16)', highlight: 'rgba(255,255,255,0.10)' },
  text:  { primary: '#FFFFFF', secondary: '#C3C9E6', tertiary: '#A9B0D0', shadow: 'rgba(0,0,24,0.55)' },
  accent: '#7FB2FF', accent2: '#A48CFF', glow: 'rgba(127,178,255,0.55)',
  ctl: {
    off:     { fill: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', icon: 0.72, label: '#C3C9E6' },
    hover:   { fill: 'rgba(255,255,255,0.12)', border: 'rgba(255,255,255,0.45)', ring: 'rgba(255,255,255,0.22)', icon: 0.95, label: '#FFFFFF' },
    on:      { fillA: 'rgba(127,178,255,0.30)', fillB: 'rgba(164,140,255,0.22)', border: 'rgba(170,205,255,0.85)', icon: 1, label: '#FFFFFF', glowBlur: 28 },
    pressed: { fill: 'rgba(127,178,255,0.42)', border: 'rgba(200,222,255,0.95)', icon: 1, label: '#FFFFFF', scale: 0.97, glowBlur: 12 },
    locked:  { alpha: 0.38 },
  },
  type: {               // px at 1024 canvas; cap height = 0.727 em for Inter
    clock:   '300 150px Inter',   // cap 109 px = 85 mm = 4.1 deg
    date:    '500 60px Inter',    // cap 44 px = 34 mm = 1.64 deg
    label:   '600 56px Inter',    // cap 41 px = 32 mm = 1.52 deg (MINIMUM anywhere)
    body:    '500 56px Inter',
    header:  '650 56px Inter',    // uppercase, letterSpacing 0.12em
  },
  hitMin: 128,          // 100 mm = 4.8 deg at 1.2 m
};

// Squircle (superellipse corners, matches PopBoard PR #192: extent 1.4 x r, exponent 5).
export function squircle(ctx, x, y, w, h, r, n = 5) {
  const R = Math.min(r * 1.4, w / 2, h / 2), N = 14, e = 2 / n;
  ctx.beginPath();
  // explicit corners: each corner centre is (x+R, y+R) etc; point = centre + R*(sgn cos^e, sgn sin^e)
  const pts = [];
  const add = (cx, cy, sx, sy, a0) => {
    for (let i = 0; i <= N; i++) {
      const t = a0 + (i / N) * Math.PI / 2;
      const c = Math.cos(t), s = Math.sin(t);
      pts.push([cx + R * Math.sign(c) * Math.pow(Math.abs(c), e), cy + R * Math.sign(s) * Math.pow(Math.abs(s), e)]);
    }
  };
  add(x + w - R, y + h - R, 1, 1, 0);              // bottom right
  add(x + R,     y + h - R, -1, 1, Math.PI / 2);   // bottom left
  add(x + R,     y + R,     -1, -1, Math.PI);      // top left
  add(x + w - R, y + R,     1, -1, 1.5 * Math.PI); // top right
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
}

function text(ctx, s, x, y, font, color, align = 'left', spacing = 0) {
  ctx.save();
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (spacing) ctx.letterSpacing = spacing + 'px';
  ctx.shadowColor = THEME.text.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function icon(ctx, img, cx, cy, size, alpha = 1) {
  if (!img) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

// Generic control surface. state: 'off' | 'hover' | 'on' | 'pressed' | 'on-hover' | 'locked'
export function surface(ctx, x, y, w, h, r, state) {
  const C = THEME.ctl;
  ctx.save();
  let s = state === 'locked' ? 'off' : state;
  if (state === 'locked') ctx.globalAlpha *= C.locked.alpha;
  if (s === 'pressed') { const k = C.pressed.scale; ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-(x + w / 2), -(y + h / 2)); }
  if (s === 'hover' || s === 'on-hover') {
    squircle(ctx, x - 7, y - 7, w + 14, h + 14, r + 7); ctx.lineWidth = 4; ctx.strokeStyle = C.hover.ring; ctx.stroke();
  }
  squircle(ctx, x, y, w, h, r);
  if (s === 'on' || s === 'on-hover') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, C.on.fillA); g.addColorStop(1, C.on.fillB);
    ctx.save(); ctx.shadowColor = THEME.glow; ctx.shadowBlur = C.on.glowBlur; ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.on.border; ctx.stroke();
  } else if (s === 'pressed') {
    ctx.save(); ctx.shadowColor = THEME.glow; ctx.shadowBlur = C.pressed.glowBlur; ctx.fillStyle = C.pressed.fill; ctx.fill(); ctx.restore();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.pressed.border; ctx.stroke();
  } else {
    ctx.fillStyle = s === 'hover' ? C.hover.fill : C.off.fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = s === 'hover' ? C.hover.border : C.off.border; ctx.stroke();
  }
  ctx.restore();
}
const iconAlpha = s => ({ off: 0.72, hover: 0.95, on: 1, 'on-hover': 1, pressed: 1, locked: 0.72 }[s]);
const labelColor = s => (s === 'off' || s === 'locked') ? THEME.ctl.off.label : '#FFFFFF';

export function panelBackground(ctx) {
  const P = THEME.panel, S = THEME.size, i = P.inset;
  ctx.clearRect(0, 0, S, S);
  squircle(ctx, i, i, S - 2 * i, S - 2 * i, P.radius);
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, P.fillTop); g.addColorStop(1, P.fillBottom);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = P.border; ctx.stroke();
  // top sheen
  ctx.save(); ctx.clip();
  const h = ctx.createLinearGradient(0, 0, 0, 220); h.addColorStop(0, 'rgba(160,180,255,0.10)'); h.addColorStop(1, 'rgba(160,180,255,0)');
  ctx.fillStyle = h; ctx.fillRect(0, 0, S, 220); ctx.restore();
}

export function tabs(ctx, icons, active, hoverTab) {
  const names = ['Time', 'Place', 'Sky', 'Help'];
  const x0 = 40, y0 = 40, W = 944, H = 128, w = W / 4;
  squircle(ctx, x0, y0, W, H, 56); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
  names.forEach((n, i) => {
    const x = x0 + i * w;
    if (i === active) { surface(ctx, x + 8, y0 + 8, w - 16, H - 16, 48, 'on'); }
    else if (i === hoverTab) { surface(ctx, x + 8, y0 + 8, w - 16, H - 16, 48, 'hover'); }
    text(ctx, n, x + w / 2, y0 + 84, THEME.type.label, i === active ? '#FFFFFF' : THEME.text.tertiary, 'center');
  });
}

export function drawTime(ctx, icons, st) {
  panelBackground(ctx); tabs(ctx, icons, 0, st.hoverTab);
  text(ctx, st.date, 64, 262, THEME.type.date, THEME.text.secondary);
  text(ctx, st.time, 58, 418, THEME.type.clock, THEME.text.primary);
  text(ctx, st.tz, 960, 418, THEME.type.label, THEME.text.secondary, 'right');
  // while scrubbing, the sub line shows the offset in accent color (the clock above updates live)
  if (st.scrubLabel) text(ctx, st.scrubLabel, 64, 494, '600 56px Inter', THEME.accent);
  else text(ctx, st.sub, 64, 494, THEME.type.body, THEME.text.tertiary);
  // transport row
  const y = 540;
  surface(ctx, 40, y + 16, 236, 128, 44, st.s.now); icon(ctx, icons.now, 104, y + 80, 64, iconAlpha(st.s.now));
  text(ctx, 'Now', 146, y + 100, THEME.type.label, labelColor(st.s.now));
  surface(ctx, 320, y + 16, 128, 128, 44, st.s.back); icon(ctx, icons['step-back'], 384, y + 80, 64, iconAlpha(st.s.back));
  // play/pause: big accent circle
  ctx.save(); ctx.beginPath(); ctx.arc(552, y + 80, 80, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(472, y, 632, y + 160); g.addColorStop(0, '#8FBCFF'); g.addColorStop(1, '#9C86FF');
  ctx.shadowColor = THEME.glow; ctx.shadowBlur = st.s.play === 'pressed' ? 14 : 34; ctx.fillStyle = g; ctx.fill(); ctx.restore();
  if (st.s.play === 'hover') { ctx.beginPath(); ctx.arc(552, y + 80, 90, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke(); }
  icon(ctx, st.playing ? icons.pause : icons.play, st.playing ? 552 : 558, y + 80, 76, 1);
  surface(ctx, 656, y + 16, 128, 128, 44, st.s.fwd); icon(ctx, icons['step-forward'], 720, y + 80, 64, iconAlpha(st.s.fwd));
  surface(ctx, 828, y + 16, 156, 128, 44, st.s.rev); icon(ctx, icons.reverse, 906, y + 80, 64, iconAlpha(st.s.rev));
  // speed ladder
  const sy = 724, labels = ['1x', '60x', '600x', '3600x'], sw = 944 / 4;
  squircle(ctx, 40, sy, 944, 120, 52); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
  labels.forEach((l, i) => {
    const on = i === st.speedIdx;
    if (on) surface(ctx, 40 + i * sw + 8, sy + 8, sw - 16, 104, 44, 'on');
    text(ctx, l, 40 + i * sw + sw / 2, sy + 80, THEME.type.label, on ? '#FFFFFF' : THEME.text.tertiary, 'center');
  });
  // scrub: one unit chip (press cycles Hour, Day, Month) + track
  const ry = 880;
  surface(ctx, 40, ry, 236, 112, 44, st.s.unit);
  text(ctx, st.unit, 132, ry + 76, THEME.type.label, '#FFFFFF', 'center');
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(226, ry + 50); ctx.lineTo(238, ry + 62); ctx.lineTo(250, ry + 50); ctx.stroke(); ctx.restore();
  const tx0 = 330, tx1 = 956, ty = ry + 56;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(tx0, ty); ctx.lineTo(tx1, ty); ctx.stroke();
  for (let k = 0; k <= 8; k++) { const x = tx0 + (tx1 - tx0) * k / 8; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 1.5, ty + 18, 3, k % 4 === 0 ? 18 : 10); }
  const mid = (tx0 + tx1) / 2, th = tx0 + (tx1 - tx0) * st.scrub;
  const gg = ctx.createLinearGradient(mid, 0, th, 0); gg.addColorStop(0, 'rgba(127,178,255,0.9)'); gg.addColorStop(1, 'rgba(164,140,255,0.9)');
  ctx.strokeStyle = gg; ctx.beginPath(); ctx.moveTo(mid, ty); ctx.lineTo(th, ty); ctx.stroke();
  ctx.shadowColor = THEME.glow; ctx.shadowBlur = 24; ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(th, ty, st.s.scrub === 'pressed' ? 30 : 26, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawSky(ctx, icons, st) {
  panelBackground(ctx); tabs(ctx, icons, 2, st.hoverTab);
  text(ctx, 'CONSTELLATIONS', 64, 266, THEME.type.header, THEME.text.tertiary, 'left', 6);
  const tiles = [['lines', 'Lines'], ['art', 'Art'], ['names', 'Names']];
  tiles.forEach(([k, l], i) => {
    const x = 40 + i * 324, y = 300, w = 296, h = 268, s = st.s[k];
    surface(ctx, x, y, w, h, 56, s);
    icon(ctx, icons[k], x + w / 2, y + 104, 112, iconAlpha(s));
    text(ctx, l, x + w / 2, y + 226, THEME.type.label, labelColor(s), 'center');
    // state pip
    ctx.beginPath(); ctx.arc(x + w - 36, y + 36, 11, 0, Math.PI * 2);
    ctx.fillStyle = (s === 'on' || s === 'on-hover' || s === 'pressed') ? THEME.accent : 'rgba(255,255,255,0.18)';
    if (s === 'on' || s === 'on-hover') { ctx.save(); ctx.shadowColor = THEME.glow; ctx.shadowBlur = 16; ctx.fill(); ctx.restore(); } else ctx.fill();
    if (s === 'locked') icon(ctx, icons.lock, x + 44, y + 44, 44, 1);
  });
  // art brightness
  const by = 612;
  icon(ctx, icons.brightness, 96, by + 56, 64, st.artOn ? 0.95 : 0.4);
  text(ctx, 'Art', 150, by + 76, THEME.type.label, st.artOn ? '#FFFFFF' : THEME.text.tertiary);
  const x0 = 290, x1 = 800, y = by + 56;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const xv = x0 + (x1 - x0) * st.artAlpha;
  ctx.strokeStyle = st.artOn ? THEME.accent : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xv, y); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = THEME.glow; ctx.shadowBlur = st.artOn ? 22 : 0;
  ctx.beginPath(); ctx.arc(xv, y, 26, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  text(ctx, Math.round(st.artAlpha * 100) + '%', 960, by + 76, THEME.type.label, st.artOn ? '#FFFFFF' : THEME.text.tertiary, 'right');
  // help off
  const hy = 756;
  surface(ctx, 40, hy, 944, 128, 52, st.s.helpOff);
  icon(ctx, icons['help-off'], 420, hy + 64, 64, iconAlpha(st.s.helpOff));
  text(ctx, 'Help off', 470, hy + 84, THEME.type.label, labelColor(st.s.helpOff));
  // page dots (Sky has 2 pages: Constellations, Display)
  [0, 1].forEach(i => { ctx.beginPath(); ctx.arc(496 + i * 32, 946, 9, 0, Math.PI * 2); ctx.fillStyle = i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.3)'; ctx.fill(); });
  surface(ctx, 856, 900, 128, 92, 40, 'off'); icon(ctx, icons['step-forward'], 920, 946, 52, 0.85);
}

export function drawStates(ctx, icons) {
  // states sheet: 5 tiles in a row, 1600 x 520 canvas expected
  const S = ['off', 'hover', 'on', 'pressed', 'locked'], L = ['Off', 'Hover', 'On', 'Pressed', 'Locked'];
  const g = ctx.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#161B38'); g.addColorStop(1, '#0B0F24');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1600, 520);
  S.forEach((s, i) => {
    const x = 40 + i * 312, y = 40, w = 272, h = 268;
    surface(ctx, x, y, w, h, 56, s);
    icon(ctx, icons.art, x + w / 2, y + 104, 112, iconAlpha(s));
    text(ctx, 'Art', x + w / 2, y + 226, THEME.type.label, labelColor(s), 'center');
    ctx.beginPath(); ctx.arc(x + w - 36, y + 36, 11, 0, Math.PI * 2);
    ctx.fillStyle = (s === 'on' || s === 'pressed') ? THEME.accent : 'rgba(255,255,255,0.18)'; ctx.fill();
    if (s === 'locked') icon(ctx, icons.lock, x + 44, y + 44, 44, 1);
    text(ctx, L[i], x + w / 2, 420, THEME.type.label, THEME.text.secondary, 'center');
  });
}

// Added by Turing for ns-vrpanel.js (no drawing change): expose the helpers the extra pages reuse.
export { text, icon, iconAlpha, labelColor };
