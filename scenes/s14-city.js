// 14 · "A city on a hill cannot hide". The hero shot: a hilltop town of stone at night above a misty
// valley, hundreds of lamplit windows and open doorways under a field of stars; the camera rises
// slowly out of the valley mist, past the olive trees, toward it.
import { grade, drift, mix } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const cam = (t) => {
    const x = (t - P.from) / (P.to - P.from);
    const p = x * (0.85 + 0.15 * x);   // a steady rise, gathering a little
    const d = drift(t, 0.06);
    const pos = [mix(-52, -46, p) + d[0], mix(21, 40, p) + d[1], mix(305, 282, p)];
    const target = [mix(4, 6, p), mix(52, 60, p), 0];
    return { pos, target, fov: 31 };
  };
  return {
    name: 's14-city', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS, uMoonDir: [-0.72, 0.4, 0.56], uMistTop: 24, uSmoke: 1 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uDay.value = 0.0; u.uLit.value = 1.0; u.uMist.value = 1.0;
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[2]) - 60; u.uAper.value = 0.035;
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.75, bloom: 0.3, threshold: 0.55, vignette: 0.55, contrast: 1.08 }); },
    finish(t) { return { flare: { amount: 0.06, threshold: 1.4, tint: [1.0, 0.7, 0.4], length: 0.2 }, grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.9, 0.78], amount: 0.4 } }; },
  };
};
