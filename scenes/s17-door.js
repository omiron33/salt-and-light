// s17-door: "Let your good works shine before others".
// Night. We stand in the open doorway of our lit house; the lamp on its stand behind us throws a long
// warm rectangle of light over the threshold and across the cobbles. The camera eases out over the
// threshold and lifts along that light to the far side of the lane, and there, on the dark
// neighbour's doorstep, it finds what was left in the night: a loaf wrapped in linen and a small clay
// lamp left burning beside it. No one is seen. On "others" the neighbour's door swings open from
// within and the warm light of their room spills out over the gift.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Let your good works');
  const shine = wordIn(L, 'shine').start, others = wordIn(L, 'others').start;
  const STAND = [-0.25, 0, 0.8];
  const LAMP = [STAND[0], 1.366, STAND[2]];
  const GIFT = [0.88, -0.28, 7.42];
  const cam = (t) => {
    // out over the threshold, the gaze rising along the light to the neighbour's step by "shine"
    const p = ease.inOut3(clamp01((t - P.from) / (shine + 0.3 - P.from)));
    const q = ease.inOut3(clamp01((t - (shine + 0.3)) / (P.to - shine - 0.3)));
    const d = drift(t, 0.003);
    const pos0 = [0.0, 1.1, 2.6], pos1 = [0.05, 0.6, 4.6], pos2 = [0.3, 0.3, 5.45];
    const tg0 = [0.45, -0.25, 6.6], tg1 = [0.88, -0.15, 7.45], tg2 = [0.9, 0.0, 7.6];
    const pos = lerp(lerp(pos0, pos1, p), pos2, q);
    const target = lerp(lerp(tg0, tg1, p), tg2, q);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov: 50 - 8 * p };
  };
  return {
    name: 's17-door', from: P.from, to: P.to,
    frag: houseFrag(['STAND', 'DOOR_LEAF', 'DOORSHAFT', 'NEIGHBOR']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: 1.2, uStand: STAND, uAper: 0.004, uDoor: 1.95 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - GIFT[0], c.pos[1] - GIFT[1], c.pos[2] - GIFT[2]);
      u.uLampI.value = 1.1; u.uLampPow.value = 70.0; u.uBounce.value = 0.5;
      u.uMoon.value = 0.55; u.uSky.value = 0.0; u.uHaze.value = 0.5;
      u.uGiftK.value = 1.0;
      // the neighbour's door: shut while their lamp is lit within, then opened wide from inside
      u.uNLamp.value = keys(t, [[others - 0.6, 0], [others - 0.3, 1.0]]);
      u.uNDoor.value = keys(t, [[others - 0.1, 0], [others + 0.2, 0.15], [others + 1.3, 1.4]]);
      u.uNPow.value = 40.0;
      u.uExpo.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.01, ca: 0.03, exposure: 1.6, bloom: 0.08, threshold: 1.1, vignette: 0.45, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.04, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.012, 0.035], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
