// s25-altar: "When you bring your gift to the altar". The temple court at night: an altar of unhewn
// stones with a fire on top; on its broad step, a basket of loaves and a jar of oil, set down in the
// light of a small clay lamp. The camera starts low at the gift and rises with the smoke from the
// altar fire, up the face of the altar to the fire and the smoke climbing into the night.
import { grade, ease, drift, clamp01, mix } from '/song/lib/look.js';
import { COURT_GLSL, COURT_UNIFORMS } from '/song/lib/x-temple-court.js';

export const kind = 'shader';

export default (P) => {
  // hold on the gift, then rise with the smoke to the fire and the sky
  const tR = P.from + 1.1;
  const cam = (t) => {
    const d = drift(t, 0.004);
    const h = ease.inOut3(clamp01((t - P.from) / (tR - P.from)));
    const p = ease.inOut3(clamp01((t - tR) / (P.to - tR)));
    const pos0 = [mix(0.6, 0.5, h), mix(0.72, 0.68, h), mix(-2.3, -2.12, h)];
    const tg0 = [-0.02, 0.36, -1.32];
    const pos = [mix(pos0[0], 0.6, p) + d[0], mix(pos0[1], 1.4, p) + d[1], mix(pos0[2], -4.1, p)];
    const target = [mix(tg0[0], 0.45, p), mix(tg0[1], 4.4, p), mix(tg0[2], 0.4, p)];
    return { pos, target, fov: mix(30, 52, p) };
  };
  return {
    name: 's25-altar', from: P.from, to: P.to,
    frag: COURT_GLSL + 'vec3 shade(vec2 fc) { return court(fc); }',
    uniforms: { ...COURT_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const p = ease.inOut3(clamp01((t - tR) / (P.to - tR)));
      // focus travels from the gift up to the fire
      const fp = [mix(-0.05, 0.0, p), mix(0.4, 2.0, p), mix(-1.3, -0.3, p)];
      u.uFocus.value = Math.hypot(c.pos[0] - fp[0], c.pos[1] - fp[1], c.pos[2] - fp[2]);
      u.uAper.value = mix(0.005, 0.002, p);
      u.uFire.value = 1; u.uSmoke.value = 1;
    },
    post(t) { return grade(t, { exposure: 1.6, bloom: 0.1, threshold: 1.0, contrast: 1.05, vignette: 0.5, grain: 0.014, ca: 0.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.92, 0.8], amount: 0.4 } }; },
  };
};
