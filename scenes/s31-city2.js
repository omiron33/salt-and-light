// 31 · "A city on a hill cannot hide" (the second chorus). The same town from high above in the
// blue hour before dawn: its windows still lit, mist lying in the valleys around the hill, the Sea of
// Galilee beyond under a pale band in the east. The camera descends slowly toward the town.
import { grade, drift, mix } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const cam = (t) => {
    const x = (t - P.from) / (P.to - P.from);
    const p = x * (0.9 + 0.1 * x);
    const d = drift(t, 0.08);
    const pos = [mix(-345, -290, p) + d[0], mix(185, 128, p) + d[1], mix(175, 150, p)];
    const target = [mix(500, 480, p), mix(-90, -70, p), mix(-120, -110, p)];
    return { pos, target, fov: 42 };
  };
  return {
    name: 's31-city2', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uDay.value = 1.15; u.uLit.value = 0.95; u.uMist.value = 1.0;
      u.uFocus.value = 400; u.uAper.value = 0.0;
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.5, bloom: 0.18, threshold: 0.85, vignette: 0.45 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 1.4, tint: [1.0, 0.75, 0.5], length: 0.2 }, grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.93, 0.85], amount: 0.35 } }; },
  };
};
