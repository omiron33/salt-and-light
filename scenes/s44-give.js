// s44-give: "Give to the one who asks / Do not turn away the one who needs to borrow".
// The grey-blue before dawn in the lane. Low by the step of the house, where a loaf and a few coins
// have been set down on the stone. On "Give" the plank door swings open outward and warm lamplight
// floods over the threshold and down the step, over the loaf and the coins. No one is seen: only the
// door standing open and the light given out. As the second line is sung the camera draws back into
// the street and the door's light spreads out over the cobbles into the blue.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

export default (P) => {
  const [L1] = linesAt(P.from - 0.6, 'Give to the one', 'Do not turn away');
  const give = wordIn(L1, 'Give').start, asks = wordIn(L1, 'asks').start;
  const STAND = [-0.3, 0, 2.42];
  const LAMP = [STAND[0], 1.366, STAND[2]];
  const open0 = give - 0.35, open1 = give + 1.3;
  const cam = (t) => {
    const d = drift(t, 0.003);
    const back = ease.inOut3(clamp01((t - (asks + 0.6)) / (P.to - asks - 0.6)));
    const p0 = ease.inOut3(clamp01((t - P.from) / (asks + 0.6 - P.from)));
    return {
      pos: [-1.3 - 0.12 * p0 - 0.7 * back + d[0], 0.3 + 0.03 * p0 + 0.6 * back + d[1], 4.85 + 0.12 * p0 + 1.4 * back],
      target: [-0.55 - 0.2 * back, 0.05 + 0.4 * back, 3.2 + 0.15 * back],
      fov: 40 + 6 * back,
    };
  };
  return {
    name: 's44-give', from: P.from, to: P.to,
    frag: houseFrag(['STAND', 'DOOR_LEAF', 'DOORSHAFT', 'GIVE']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: 1.0, uStand: STAND, uAper: 0.005 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = ease.inOut3(clamp01((t - open0) / (open1 - open0)));
      u.uDoor.value = -1.85 * k;
      // the fourth coin lies with the others on the step
      u.uCoin.value.set(0.16, -0.2342, 3.3); u.uCoinT.value = 0.0;
      u.uFocus.value = Math.hypot(c.pos[0] + 0.05, c.pos[1] + 0.2, c.pos[2] - 3.37);
      // the lamp inside; its light reaches out only as far as the door is open
      u.uLampI.value = 1.1; u.uLampPow.value = 32.0; u.uBounce.value = 0.5;
      u.uSky.value = 1.0; u.uMoon.value = 0.0; u.uAmb.value = 6.0;
      u.uHaze.value = 0.6; u.uExpo.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.01, ca: 0.03, exposure: 1.6, bloom: 0.09, threshold: 1.1, vignette: 0.42, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.04, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
