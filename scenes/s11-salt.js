// s11-salt: "You are the salt of the earth". Extreme macro of clear cubic salt grains on dark walnut,
// the oil lamp far behind as a soft amber disc. The lens glides slowly across the drift; the focus
// breathes in and out through the grains so the glints sharpen and swell; each face that catches
// the flame throws a hard prismatic spark. At the end the camera begins to pull back.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { MACRO_GLSL, MACRO_UNIFORMS } from '/song/lib/x-salt-macro.js';
import { SALT_UNIFORMS } from '/song/lib/x-salt.js';

export const kind = 'shader';

export default (P) => {
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const e = ease.inOut3(p);
    const d = drift(t, 0.05);
    const back = ease.in2(clamp01((p - 0.7) / 0.3));
    return {
      pos: [-5.0 + 7.0 * p + d[0] * 3.0, 11.0 + 0.6 * e + 5.0 * back + d[1] * 3.0, -12.0 + 1.0 * e - 7.0 * back],
      target: [-2.0 + 6.0 * p, 4.0, 14.0],
      fov: 30,
    };
  };
  return {
    name: 's11-salt', from: P.from, to: P.to,
    frag: MACRO_GLSL + 'vec3 shade(vec2 fc) { return macro(fc); }',
    uniforms: { ...SALT_UNIFORMS, uSaltSize: 0.5, uSaltVar: 1.0, uSaltBed: 3.0, uSaltCleave: 0.8, uSaltMilk: 1.2, uSaltBody: 2.2, uSaltDiff: 0.6, uSaltTilt: 0.6, uSaltDisp: 0.4, ...MACRO_UNIFORMS },
    camera: cam,
    update(t, u) {
      const p = (t - P.from) / dur;
      // focus breathes: through the near grains to the drift's crest and back
      u.uFocus.value = 22.5 + 3.0 * Math.sin(p * Math.PI * 1.6 - 0.6) + 7.0 * ease.in2(clamp01((p - 0.7) / 0.3));
      u.uAper.value = 0.28;
      u.uLampK.value = 1.0 + 0.05 * Math.sin(t * 3.1);
    },
    post(t) { return grade(t, { exposure: 1.25, bloom: 0.14, threshold: 1.0, vignette: 0.5, saturation: 1.02 }); },
  };
};
