// s04-thirst: "Those who hunger and thirst for righteousness / Will be filled".
// Cracked dry mud at night under a low moon. A thin stream finds the cracks and runs down them to a
// small clay cup sunk to its rim in the earth; the cup fills, brims and overflows, and on "filled" the
// water is lit gold from within. The overflow spreads over the ground toward the lens.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys, mix } from '/song/lib/look.js';
import { SPRING_GLSL, SPRING_UNIFORMS, PATH_LEN } from '/song/lib/x-nature-spring.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 0.6, 'Those who hunger', 'Will be filled');
  const filled = wordIn(L2, 'filled').start;
  const thirst = wordIn(L1, 'thirst').start;
  const arrive = thirst + 0.3;          // the stream reaches the cup
  const brim = filled - 0.05;          // the cup brims as "filled" is sung
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.002);
    return {
      pos: [mix(0.26, 0.04, p) + d[0], mix(0.3, 0.17, p) + d[1], mix(-0.62, -0.25, p)],
      target: [mix(0.08, 0.0, p), mix(0.0, 0.005, p), mix(0.3, 0.02, p)],
      fov: 40,
    };
  };
  return {
    name: 's04-thirst', from: P.from, to: P.to,
    frag: SPRING_GLSL + 'vec3 shade(vec2 fc) { return thirst(fc); }',
    uniforms: { ...SPRING_UNIFORMS, uAper: 0.0015 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // the stream's head: from the far end to the cup, slowing a little as it comes
      u.uFront.value = PATH_LEN * ease.out3(clamp01((t - P.from + 0.3) / (arrive - P.from + 0.3)));
      const fill = clamp01((t - arrive) / (brim - arrive));
      u.uLevel.value = mix(-0.027, 0.0185, ease.out3(fill)) + (t > brim ? 0.0012 * ease.out3(clamp01((t - brim) / 0.4)) : 0);
      u.uPour.value = clamp01((t - arrive + 0.1) / 0.25);
      u.uSpill.value = t > brim ? 0.064 + 0.3 * ease.out3(clamp01((t - brim) / (P.to - brim))) : 0;
      u.uGold.value = ease.out3(clamp01((t - filled + 0.08) / 0.5)) * (1 + 0.06 * Math.sin(t * 5.3));
      const cupD = Math.hypot(c.pos[0], c.pos[1], c.pos[2]);
      u.uFocus.value = mix(Math.hypot(c.pos[0] - 0.1, c.pos[1], c.pos[2] - 0.2), cupD, ease.inOut3(clamp01((t - P.from) / (arrive - P.from))));
    },
    post(t) { return grade(t, { exposure: 1.9, bloom: 0.1, threshold: 1.0, vignette: 0.5, grain: 0.015, ca: 0.08 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.93, 0.82], amount: 0.4 } }; },
  };
};
