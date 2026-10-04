// s32-lamp2: "No one lights a lamp to cover it" (second chorus, the blue hour before dawn).
// The back wall of the house in the last of the night: cold grey-blue from the high window. In a small
// arched niche a lamp burns behind a hanging linen cloth, which glows warm where the flame stands
// behind it. On "cover it" the cloth slides away to the side and the light spills out of the niche
// across the plastered wall, the floor and the jars, the warm pushing back the blue.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'No one lights a lamp');
  const lamp = wordIn(L, 'lamp').start, cover = wordIn(L, 'cover').start;
  const LAMP = [1.15, 1.1, -2.9], YAW = -0.5;
  const s0 = cover - 0.2, s1 = cover + 0.9;
  const slide = (t) => ease.inOut3(clamp01((t - s0) / (s1 - s0)));
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const k = slide(t);
    const d = drift(t, 0.004);
    // close on the covered niche, a little from the side; as the cloth goes, a slow pull back and
    // round so the spilled light opens up the wall and floor
    const q = ease.inOut3(clamp01((t - s0 + 0.2) / (P.to - s0 + 0.4)));
    return {
      pos: [0.74 - 0.1 * q + d[0], 1.28 + 0.02 * q + d[1], -2.06 + 0.08 * q - 0.03 * p],
      target: [1.17 - 0.06 * q, 1.17 - 0.04 * q, -2.88],
      fov: 34 + 4 * q,
    };
  };
  return {
    name: 's32-lamp2', from: P.from, to: P.to,
    frag: houseFrag(['NICHE', 'WINDOW']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: YAW, uAper: 0.003, uSky: 1.0 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = slide(t);
      u.uFocus.value = Math.hypot(c.pos[0] - LAMP[0], c.pos[1] - LAMP[1] - 0.06, c.pos[2] - LAMP[2]);
      u.uCloth.value = k;
      u.uLampI.value = 1.0 + 0.15 * ease.out3(clamp01((t - s1 + 0.3) / 1.0));
      u.uBounce.value = 0.06 + 0.5 * k;
      u.uSky.value = 1.0; u.uMoon.value = 0.0; u.uWin.value = 1.5 - 0.6 * k;
      u.uExpo.value = 1.7;
      u.uHaze.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.5, bloom: 0.09, threshold: 1.1, vignette: 0.48, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.012, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
