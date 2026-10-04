// s29-taste2: "Do not let it lose its taste" (second chorus). A supper table by lamplight: a small
// wooden bowl heaped with coarse salt in front, a round loaf broken in two behind it, the clay lamp
// burning further back on the left. The focus starts in the salt, where the grains spark in the
// flame's light, and slides across the grains and on to the broken bread as the line ends: salt
// that seasons. The camera drifts slowly round to the right.
import { grade, ease, drift, clamp01, linesAt, wordIn } from '/song/lib/look.js';
import { TABLE_GLSL, TABLE_UNIFORMS } from '/song/lib/x-vessel-table.js';
import { SALT_UNIFORMS } from '/song/lib/x-salt.js';

export const kind = 'shader';

export default (P) => {
  const [l] = linesAt(P.from - 0.6, 'Do not let it lose');
  const lose = wordIn(l, 'lose').start, taste = wordIn(l, 'taste').start;
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const e = ease.inOut3(p);
    const d = drift(t, 0.0012);
    return {
      pos: [0.06 + 0.04 * e + d[0], 0.11 - 0.008 * e + d[1], -0.19 + 0.015 * e],
      target: [0.02 + 0.04 * e, 0.045, 0.14],
      fov: 36,
    };
  };
  // focus: the near grains, sliding across the heap, then on to the bread
  const fNear = 0.16, fFar = 0.33;
  const focusAt = (t) => {
    const a = ease.inOut3(clamp01((t - (P.from + 0.2)) / (lose - P.from + 0.2)));
    const b = ease.inOut3(clamp01((t - lose) / (taste - lose + 0.4)));
    return fNear + 0.05 * a + (fFar - fNear - 0.05) * b;
  };
  return {
    name: 's29-taste2', from: P.from, to: P.to,
    frag: TABLE_GLSL + 'vec3 shade(vec2 fc) { return table(fc); }',
    uniforms: { ...SALT_UNIFORMS, uSaltCleave: 1.0, uSaltMilk: 0.35, uSaltDiff: 0.8, uSaltBody: 1.6, uSaltTilt: 0.9, uSaltSize: 0.46, ...TABLE_UNIFORMS },
    camera: cam,
    update(t, u) {
      u.uFocus.value = focusAt(t);
      u.uAper.value = 0.0025;
    },
    post(t) { return grade(t, { exposure: 1.7, bloom: 0.14, threshold: 1.0, vignette: 0.5 }); },
  };
};
