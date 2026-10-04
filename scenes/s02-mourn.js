// s02-mourn: "Blessed are the ones who mourn / They will find their comfort".
// Night rain at a doorway: drops strike the dark wet basalt and splash; behind, through the rain and
// out of focus, a clay lamp burns steady in a sheltered niche. On "comfort" the rain eases and the
// drops in front of the lamp catch its light like falling sparks; then the focus racks from the rain
// to the steady lamp.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys } from '/song/lib/look.js';
import { RAIN_GLSL, RAIN_UNIFORMS } from '/song/lib/x-nature-rain.js';

export const kind = 'shader';

export default (P) => {
  const [, L2] = linesAt(P.from - 0.6, 'Blessed are the ones', 'They will find');
  const comfort = wordIn(L2, 'comfort').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.006);
    return { pos: [0.04 - 0.08 * p + d[0], 0.3 + 0.06 * p + d[1], -0.9 + 0.55 * p], target: [0.55, 0.3 + 0.04 * p, 2.4], fov: 40 };
  };
  return {
    name: 's02-mourn', from: P.from, to: P.to,
    frag: RAIN_GLSL + 'vec3 shade(vec2 fc) { return mourn(fc); }',
    uniforms: { ...RAIN_UNIFORMS, uAper: 0.009 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const lampD = Math.hypot(-0.29 - c.pos[0], 0.59 - c.pos[1], 2.42 - c.pos[2]);
      // focus on the rain a little in front of us, then rack to the lamp at the end
      const rack = ease.inOut3(clamp01((t - (P.to - 1.6)) / 1.3));
      u.uFocus.value = keys(t, [[P.from, 0.75], [comfort, 0.9]], ease.inOut3) * (1 - rack) + lampD * rack;
      u.uEase.value = ease.inOut3(clamp01((t - comfort + 0.15) / 1.4));
      u.uSpark.value = ease.out3(clamp01((t - comfort + 0.1) / 0.6));
      u.uLampK.value = 1 + 0.12 * ease.inOut3(clamp01((t - comfort) / 1.5));
    },
    post(t) { return grade(t, { exposure: 1.25, bloom: 0.1, threshold: 1.1, vignette: 0.48, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.3 }, grade: { shadows: [0.0, 0.012, 0.03], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
