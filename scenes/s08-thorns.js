// s08-thorns: "Those who suffer for doing right have the kingdom".
// Dark thorn branches in silhouette close to the lens; behind them a band of warm light rises over the
// hills, and on "kingdom" it breaks through the gaps between the thorns and flares through the lens.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { THORN_GLSL, THORN_UNIFORMS } from '/song/lib/x-nature-thorns.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Those who suffer');
  const kingdom = wordIn(L, 'kingdom').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.003);
    return { pos: [0.02 - 0.03 * p + d[0], -0.04 + 0.03 * p + d[1], 0.0 + 0.12 * p], target: [0.0, 0.03 + 0.02 * p, 10], fov: 44 };
  };
  return {
    name: 's08-thorns', from: P.from, to: P.to,
    frag: THORN_GLSL + 'vec3 shade(vec2 fc) { return thorns(fc); }',
    uniforms: { ...THORN_UNIFORMS, uAper: 0.0035 },
    camera: cam,
    update(t, u) {
      u.uRise.value = ease.inOut3(clamp01((t - P.from + 0.2) / (kingdom - P.from)));
      u.uBreak.value = ease.out3(clamp01((t - kingdom + 0.04) / 0.5));
      u.uFocus.value = mix(0.7, 0.62, clamp01((t - P.from) / (P.to - P.from)));
    },
    post(t) { return grade(t, { exposure: 1.4, bloom: 0.14, threshold: 0.9, vignette: 0.5 }); },
    finish(t) { return { flare: { amount: 0.25, threshold: 0.85, tint: [1.0, 0.72, 0.4], length: 0.4 }, grade: { shadows: [0.01, 0.01, 0.03], highlights: [1.0, 0.92, 0.78], amount: 0.45 } }; },
  };
};
