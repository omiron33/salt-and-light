// s16-stand: "Set it where the whole house can see".
// The same lamp now stands high on a tall bronze lampstand in the middle of the house. As the line is
// sung its light spreads out through the whole room: the rubble walls, the two stone arches, the
// beams, the tall water jars along the wall and the loaves on the table come up out of the dark in
// warm light, and the camera glides slowly across the room, the lamp always in view.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Set it where');
  const whole = wordIn(L, 'whole').start, see = wordIn(L, 'see').start;
  const STAND = [-1.1, 0, -0.9];
  const LAMP = [STAND[0], 1.366, STAND[2]], YAW = 0.6;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.006);
    // close on the flame at the top of the stand, then a slow pull back and down as its light
    // opens the room
    const q = ease.inOut3(clamp01((t - P.from - 0.3) / (P.to - P.from + 0.4)));
    return {
      pos: [-0.55 + 2.0 * q + d[0], 1.25 + 0.35 * q + d[1], -0.4 + 2.6 * q],
      target: [-1.17 - 0.35 * q, 1.5 - 0.6 * q, -1.07 - 0.4 * q],
      fov: 30 + 16 * q,
    };
  };
  return {
    name: 's16-stand', from: P.from, to: P.to,
    frag: houseFrag(['STAND', 'WINDOW']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: YAW, uStand: STAND, uAper: 0.004,
      uBok: [1.2, 1.3, -2.7, 0.5, 0.6, 0.3, -2.5, 0.7, 1.6, 0.25, -2.4, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - LAMP[0], c.pos[1] - LAMP[1], c.pos[2] - LAMP[2]);
      // the light spreading through the house, fullest on "whole house"
      const s = 0.6 + 0.4 * ease.inOut3(clamp01((t - P.from + 0.1) / (whole - P.from + 0.9)));
      u.uLampI.value = 0.9 + 0.4 * s;
      u.uBounce.value = 0.25 + 0.15 * s; u.uLampPow.value = 2.6;
      u.uExpo.value = 1.5 + 0.6 * s; u.uMoon.value = 0.25;
      u.uHaze.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.5, bloom: 0.09, threshold: 1.1, vignette: 0.45, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.012, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.008, 0.025], highlights: [1.0, 0.93, 0.82], amount: 0.4 } }; },
  };
};
