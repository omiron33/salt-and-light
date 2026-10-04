// s51-perfect · "Be perfect, as your Father in heaven is perfect"
// The mount above the Sea of Galilee in full dawn. From the olive slopes of the mount the camera looks
// east across the water to the sun just risen over the far ridge; light pours over the hills and along
// the water in a road of fire. The camera rises slowly the whole time; on the first "perfect" the
// light swells, and on the last it fills everything with gold.
import { grade, ease, drift, clamp01, mix, linesAt, wordIn } from '/song/lib/look.js';
import { DAWN_GLSL, DAWN_UNIFORMS, groundH, sunDir, sunColour } from '/song/lib/x-dawn.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Be perfect');
  const p1 = wordIn(L, 'perfect').start;
  const p2 = L.words.at(-1).start;
  // from just behind the crest of the mount, rising over it to the sea and the sun
  const g0 = groundH(-0.62, -0.8);
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0006);
    const pos = [-0.62 + d[0], g0 + 0.03 + 0.07 * p + d[1], -0.62 + 0.45 * p];
    return { pos, target: [pos[0] - 1.0, pos[1] - 0.24 - 0.02 * p, pos[2] + 5.0], fov: 40 };
  };
  // the gold: a swell on the first "perfect", then the whole landscape filling on the last
  const gold = (t) => 0.35 * ease.out3(clamp01((t - p1 + 0.1) / 1.6)) * (1 - 0.4 * clamp01((t - p1 - 1.6) / 2)) + 1.0 * ease.inOut3(clamp01((t - p2 + 0.2) / 3.0));
  const el = (t) => mix(0.035, 0.075, clamp01((t - P.from) / (P.to - P.from)));
  return {
    name: 's51-perfect', from: P.from, to: P.to,
    frag: DAWN_GLSL + 'vec3 shade(vec2 fc) { float d; return dawnScene(fc, d); }',
    uniforms: { ...DAWN_UNIFORMS, uSunDir: sunDir(-0.32, 0.04), uSunCol: sunColour(0.04), uMist: 0.45, uCloud: 0.3, uFill: 1.8, uTreeNear: 0.12, uStalks: 1, uLampI: 0.0, uWave: 0.8 },
    camera: cam,
    update(t, u) {
      const e = el(t), g = gold(t);
      u.uSunDir.value.set(...sunDir(-0.32, e));
      u.uSunCol.value.set(...sunColour(Math.sin(e), 1 + 0.6 * g));
      u.uGold.value = g;
    },
    post(t) { const g = gold(t); return grade(t, { exposure: 1.0 + 0.12 * g, bloom: 0.14 + 0.06 * g, threshold: 1.0, vignette: 0.4, saturation: 1.05 }); },
    finish(t) { return { grade: { shadows: [0.02, 0.015, 0.03], highlights: [1.0, 0.9, 0.72], amount: 0.4 } }; },
  };
};
