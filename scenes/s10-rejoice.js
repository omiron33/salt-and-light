// s10-rejoice: "Rejoice; your reward is in heaven". The camera rises up through the storm deck that
// gathered over the hills in the last shot. A rift tears open above; it widens into a vast clear night
// of stars, and on "heaven" the Father's light pours down through the opening, silvering the torn
// walls of cloud and hanging in shafts in the air of the rift.
import { grade, keys, ease, clamp01, drift, linesAt, wordIn } from '/song/lib/look.js';
import { CLOUD_GLSL, CLOUD_UNIFORMS } from '/song/lib/x-galilee-clouds.js';

export const kind = 'shader';

export default (P) => {
  const [l1] = linesAt(P.from - 0.6, 'Rejoice');
  const heaven = wordIn(l1, 'heaven').start;
  const D = P.to - P.from;
  // rising up the axis of the rift, looking up into it
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const y = 1000 + 1000 * ease.inOut3(k);
    const d = drift(t, 3.0);
    const pos = [d[0], y + d[1], -120 + 120 * k];
    const el = 0.85 + 0.12 * ease.inOut3(k);
    const target = [0, y + Math.sin(el) * 100, pos[2] + Math.cos(el) * 100];
    return { pos, target, fov: 55, roll: 0.05 * Math.sin(t * 0.25) - 0.05 * k };
  };
  return {
    name: 's10-rejoice', from: P.from, to: P.to,
    frag: CLOUD_GLSL + 'vec3 shade(vec2 fc) { return cloudShot(fc); }',
    uniforms: { ...CLOUD_UNIFORMS, uStars: 1.3, uGloryDir: [0.0, 0.88, 0.47], uAper: 0.0 },
    camera: cam,
    update(t, u) {
      const k = clamp01((t - P.from) / D);
      const open = ease.inOut3(clamp01((t - P.from - 0.3) / (heaven - P.from)));
      u.uHole.value.set(0, 140, 30 + 170 * open + 90 * clamp01((t - heaven) / (P.to - heaven)));
      u.uDrift.value = t * 0.05;
      u.uGlory.value = 0.3 + 0.3 * open + 0.9 * ease.out3(clamp01((t - heaven + 0.15) / 1.1));
      u.uFlash.value = 0.6 * Math.exp(-Math.pow((t - P.from - 0.25) / 0.12, 2)) + 0.35 * Math.exp(-Math.pow((t - P.from - 0.62) / 0.08, 2));
    },
    post(t) { return grade(t, { exposure: 2.6, bloom: 0.16, threshold: 0.85, vignette: 0.48, saturation: 1.02, contrast: 1.05, lift: [0.005, 0.006, 0.011] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.93, 0.8], amount: 0.45 } }; },
  };
};
