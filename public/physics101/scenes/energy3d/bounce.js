// Why a bouncing ball stops (Every Joule Sim 4). 3D scene on core.js; all student words come from opts.text.
import { after, panel, jasper, jar, meterScale, inspector } from "./ui.js";
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { BALLS, g, ballState, energyAt, lossPerBounce } from "./physics.js";

const SCALE = 1.6; // scene units per metre
const MAXH = 2.6;

function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

export function mountBounce(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 36, camera: [2, 2.5, 6], target: [0.6, 1.6, 0], portrait: { fov: 34, camera: [2.0, 2.3, 5.6], target: [0, 1.0, 0] }, ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), col = (k) => palette[k][dark ? "dark" : "light"];
  const ink = dark ? "#EDE6D6" : "#2B2622";

  const lbl = (m, t, pos, at) => { m.userData.label = t; m.userData.labelPos = pos; if (at) m.userData.labelAnchor = at; return m; };
  // numbered wooden height ruler (Leo's bouncing-ball sheet)
  const stand = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, MAXH * SCALE + 0.1, 0.06));
  toon(post, "#D4B17E"); post.position.set(-0.8, (MAXH * SCALE) / 2 + 0.08, 0); stand.add(post);
  for (let i = 0; i <= MAXH * 10; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 5 ? 0.05 : 0.11, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: "#2B2622" }));
    tick.position.set(-0.8 + 0.055 - (i % 5 ? 0.025 : 0.055), 0.16 + (i / 10) * SCALE, 0.035); stand.add(tick);
  }
  scene.add(stand); lbl(post, T("lbl_ruler", "height ruler, from ball underside"), "left", new THREE.Vector3(0, -MAXH * SCALE / 2 + 0.1, 0));
  // layered floor slab with a hinged impact cutaway corner
  const slabG = new THREE.Group(); scene.add(slabG);
  const layer = (h, y, c, w = 1.8, d = 1.5, x = 0, z = 0) => { const m = toon(new THREE.Mesh(new THREE.BoxGeometry(w, h, d)), c); m.position.set(x, y, z); slabG.add(m); return m; };
  layer(0.05, 0.135, dark ? "#6F665A" : "#E8DDC8"); layer(0.05, 0.085, "#B8A88D"); const base = layer(0.06, 0.03, "#817664");
  lbl(base, T("lbl_floor", "floor"), "below-left", new THREE.Vector3(-0.7, 0, 0.75));
  const slab = slabG.children[0]; slab.receiveShadow = true;
  const cut = new THREE.Group(); cut.position.set(0.9, 0, 0.75); scene.add(cut);
  for (const [h, y, c] of [[0.05, 0.135, dark ? "#6F665A" : "#E8DDC8"], [0.05, 0.085, "#B8A88D"], [0.06, 0.03, "#817664"]]) { const m = toon(new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.35)), c); m.position.set(0.2, y, 0.2); cut.add(m); }
  cut.rotation.y = -0.9; lbl(cut.children[1], T("lbl_cutaway", "impact cutaway"), "below-right");
  const ringPull = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16), new THREE.MeshBasicMaterial({ color: ink })); ringPull.position.set(0.39, 0.1, 0.39); cut.add(ringPull);
  // release pad on a thin post and base
  const pad = toon(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.025, 0.4)), "#8B8C85"); pad.position.set(-0.45, 0, 0); scene.add(pad);
  const padPost = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8)), "#8B8C85"); padPost.position.set(-0.55, 0.5, -0.12); scene.add(padPost);
  const padBase = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3)), "#8B8C85"); padBase.position.set(-0.55, 0.18, -0.12); scene.add(padBase);
  lbl(pad, T("lbl_pad", "release pad"), "above-left");
  // second-rebound marker ring
  const reb = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: dark ? "#F4EFE4" : "#9A8F7C" })); reb.rotation.x = Math.PI / 2; reb.visible = false; scene.add(reb);
  lbl(reb, T("lbl_rebound", "second rebound"), "right");
  // ruler numbers every 0.5 m
  const nums = [];
  for (let v = 0; v <= MAXH + 1e-9; v += 0.5) { const d = el("div", "e3d-label", T("rulerUnit", "{v} m").replace("{v}", v.toFixed(1))); d.style.cssText = "position:absolute;transform:translate(-100%,-50%);font-size:16px;pointer-events:none;white-space:nowrap;color:" + ink; host.appendChild(d); nums.push({ d, p: new THREE.Vector3(-0.9, 0.16 + v * SCALE, 0) }); }
  const _q = new THREE.Vector3();
  onFrame(() => { for (const n of nums) { _q.copy(n.p).project(S.camera); n.d.style.left = ((_q.x + 1) / 2 * host.clientWidth) + "px"; n.d.style.top = ((1 - _q.y) / 2 * host.clientHeight) + "px"; } });

  // ball (enlarged so it stays a 44 px target) and an invisible hit shell
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20));
  let kind = "tennis", h0 = BALLS.tennis.drop, running = false, t = 0, lastB = 0, phase = "predict";
  const ballColor = { tennis: "#B7C94A", basketball: "#C77A43", tableTennis: "#F5F0DF" };
  toon(ball, ballColor[kind]);
  // seams per Leo's sheet: tennis gets a cream baseball-curve seam, basketball dark rib seams, table tennis none
  const SEAM = { tennis: "#F4EFE0", basketball: "#2B2622" };
  function seams() {
    ball.children.filter((c) => c.userData.seam).forEach((c) => { ball.remove(c); c.geometry.dispose(); });
    if (!SEAM[kind]) return;
    const R = 0.223, mat = new THREE.MeshBasicMaterial({ color: SEAM[kind] }), add = (geo) => { const m = new THREE.Mesh(geo, mat); m.userData.seam = true; ball.add(m); return m; };
    const a = 0.72, b = 0.28; // x = a cos t + b cos 3t, y = a sin t - b sin 3t, z = 2 sqrt(ab) sin 2t stays on the unit sphere
    const pts = []; for (let i = 0; i < 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(a * Math.cos(t) + b * Math.cos(3 * t), a * Math.sin(t) - b * Math.sin(3 * t), 2 * Math.sqrt(a * b) * Math.sin(2 * t)).multiplyScalar(R)); }
    const curve = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, kind === "tennis" ? 0.011 : 0.008, 6, true)); curve.rotation.set(0.5, 0.3, 0);
    if (kind === "basketball") { for (const r of [[0, 0, 0], [Math.PI / 2, 0, 0]]) add(new THREE.TorusGeometry(R, 0.008, 6, 64)).rotation.set(...r); }
  }
  seams();
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  ball.add(hit); scene.add(ball);
  const place = (h) => { ball.position.set(0, 0.38 + h * SCALE, 0); if (!running) { pad.position.y = h * SCALE + 0.15; padPost.scale.y = Math.max(0.01, h * SCALE); padPost.position.y = 0.16 + h * SCALE / 2; } };
  place(h0);
  addDrag(ball, { axis: "y", min: 0.38 + 0.1 * SCALE, max: 0.38 + MAXH * SCALE, onMove: (y) => { if (running) return; h0 = (y - 0.38) / SCALE; readout(); } });

  // energy accounts: screen-space HUD (ui.js), full bar = m g h at the top of the ruler
  const jars = {};
  for (const [k, c, nm] of [["gpe", col("gravitational"), "gravitational"], ["ke", col("kinetic"), "kinetic"], ["el", col("elastic"), "elastic (ball squash)"], ["th", col("thermal"), "ball and floor thermal"]]) { jars[k] = jar(THREE, scene, toon, 0, 0, c); jars[k].glass.userData.label = T("acct_" + k, nm); }
  const setJar = (k, f) => jars[k].set(f);
  const jScale = () => meterScale(scene, (BALLS[kind].m * g * MAXH).toFixed(3), "J");
  jScale();
  // sound: thin pink arrow, tagged estimate, no percentage (Tesla C5)
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0.4, 0), new THREE.Vector3(0.3, 0.1, 0), 0.9, col("sound"), 0.18, 0.1);
  arrow.visible = false; scene.add(arrow);

  // glowing packets
  const glow = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const packets = [];
  function packet(from, to, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(0.25); s.position.copy(from); scene.add(s);
    packets.push({ s, from: from.clone(), to: to.clone(), k: 0 });
  }

  // DOM overlay: picker, predict, Drop, explain
  const ui = panel(host, dark, T("takeaway"), T("question", "Will each rebound be lower than the last, and which accounts grow if mechanical energy falls?"));
  inspector(host, ["h_rebound/h_drop = e^2", "reference-test preset", "no spin, no air resistance, same surface, heights from ball underside", "sound: arrow, estimate, no percentage"], ["mechanical-energy decrease = thermal-energy increase + sound energy carried away"]);
  jasper(host, "bounce", T("jasperCard"));
  const pick = el("select"); pick.setAttribute("aria-label", T("pickLabel", "Ball"));
  for (const k of Object.keys(BALLS)) { const o = el("option", null, T("ball_" + k, k)); o.value = k; pick.appendChild(o); }
  ui.append(el("label", null, T("pickLabel", "Ball") + " "), pick);
  const info = el("div", "e3d-info"); ui.appendChild(info); const presetRb = after(el("div")); ui.appendChild(presetRb); // round 2: rebound after prediction
  const q = el("fieldset"); q.classList.add("e3d-predict"); q.append(el("legend", null, T("predict")));
  const choices = text.choices || ["increase", "stay", "decrease"];
  choices.forEach((c, i) => { const l = el("label", "e3d-target"); const r = el("input"); r.type = "radio"; r.name = "e3d-pred"; r.value = i; l.append(r, el("span", "e3d-ring"), el("span", null, c)); q.append(l); });
  ui.appendChild(q);
  // round 2: second committed prediction, which accounts grow when mechanical energy falls
  const q2 = el("fieldset"); q2.classList.add("e3d-predict"); q2.append(el("legend", null, T("predict2", "When mechanical energy falls, which accounts grow?")));
  (text.choices2 || ["thermal and sound", "kinetic", "gravitational", "nothing grows"]).forEach((c, i) => { const l = el("label", "e3d-target"); const r = el("input"); r.type = "radio"; r.name = "e3d-pred2"; r.value = i; l.append(r, el("span", "e3d-ring"), el("span", null, c)); q2.append(l); });
  ui.appendChild(q2);
  const drop = el("button", null, T("drop", "Drop")); drop.disabled = true; ui.appendChild(drop);
  let inspectContact = false;
  const contact = el("button", null, "Inspect compression"); contact.disabled = true; contact.dataset.noReveal = "1"; ui.append(contact);
  contact.addEventListener("click", () => { inspectContact = !inspectContact; contact.textContent = inspectContact ? "Continue rebound" : "Inspect compression"; });
  const explainBtn = el("button", null, T("explainBtn", "Explain")); explainBtn.hidden = true; ui.appendChild(explainBtn);
  const explain = el("p"); explain.hidden = true; explain.textContent = T("explain"); ui.appendChild(explain);
  const fb = el("p"); ui.appendChild(fb);
  const both = () => { if (q.querySelector("input:checked") && q2.querySelector("input:checked")) { drop.disabled = false; phase = "test"; } }; q.addEventListener("change", both); q2.addEventListener("change", both);
  pick.addEventListener("change", () => { if (running) return; kind = pick.value; h0 = Math.min(BALLS[kind].drop, MAXH); ball.children.filter((c) => c.userData.ink).forEach((c) => ball.remove(c)); toon(ball, ballColor[kind]); seams(); jScale(); place(h0); readout(); });
  explainBtn.addEventListener("click", () => { explain.hidden = false; });
  drop.addEventListener("click", () => {
    if (phase === "predict") return;
    running = true; inspectContact = false; contact.disabled = false; contact.textContent = "Inspect compression"; t = 0; lastB = 0; reb.visible = false; drop.disabled = true; pick.disabled = true;
    const sel = q.querySelector("input:checked"), right = sel && +sel.value === (text.correct ?? 2);
    const right2 = +q2.querySelector("input:checked").value === 0; fb.textContent = (right ? T("right") : T("wrong")) + " " + (right2 ? T("right2", "Yes: thermal and sound grow.") : T("wrong2", "Look again: thermal and sound grow."));
    explainBtn.hidden = false;
  });
  function readout() {
    const b = BALLS[kind];
    info.textContent = (T("readout", "{m} kg, h = {h} m, e = {e}")).replace("{m}", b.m).replace("{h}", h0.toFixed(2)).replace("{e}", b.e); presetRb.textContent = T("preset", "").replace("{rb}", b.rebound.toFixed(2));
    setJar("gpe", h0 / MAXH); setJar("el", 0); setJar("ke", 0); setJar("th", 0); arrow.visible = false;
  }
  readout();

  const ballPos = new THREE.Vector3(), jarTop = () => ballPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.15, (Math.random() - 0.5) * 0.4)); // thermal puff at the contact, ball and floor
  // impact inset (round 1 item 6): a 1.5x screen-space close-up of the contact patch; the main camera never moves
  const inset = document.createElement("canvas"); inset.className = "e3d-inset"; inset.width = 300; inset.height = 210;
  const small = (host.clientWidth || innerWidth) < 600, IW = small ? 184 : 180;
  inset.style.cssText = `position:absolute;${small ? "right:8px;top:8px" : "left:12px;bottom:12px"};width:${IW}px;height:${Math.round(IW * 0.7)}px;border:1.5px solid ${ink};border-radius:10px;background:#FBF6EA;z-index:2;pointer-events:none`;
  const insetTag = el("div", null, T("insetLabel", "impact, 1.5x")); insetTag.style.cssText = `position:absolute;${small ? `right:12px;top:${Math.round(IW * 0.7) + 12}px` : `left:18px;bottom:${Math.round(IW * 0.7) + 16}px`};z-index:2;font:16px/1 'Patrick Hand','Gochi Hand',cursive;color:${ink};pointer-events:none`;
  host.append(inset, insetTag);
  const ix = inset.getContext("2d"), _p = new THREE.Vector3();
  onFrame((dt) => {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.k += dt * 1.5;
      p.s.position.lerpVectors(p.from, p.to, Math.min(p.k, 1)); p.s.position.y += Math.sin(Math.PI * Math.min(p.k, 1)) * 0.5;
      if (p.k >= 1) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); }
    }
    if (!running) return;
    const b = BALLS[kind], impactTime = Math.sqrt(2 * h0 / g), contactDuration = 1.2;
    if (inspectContact) t = impactTime + contactDuration / 2;
    else t += S.reduce ? dt * 2 : dt;
    const inContact = t >= impactTime && t <= impactTime + contactDuration;
    const st = ballState(h0, b.e, t < impactTime ? t : Math.max(impactTime, t - contactDuration));
    place(st.y);
    const E0 = energyAt(b.m, h0, 0).total, E = energyAt(b.m, st.y, st.v);
    // One shared slow-motion contact state drives world, inset and every account.
    // The contact duration is illustrative, not a measured material property.
    const u = inContact ? (t - impactTime) / contactDuration : 0;
    const squash = inContact ? Math.sin(Math.PI * u) : 0;
    const loss = inContact ? (1 - b.e * b.e) * Math.max(0, 2 * u - 1) : 1 - E.total / E0;
    const elastic = inContact ? squash * squash * (1 - loss) : 0;
    ball.scale.set(1 + 0.4 * squash, 1 - 0.5 * squash, 1 + 0.4 * squash);
    if (inContact) place(0);
    const fraction = h0 / MAXH;
    setJar("gpe", (inContact ? 0 : E.gpe / E0) * fraction);
    setJar("ke", (inContact ? Math.max(0, 1 - loss - elastic) : E.ke / E0) * fraction);
    setJar("el", elastic * fraction); setJar("th", loss * fraction);
    host.dataset.contactState = inContact ? "compression" : "flight";
    host.dataset.elasticJ = (elastic * E0).toFixed(3);
    if (inContact) fb.textContent = `Slow-motion contact (illustrative duration): elastic ${(elastic * E0).toFixed(3)} J. Continue to see elastic return to rebound kinetic.`;
    ballPos.copy(ball.position);
    if (st.bounces > lastB) {
      const hPrev = lastB === 0 ? h0 : h0 * b.e ** (2 * lastB);
      lastB = st.bounces; arrow.visible = true; if (lastB === 2) { reb.position.set(0, 0.16 + h0 * b.e ** 4 * SCALE, 0); reb.visible = true; }
      fb.textContent = T("impact", "").replace("{loss}", (lossPerBounce(b.m, hPrev, b.e) * 1000).toFixed(1));
      for (let i = 0; i < (S.reduce ? 1 : 4); i++) packet(ballPos, jarTop("th"), col("thermal"));
    }
    if (st.rest) { contact.disabled = true; running = false; drop.disabled = false; pick.disabled = false; }
  });

  onFrame(() => {
    const cv = S.renderer.domElement, W = cv.width, H = cv.height; if (!W) return;
    S.renderer.render(scene, S.camera);
    _p.set(ball.position.x, 0.2, ball.position.z).project(S.camera);
    const sw = IW * (W / cv.clientWidth) / 1.5, sh = sw * 0.7, sx = (_p.x + 1) / 2 * W - sw / 2, sy = (1 - _p.y) / 2 * H - sh * 0.6;
    ix.fillStyle = "#FBF6EA"; ix.fillRect(0, 0, 300, 210); ix.drawImage(cv, sx, sy, sw, sh, 0, 0, 300, 210);
  });

  return { ...S, setBall(k) { pick.value = k; pick.dispatchEvent(new Event("change")); }, dispose() { inset.remove(); insetTag.remove(); ui.remove(); nums.forEach((n) => n.d.remove()); S.dispose(); } };
}
export { g };
