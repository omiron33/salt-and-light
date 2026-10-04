// s06-pure: "Pure hearts will see God". Far out on the night lake, no wind: the water is a black
// mirror of the stars. The last ripple ring spreads out from the centre of the frame and dies away to
// glass; on "God" a great soft light opens in the heavens, and we see it in the mirror, swelling
// as the line ends.
import { grade, keys, ease, clamp01, drift, linesAt, wordIn } from '/song/lib/look.js';
import { MIRROR_GLSL, MIRROR_UNIFORMS } from '/song/lib/x-galilee-mirror.js';

export const kind = 'shader';

export default (P) => {
  const [line] = linesAt(P.from - 0.6, 'Pure hearts');
  const god = wordIn(line, 'God').start;
  const D = P.to - P.from;
  // low on the stony near shore, looking out east over the open lake
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const d = drift(t, 0.004);
    const e = ease.inOut3(k);
    const pos = [0.05 + d[0], 0.72 + 0.04 * e + d[1], 6.95 - 0.35 * e];
    const pitch = -0.1 + 0.015 * e;
    return { pos, target: [pos[0], pos[1] + 10 * Math.tan(pitch), pos[2] - 10], fov: 42 };
  };
  const ring = [0.3, -1.2, P.from - 0.5];
  return {
    name: 's06-pure', from: P.from, to: P.to,
    frag: MIRROR_GLSL + 'vec3 shade(vec2 fc) { return mirrorShot(fc); }',
    uniforms: { ...MIRROR_UNIFORMS, uSwell: 0.0, uMist: 0.0, uStars: 1.25, uRing: ring, uAper: 0.0,
      uGloryDir: [0.1, 0.3, -0.95], uFocus: 4.0 },
    camera: cam,
    update(t, u) {
      // the light opens on "God" and keeps swelling
      const g = ease.out3(clamp01((t - god + 0.1) / 0.9)) * (1.0 + 0.6 * ease.inOut3(clamp01((t - god - 0.6) / (P.to - god))));
      u.uGlory.value = 0.9 * g;
    },
    post(t) { return grade(t, { exposure: 3.6, bloom: 0.16, threshold: 0.85, vignette: 0.48, saturation: 1.0, contrast: 1.04, lift: [0.005, 0.006, 0.011] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.94, 0.82], amount: 0.45 } }; },
  };
};
