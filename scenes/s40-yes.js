// s40-yes: "But let your yes be yes / And let your no be no".
// The plumb line comes to rest. Clean warm lamplight from the right now rakes the same dressed stone;
// the last small swing dies away before "yes", and the line hangs perfectly true, laid exactly over a
// vertical joint of the wall, which runs straight behind it. The camera is level and square to the
// wall and closes in slowly; the stone here bears no oath, only the line; its shadow lies true on the stone beside it.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { PLUMB_GLSL, PLUMB_UNIFORMS, PIV, LEN } from '/song/lib/x-plumb.js';

export const kind = 'shader';

export default (P) => {
  const W = Math.sqrt(9.81 / LEN);
  const swing = (t) => {
    const x = Math.max(0, t - P.from);
    const A = 0.03 * Math.exp(-x * 2.6) * (x < 2.5 ? 1 : 0);
    return { a: A * Math.sin(W * x + 1.2), z: 0.1 * A * Math.sin(W * x + 2.4) };
  };
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0015);
    return {
      pos: [0.0 + d[0] * 0.3, 0.4 + 0.06 * p + d[1] * 0.3, 1.3 - 0.16 * p],
      target: [0.0, 0.4 + 0.06 * p, 0.0], fov: 38, roll: 0.0,
    };
  };
  return {
    name: 's40-yes', from: P.from, to: P.to,
    frag: PLUMB_GLSL + 'vec3 shade(vec2 fc) { return plumb(fc); }',
    uniforms: { ...PLUMB_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const s = swing(t);
      u.uSwing.value = s.a; u.uSwingZ.value = s.z;
      u.uWarm.value = 1.0; u.uLetters.value = 0.0;   // the stone here is clean: no oath, only the true line
      u.uSpin.value = 0.3 * Math.exp(-Math.max(0, t - P.from) * 1.5) * Math.sin((t - P.from) * 2.0);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[1] - 0.5, PIV[2] - c.pos[2]);
      u.uAper.value = 0.0035;
    },
    post(t) { return grade(t, { exposure: 1.2, bloom: 0.07, threshold: 1.05, saturation: 1.02, vignette: 0.6, contrast: 1.03, lift: [0.006, 0.005, 0.004], grain: 0.014 }); },
    finish(t) { return { grade: { shadows: [0.03, 0.02, 0.01], highlights: [1.0, 0.94, 0.84], amount: 0.4 } }; },
  };
};
