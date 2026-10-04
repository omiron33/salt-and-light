// s42-cloak: "If someone takes your coat / Give your cloak as well".
// Low and close on the verge of the road in the cold grey-blue before dawn: a woven oat-wool cloak
// lies crumpled over the stones, its loose hem lifting and settling in the wind; the paved road runs
// on behind, soft, toward the band of the coming dawn. On "Give" a second cloak, deep madder red,
// comes down over the first, billows and settles; at the end a gust lifts the hems.
import { grade, ease, drift, clamp01, mix, linesAt } from '/song/lib/look.js';
import { CLOAK_GLSL, CLOAK_UNIFORMS, CLOAK_Z } from '/song/lib/x-road-cloak.js';

export const kind = 'shader';
const roadX = (z) => 9.0 * (1 - Math.cos(z * 0.005));

export default (P) => {
  const [, l2] = linesAt(P.from - 0.6, 'If someone takes', 'Give your cloak');
  const give = l2.words[0].start;
  const cx = roadX(CLOAK_Z) + 2.3 + 1.05;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.004);
    return {
      pos: [cx + 0.35 - 0.2 * p + d[0], 0.42 - 0.04 * p + d[1], CLOAK_Z - 1.85 + 0.25 * p],
      target: [cx - 0.9 - 0.1 * p, 0.12, CLOAK_Z + 3.0], fov: 38,
    };
  };
  return {
    name: 's42-cloak', from: P.from, to: P.to,
    frag: CLOAK_GLSL + 'vec3 shade(vec2 fc) { return cloakScene(fc); }',
    uniforms: { ...CLOAK_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = 0.85 * Math.hypot(cx - 0.1 - c.pos[0], 0.05 - c.pos[1], CLOAK_Z - c.pos[2]);
      u.uAper.value = 0.003;
      u.uDawn.value = 0.1 + 0.2 * clamp01((t - P.from) / (P.to - P.from));
      u.uLay.value = clamp01((t - give + 0.25) / 1.6);
      u.uGust.value = ease.inOut3(clamp01((t - (P.to - 1.4)) / 1.2));
    },
    post(t) { return grade(t, { exposure: 2.4, bloom: 0.12, threshold: 0.9, contrast: 1.06, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.9, 0.8], amount: 0.4 } }; },
  };
};
