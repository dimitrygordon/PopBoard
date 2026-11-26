// Night Sky input. Desktop/phone: drag to look (mouse or touch), click/tap to pick, keyboard.
// Headset: controllers and hands through three's WebXR controllers (targetRaySpace), so a hand pinch arrives as
// the same "select" event as a trigger on Quest. Grip drag and thumbstick scrub time; B/Y toggles the panel.

/** Desktop and phone. getView()/setView({yaw, pitch}) in radians; onTap(clientX, clientY); onKey(e). */
export function attachDesktop({ canvas, getView, setView, onTap, onKey }) {
  let drag = null; const TAP_PX = 6;
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, view: getView() };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (Math.hypot(dx, dy) > TAP_PX) drag.moved = true;
    if (!drag.moved) return;
    // degrees per pixel follows the vertical field of view so the sky tracks the finger
    const k = (getView().fovDeg * Math.PI / 180) / canvas.clientHeight;
    setView({ yaw: drag.view.yaw + dx * k, pitch: Math.max(-1.55, Math.min(1.55, drag.view.pitch + dy * k)) });
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && e.type === "pointerup") onTap(e.clientX, e.clientY);
    drag = null;
  };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false }); // no zoom (comfort rule)
  window.addEventListener("keydown", (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.target && e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    onKey(e);
  });
}

/** Headset input. cb: { onSelectStart(i, ray), onSelectEnd(i), onScrubHours(dh), onTogglePanel(), onHover(i, ray) } */
export class XRInput {
  constructor(THREE, renderer, scene, cb) {
    this.THREE = THREE; this.renderer = renderer; this.cb = cb; this.ctrl = [];
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i); const grip = renderer.xr.getControllerGrip(i); const hand = renderer.xr.getHand(i);
      const ray = new THREE.Line(rayGeo, new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.6 })); ray.scale.z = 5; ray.renderOrder = 50; c.add(ray);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfe0ff })); grip.add(knob);
      const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe8edf5 }), 25); joints.count = 0; joints.frustumCulled = false; scene.add(joints);
      const st = { c, grip, hand, ray, joints, source: null, squeeze: null, menuWas: false, selecting: false };
      c.addEventListener("connected", (e) => { st.source = e.data; ray.visible = true; knob.visible = !e.data.hand; });
      c.addEventListener("disconnected", () => { st.source = null; ray.visible = false; });
      c.addEventListener("selectstart", () => { st.selecting = true; cb.onSelectStart(i, this.rayOf(i)); });
      c.addEventListener("selectend", () => { st.selecting = false; cb.onSelectEnd(i); });
      c.addEventListener("squeezestart", () => { st.squeeze = { yaw: this.yawOf(i) }; });
      c.addEventListener("squeezeend", () => { st.squeeze = null; });
      scene.add(c, grip, hand); this.ctrl.push(st);
    }
  }
  rayOf(i) {
    const T = this.THREE, c = this.ctrl[i].c;
    const o = new T.Vector3().setFromMatrixPosition(c.matrixWorld);
    const d = new T.Vector3(0, 0, -1).transformDirection(c.matrixWorld);
    return { origin: o, dir: d };
  }
  yawOf(i) { const d = this.rayOf(i).dir; return Math.atan2(-d.x, -d.z); }
  update(dt) {
    const T = this.THREE, m = new T.Matrix4();
    this.ctrl.forEach((st, i) => {
      if (!st.source) return;
      const ray = this.rayOf(i);
      this.cb.onHover(i, ray);
      // grip drag: sweep the hand right (yaw decreases) and time runs forward; sky turns with the hand
      if (st.squeeze) {
        const y = this.yawOf(i); let dy = y - st.squeeze.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        if (Math.abs(dy) > 1e-4) { this.cb.onScrubHours(-dy * 180 / Math.PI / 15.041); st.squeeze.yaw = y; }
      }
      const gp = st.source.gamepad;
      if (gp) {
        const x = gp.axes.length >= 4 ? gp.axes[2] : 0;
        if (Math.abs(x) > 0.15) this.cb.onScrubHours(x * dt); // full deflection = 1 hour per second
        const menu = !!(gp.buttons[5] && gp.buttons[5].pressed); // B (right) or Y (left)
        if (menu && !st.menuWas) this.cb.onTogglePanel();
        st.menuWas = menu;
      }
      // hands: small spheres at the joints, no hand models
      const joints = st.hand && st.hand.joints ? Object.values(st.hand.joints) : [];
      st.joints.count = 0;
      for (const j of joints) { if (!j.visible) continue; m.compose(j.getWorldPosition(new T.Vector3()), new T.Quaternion(), new T.Vector3(1, 1, 1)); st.joints.setMatrixAt(st.joints.count++, m); if (st.joints.count >= 25) break; }
      st.joints.instanceMatrix.needsUpdate = true;
    });
  }
  setRayLength(i, len) { this.ctrl[i].ray.scale.z = len; }
}
