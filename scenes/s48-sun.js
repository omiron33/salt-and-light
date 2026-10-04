// s48-sun · "Your Father sends sunlight on evil and good"
// Sunrise over the hills of Galilee. From the slope above two fields, a field of ripe wheat and a field
// of thorns lying side by side, the camera looks east over the sea to the ridge as the sun clears it:
// the first light strikes the far shore and sweeps up across the land toward us, over the wheat and the
// thorns alike.
import { grade, ease, drift, clamp01, mix, linesAt } from '/song/lib/look.js';
import { DAWN_GLSL, DAWN_UNIFORMS, groundH, sunDir, sunColour } from '/song/lib/x-dawn.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Your Father sends');
  // standing in the top of the wheat field, at the height of a man, looking east over the ears
  // on the old wall between the two plots: the thorns to the left, the wheat to the right
  const C = [0.639, 0, -0.31];
  C[1] = groundH(C[0], C[2]) + 0.0019;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0004);
    const pos = [C[0] + d[0] * 0.3, C[1] + d[1] * 0.3 + 0.0004 * p, C[2] + 0.008 * p];
    return { pos, target: [pos[0] + 0.7, pos[1] - 0.45, pos[2] + 4.0], fov: 52 };
  };
  // the line of sunlight: from the far shore (z ~ 1.2) up across the fields to the camera and past
  const sun = L.words.find((w) => /^sunlight/i.test(w.w)).start;
  const good = L.words.at(-1).start;
  const on = L.words.find((w) => /^on$/i.test(w.w)).start;
  const front = (t) => {
    if (t < on) return mix(1.3, 0.12, ease.inOut3(clamp01((t - sun + 0.1) / (on - sun + 0.1))) ** 0.8);
    if (t < good) return mix(0.12, -0.42, clamp01((t - on) / (good - on)));
    return mix(-0.42, -0.8, ease.out3(clamp01((t - good) / (P.to - good + 0.3))));
  };
  const el = (t) => mix(-0.004, 0.075, clamp01((t - P.from) / (P.to - P.from)));
  return {
    name: 's48-sun', from: P.from, to: P.to,
    frag: DAWN_GLSL + 'vec3 shade(vec2 fc) { float d; return dawnScene(fc, d); }',
    uniforms: { ...DAWN_UNIFORMS, uSunDir: sunDir(-0.3, 0.004), uSunCol: sunColour(0.004), uMist: 0.6, uCloud: 0.35, uLampI: 0.0, uWave: 0.8, uSweep: [0, -1, -1.3], uSweepSoft: 0.12, uStalks: 1, uTreeNear: 0.15, uAper: 0.000004, uFocus: 0.03 },
    camera: cam,
    update(t, u) {
      const e = el(t);
      u.uSunDir.value.set(...sunDir(-0.3, e));
      u.uSunCol.value.set(...sunColour(Math.sin(e) + 0.02, 1.5));
      // the sweep runs toward the camera: lit where (front - (-z)) > 0, i.e. z > -front
      u.uSweep.value.set(0, -1, -front(t));
    },
    post(t) { return grade(t, { exposure: 1.15, bloom: 0.14, threshold: 1.0, vignette: 0.42, saturation: 1.05 }); },
    finish(t) { return { grade: { shadows: [0.02, 0.015, 0.035], highlights: [1.0, 0.9, 0.74], amount: 0.4 } }; },
  };
};
