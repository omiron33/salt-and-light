// s47-pray: "Pray for the ones who persecute you".
// The icon corner of a house before dawn. A lampada of ruby glass glows on a small corner shelf, its
// flame floating on the oil; beside it lies a prayer rope of black wool with its knotted cross. The
// walls hold the lamp's red glow below and a ring of gold above. On "Pray" the flame trembles, and
// over "persecute you" it steadies and stands still and tall. The camera pushes in slowly.
import { grade, ease, drift, clamp01, mix, linesAt, wordIn } from '/song/lib/look.js';
import { VIGIL_GLSL, VIGIL_UNIFORMS } from '/song/lib/x-vigil.js';

export const kind = 'shader';

export default (P) => {
  const [l] = linesAt(P.from - 0.6, 'Pray for the ones');
  const pray = l.words[0].start, pers = wordIn(l, 'persecute').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0015);
    const r = mix(0.5, 0.4, p);
    const a = mix(-2.05, -2.2, p);
    return {
      pos: [Math.cos(a) * r + d[0], 0.2 - 0.03 * p + d[1], Math.sin(a) * r],
      target: [-0.02, 0.07, -0.035], fov: 36,
    };
  };
  return {
    name: 's47-pray', from: P.from, to: P.to,
    frag: VIGIL_GLSL + 'vec3 shade(vec2 fc) { return vigilScene(fc); }',
    uniforms: { ...VIGIL_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[1] - 0.11, c.pos[2]);
      u.uAper.value = 0.0022;
      // a breath of air on "Pray" sets the flame trembling; it steadies through "persecute you"
      const up = clamp01((t - pray + 0.15) / 0.3);
      const down = 1 - ease.inOut3(clamp01((t - pers) / 1.4));
      u.uTremble.value = 0.12 + 0.88 * up * down;
    },
    post(t) { return grade(t, { exposure: 1.6, bloom: 0.14, threshold: 0.85, contrast: 1.05, vignette: 0.5, saturation: 1.02 }); },
    finish(t) { return { grade: { shadows: [0.02, 0.008, 0.01], highlights: [1.0, 0.92, 0.82], amount: 0.35 } }; },
  };
};
