// s36-heart: "You heard the command against adultery / I tell you lust can sin within the heart".
// The lamp of the body. A dark stone room; a clay oil lamp on an old board; its flame gutters, leans
// and tears and sends a thread of black soot curling up the lit wall. From "lust" it gutters harder
// and smokes more; on "heart" the light sinks to a dim, unsteady glow while the smoke climbs on into
// the dark. The camera pushes in slowly from low and to the left, focus on the flame.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { HEART_GLSL, HEART_UNIFORMS } from '/song/lib/x-heart.js';

export const kind = 'shader';

export default (P) => {
  const [l1, l2] = linesAt(P.from - 0.6, 'You heard the command against adultery', 'I tell you lust');
  const lust = wordIn(l2, 'lust').start, heartW = wordIn(l2, 'heart').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0025);
    return {
      pos: [-0.13 + 0.05 * p + d[0], 0.115 - 0.012 * p + d[1], -0.5 + 0.12 * p],
      target: [0.03 + 0.01 * p, 0.085 - 0.01 * p, 0.04], fov: 32,
    };
  };
  return {
    name: 's36-heart', from: P.from, to: P.to,
    frag: HEART_GLSL + 'vec3 shade(vec2 fc) { return heart(fc); }',
    uniforms: { ...HEART_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(0.08 - c.pos[0], 0.05 - c.pos[1], 0.0 - c.pos[2]);
      u.uAper.value = 0.0035;
      const g = clamp01((t - (lust - 0.4)) / 1.2);
      u.uGut.value = 0.4 + 0.6 * ease.inOut3(g);
      // on "lust" and again on "heart" the guttering flame throws up a gout of soot
      const gout = (t0) => { const x = t - t0; return x > 0 ? (1 - Math.exp(-x * 6)) * Math.exp(-x * 0.9) : 0; };
      u.uSoot.value = 0.5 + 0.6 * ease.inOut3(g) + 0.7 * gout(lust) + 0.8 * gout(heartW);
      u.uDim.value = ease.inOut3(clamp01((t - heartW + 0.05) / 0.9));
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.08, threshold: 1.1, saturation: 0.98, vignette: 0.55, contrast: 1.02, lift: [0.004, 0.004, 0.006], grain: 0.014 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.92, 0.8], amount: 0.4 } }; },
  };
};
