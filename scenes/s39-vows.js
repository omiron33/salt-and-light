// s39-vows: "You heard the command against false vows".
// A wall of dressed limestone in cold, raking night light; on a block to the left a few Hebrew
// letters are cut (שבע, the root of "to swear"). Before it a plumb line hangs from out of frame and
// swings, its bob and its shadow crossing the stone; the camera, a touch off level so nothing is
// quite true yet, drifts slowly while the swing begins to slow.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { PLUMB_GLSL, PLUMB_UNIFORMS, PIV, LEN } from '/song/lib/x-plumb.js';

export const kind = 'shader';

export default (P) => {
  const W = Math.sqrt(9.81 / LEN);
  const swing = (t) => {
    const x = t - P.from;
    const A = 0.1 * Math.exp(-x * 0.2);
    return { a: A * Math.sin(W * x + 0.6), z: 0.18 * A * Math.sin(W * x + 2.0) };
  };
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.004);
    return {
      pos: [0.42 - 0.12 * p + d[0], 0.62 + 0.04 * p + d[1], 1.55 - 0.15 * p],
      target: [-0.16 + 0.04 * p, 0.5 + 0.02 * p, 0.0], fov: 40, roll: 0.035 - 0.01 * p,
    };
  };
  return {
    name: 's39-vows', from: P.from, to: P.to,
    frag: PLUMB_GLSL + 'vec3 shade(vec2 fc) { return plumb(fc); }',
    uniforms: { ...PLUMB_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const s = swing(t);
      u.uSwing.value = s.a; u.uSwingZ.value = s.z; u.uWarm.value = 0.0;
      u.uSpin.value = 0.4 * Math.sin(t * 0.7);
      const bob = [PIV[0] + Math.sin(s.a) * LEN, PIV[1] - LEN + 0.08, PIV[2]];
      u.uFocus.value = Math.hypot(bob[0] - c.pos[0], bob[1] - c.pos[1], bob[2] - c.pos[2]);
      u.uAper.value = 0.004;
    },
    post(t) { return grade(t, { exposure: 1.55, bloom: 0.06, threshold: 1.1, saturation: 0.9, vignette: 0.5, contrast: 1.04, lift: [0.004, 0.005, 0.008], grain: 0.014 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.02, 0.05], highlights: [0.92, 0.96, 1.0], amount: 0.45 } }; },
  };
};
