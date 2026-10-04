// s07-peace: "Those who make peace will be called God's children".
// An olive grove in moonlight: gnarled trunks, silver leaves stirring. The camera glides down the lane
// between the rows. Two long moon shadows come in from either side across the grass (the walkers stay
// behind us, out of frame), draw together, and on "children" their hands clasp as the moon comes clear
// and floods the clearing ahead.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys, mix } from '/song/lib/look.js';
import { GROVE_GLSL, GROVE_UNIFORMS, CLEAR_Z } from '/song/lib/x-nature-grove.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Those who make peace');
  const children = wordIn(L, 'children').start;
  const cam = (t) => {
    const p = clamp01((t - P.from) / (P.to - P.from));
    const z = 0.5 + 7.5 * (p * 0.85 + 0.15 * p * p);
    const d = drift(t, 0.02);
    // looking down at the moonlit lane for the shadows; lifting to the clearing as the hands meet
    const lift = Math.max(0.75 * (1 - ease.inOut3(clamp01((t - P.from) / 2.2))), ease.inOut3(clamp01((t - children + 0.3) / 2.2)));
    const y = 1.9 - 0.3 * lift;
    return { pos: [0.1 + d[0], y + d[1], z], target: [0.15, y - mix(2.0, 0.2, lift), z + mix(4.0, 9, lift)], fov: mix(68, 56, lift) };
  };
  return {
    name: 's07-peace', from: P.from, to: P.to,
    frag: GROVE_GLSL + 'vec3 shade(vec2 fc) { return peace(fc); }',
    uniforms: { ...GROVE_UNIFORMS, uAper: 0.0012 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // the walkers come in through the line and their hands meet on "children"
      u.uWalk.value = ease.inOut3(clamp01((t - P.from + 0.2) / (children - 0.15 - P.from + 0.2)));
      u.uClasp.value = ease.inOut3(clamp01((t - (children - 1.3)) / 1.25));
      u.uFigZ.value = cam(Math.min(t, children)).pos[2] - 0.2;   // they stop where they meet
      u.uMoonK.value = 0.62 + 0.38 * ease.inOut3(clamp01((t - children + 0.05) / 0.9));
      u.uFocus.value = 3.6 + 4 * ease.inOut3(clamp01((t - children) / 2));
    },
    post(t) { return grade(t, { exposure: 1.9, bloom: 0.1, threshold: 1.0, vignette: 0.5, saturation: 0.95, grain: 0.015, ca: 0.08 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.012, 0.035], highlights: [0.92, 0.96, 1.0], amount: 0.45 } }; },
  };
};
