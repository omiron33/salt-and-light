// s07-peace: "Those who make peace will be called God's children".
// In a moonlit olive grove a sword has been laid down in the grass among the gnarled roots of an old
// olive (swords into ploughshares). Silver olive leaves drift down out of the crowns and settle on the
// worn blade. On "God's children" the camera lifts from the sword toward the clearing ahead as the moon
// comes clear and its light breaks through the crowns in soft shafts. No figures, no human shadows.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { GROVE_GLSL, GROVE_UNIFORMS, CLEAR } from '/song/lib/x-nature-grove.js';

export const kind = 'shader';
const lerp3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Those who make peace');
  const children = wordIn(L, 'children').start;
  const gods = wordIn(L, "God's").start;
  const l0 = gods - 0.3;                                   // the lift begins on "God's"
  const lift = (t) => clamp01((t - l0) / (P.to - l0));
  // a slow low glide beside the blade, from the hilt toward the point
  const A0 = [-0.64, 0.42, 0.26], A1 = [-0.62, 0.38, 0.38];
  const T0 = [0.04, 0.05, 0.98], T1 = [0.0, 0.045, 1.08];
  // the lift: up and a little back, the gaze rising from the sword to the clearing
  const B = [-0.3, 1.5, -0.1], TB = [CLEAR[0] + 0.2, 1.7, CLEAR[1]];
  const cam = (t) => {
    const a = Math.sin(1.5708 * clamp01((t - P.from) / (l0 - P.from)));
    const k = lift(t);
    const kp = ease.inOut3(k);
    const kl = ease.inOut3(clamp01(k * 1.15));
    const d = drift(t, 0.004);
    const p1 = lerp3(A0, A1, a), t1 = lerp3(T0, T1, a);
    const pos = lerp3(p1, B, kp);
    pos[0] += d[0]; pos[1] += d[1] * (0.3 + kp);
    const target = lerp3(t1, TB, kl);
    return { pos, target, fov: mix(40, 50, kp) };
  };
  return {
    name: 's07-peace', from: P.from, to: P.to,
    frag: GROVE_GLSL + 'vec3 shade(vec2 fc) { return peace(fc); }',
    uniforms: { ...GROVE_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = ease.inOut3(lift(t));
      const fd = Math.hypot(c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]);
      u.uFocus.value = mix(fd, 11, k);
      u.uAper.value = mix(0.0008, 0.0003, k);
      // the moon comes clear of the thin cloud on "children" and the shafts brighten
      const m = ease.inOut3(clamp01((t - children + 0.5) / 1.6));
      u.uMoonK.value = 0.74 + 0.26 * m;
      u.uShaft.value = 0.45 + 0.75 * m;
    },
    post(t) { return grade(t, { exposure: 1.9, bloom: 0.1, threshold: 1.0, vignette: 0.45, saturation: 0.95, grain: 0.01, ca: 0.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.012, 0.035], highlights: [0.92, 0.96, 1.0], amount: 0.45 } }; },
  };
};
