// s49-rain · "And rain on the just and unjust"
// Rain falling in sunlight over the hills. From the lower slope the camera looks west, uphill, over the
// wheat field and the thorn field to the mount under a dark rain sky; the low morning sun behind us
// lights the land and every falling drop, which glitter as they fall on both fields alike, and a faint
// rainbow stands in the mist over the hills. The camera drifts slowly sideways through the rain.
import { grade, ease, drift, clamp01, mix, linesAt } from '/song/lib/look.js';
import { DAWN_GLSL, DAWN_UNIFORMS, groundH, sunDir, sunColour } from '/song/lib/x-dawn.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'And rain');
  const C = [0.7, 0, 0.07];
  C[1] = groundH(C[0], C[2]) + 0.009;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0004);
    const pos = [C[0] + 0.02 * p + d[0] * 0.5, C[1] + 0.001 * p + d[1] * 0.5, C[2] + 0.004 * p];
    return { pos, target: [pos[0] + 0.3, pos[1] - 0.25, pos[2] - 4.0], fov: 60 };
  };
  const rainOn = (t) => clamp01((t - P.from + 0.3) / 0.6);
  return {
    name: 's49-rain', from: P.from, to: P.to,
    frag: DAWN_GLSL + 'vec3 shade(vec2 fc) { float d; return dawnScene(fc, d); }',
    uniforms: { ...DAWN_UNIFORMS, uSunDir: sunDir(0.35, 0.08), uSunCol: sunColour(0.08, 1.4), uMist: 0.8, uCloud: 1.0, uStorm: 0.8, uRain: 1.0, uBow: 0.0, uStalks: 1, uTreeNear: 0.15, uLampI: 0.0, uWave: 1.0 },
    camera: cam,
    update(t, u) {
      u.uRain.value = rainOn(t);
      // the bow comes up through the mist after "rain" and holds
      u.uBow.value = 0.7 * ease.inOut3(clamp01((t - L.words[1].start) / 1.5));
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.14, threshold: 1.0, vignette: 0.45, saturation: 1.05 }); },
    finish(t) { return { grade: { shadows: [0.01, 0.02, 0.04], highlights: [1.0, 0.92, 0.8], amount: 0.35 } }; },
  };
};
