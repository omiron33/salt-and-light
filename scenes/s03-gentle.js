// s03-gentle: "Blessed are the gentle / They will inherit the earth".
// Macro on dark tilled soil at night: a seedling's hook straightens and its two seed leaves open, a
// dewdrop holding a point of moonlight. On "inherit the earth" the camera rises and the field opens
// wide: furrows silvered by a low moon running away to the dark hills. The rise keeps going to the cut.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys, mix } from '/song/lib/look.js';
import { FIELD_GLSL, FIELD_UNIFORMS } from '/song/lib/x-nature-field.js';

export const kind = 'shader';
const BY = 0.066;   // the crest the seedling stands on

export default (P) => {
  const [L1, L2] = linesAt(P.from - 0.6, 'Blessed are the gentle', 'They will inherit');
  const inherit = wordIn(L2, 'inherit').start;
  const r0 = inherit - 0.35;                     // the rise begins just before "inherit"
  const rise = (t) => clamp01((t - r0) / (P.to - r0));
  const cam = (t) => {
    const a = clamp01((t - P.from) / (r0 - P.from));
    const d = drift(t, 0.002);
    // a low slow glide along the row of sprouts on the nearest furrow crest
    const z0 = -0.55 + 0.75 * a;
    const mp = [0.06 + d[0], BY + 0.085 + d[1], z0];
    const mt = [-0.01, BY + 0.0, z0 + 1.0];
    // the rise: an accelerating climb up and back, the gaze lifting from the seedling to the hills
    const k = rise(t);
    const kp = k * k * (3 - 2 * k) * 0.6 + 0.4 * k * k * k;   // eased in, still moving at the end
    const up = 0.012 + 3.2 * Math.pow(kp, 1.6);
    const pos = [mp[0] * (1 - kp) + 0.25 * kp, mp[1] + up, mp[2] - 2.2 * kp];
    const look = ease.inOut3(clamp01(k * 1.25));
    const target = [mix(mt[0], -110, look), mix(mt[1], 14, look), mix(mt[2], 400, look)];
    return { pos, target, fov: mix(32, 46, ease.inOut3(k)) };
  };
  return {
    name: 's03-gentle', from: P.from, to: P.to,
    frag: FIELD_GLSL + 'vec3 shade(vec2 fc) { return gentle(fc); }',
    uniforms: { ...FIELD_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = rise(t);
      // the seedling uncurls through the first line and settles
      u.uUnc.value = 0.9 + 0.1 * ease.inOut3(clamp01((t - P.from) / 3));
      const seedD = 0.6;
      u.uFocus.value = mix(seedD, 60, ease.inOut3(clamp01(k * 2)));
      u.uAper.value = mix(0.00025, 0.0, ease.inOut3(clamp01(k * 2.5)));
    },
    post(t) { return grade(t, { exposure: 2.0, bloom: 0.08, threshold: 1.0, vignette: 0.5, saturation: 0.95, grain: 0.015, ca: 0.08 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.92, 0.96, 1.0], amount: 0.4 } }; },
  };
};
