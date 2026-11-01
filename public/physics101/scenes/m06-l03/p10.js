// Supply drop: plane 30 to 80 m/s (50), height 100 to 500 m (300), wind -10 to 10 m/s (0, + is a tailwind on the package). Drag ignored. Release (v + w) t before the target, t = sqrt(2h/g).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Plane speed", min: 30, max: 80, step: 1, value: 50, unit: "m/s", d: 0 }, { key: "h", label: "Height", min: 100, max: 500, step: 10, value: 300, unit: "m", d: 0 }, { key: "w", label: "Wind", min: -10, max: 10, step: 1, value: 0, unit: "m/s", d: 0 }],
    cuts: [
    { id: "drop", label: "Drop the package", tap: (st) => { const t = Math.sqrt(2 * st.h / 9.8); return `Release ${f2((st.v + st.w) * t, 0)} meters before the safe zone. It falls for ${f2(t, 1)} seconds on roughly a projectile path.`; } }],
    show: (st) => { const t = Math.sqrt(2 * st.h / 9.8); return `fall ${f2(t, 1)} s; release ${f2((st.v + st.w) * t, 0)} m before the zone`; },
  });
  ctx.art.touchable(["drop"]);
  return { destroy() {} };
}
