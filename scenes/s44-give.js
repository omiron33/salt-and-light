// s44-give: "Give to the one who asks / Do not turn away the one who needs to borrow".
// The grey-blue before dawn in the lane. Low by the step of the house: the plank door swings open
// outward on "Give" and warm lamplight floods over the threshold and down the step, where a loaf and a
// few coins have been set down. The one who gives is never seen: only their shadow, thrown long across
// the step and the cobbles by the lamp inside. On "asks" one more coin drops from their hand, rings on
// the stone and settles. The door stays open, and as the second line is sung the camera draws back
// into the street and the door's light spreads out over the cobbles into the blue.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 0.6, 'Give to the one', 'Do not turn away');
  const give = wordIn(L1, 'Give').start, asks = wordIn(L1, 'asks').start;
  const STAND = [-0.32, 0, 2.15];
  const LAMP = [STAND[0], 1.366, STAND[2]];
  const open0 = give - 0.35, open1 = give + 1.3;
  const tDrop = asks - 0.3, G = 9.8, H0 = 1.1, Y1 = -0.236;
  const tLand = tDrop + Math.sqrt(2 * (H0 - Y1) / G);
  const coin = (t) => {
    const x0 = [0.15, H0, 3.3], x1 = [0.13, Y1 + 0.0018, 3.37];
    if (t < tDrop) return { p: [0, -50, 0], r: 0 };
    if (t < tLand) {
      const tt = t - tDrop, k = tt / (tLand - tDrop);
      return { p: [x0[0] + (x1[0] - x0[0]) * k, H0 - 0.5 * G * tt * tt, x0[2] + (x1[2] - x0[2]) * k], r: tt * 22 };
    }
    // a little bounce and a wobbling settle
    const tt = t - tLand;
    const hop = 0.02 * Math.max(0, Math.sin(tt * 18)) * Math.exp(-tt * 9);
    const wob = 0.5 * Math.exp(-tt * 4) * Math.sin(tt * 30 * (1 + tt));
    return { p: [x1[0], x1[1] + hop, x1[2]], r: wob };
  };
  const cam = (t) => {
    const d = drift(t, 0.004);
    const back = ease.inOut3(clamp01((t - (asks + 0.6)) / (P.to - asks - 0.6)));
    const p0 = ease.inOut3(clamp01((t - P.from) / (asks + 0.6 - P.from)));
    return {
      pos: [-1.3 - 0.12 * p0 - 0.7 * back + d[0], 0.3 + 0.03 * p0 + 0.6 * back + d[1], 4.85 + 0.12 * p0 + 1.4 * back],
      target: [0.0 + 0.05 * back, 0.05 + 0.4 * back, 3.2 + 0.15 * back],
      fov: 40 + 6 * back,
    };
  };
  return {
    name: 's44-give', from: P.from, to: P.to,
    frag: houseFrag(['STAND', 'DOOR_LEAF', 'DOORSHAFT', 'GHOSTS', 'GIVE']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: 1.0, uStand: STAND, uAper: 0.01 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = ease.inOut3(clamp01((t - open0) / (open1 - open0)));
      u.uDoor.value = -1.85 * k;
      // the giver stands on the threshold, looking down at the step; the right hand lets a coin fall
      u.uWalk.value.set(0.22, 2.62, 0.15);
      u.uWalkBob.value = 0.5 - 0.06 * ease.inOut3(clamp01((t - (tDrop - 0.8)) / 0.6));
      const reach = ease.inOut3(clamp01((t - (tDrop - 0.9)) / 0.8)) * (1 - ease.inOut3(clamp01((t - (tLand + 0.3)) / 0.9)));
      const rest = [0.12, 0.86, 2.82], out = [0.17, H0 + 0.03, 3.28];
      u.uHandR.value.set(...rest.map((v, i) => v + (out[i] - v) * reach));
      u.uHandL.value.set(0.55, 0.88, 2.75);
      u.uLoaf.value.set(0, -50, 0);
      const cn = coin(t);
      u.uCoin.value.set(...cn.p); u.uCoinT.value = cn.r;
      u.uFocus.value = Math.hypot(c.pos[0] + 0.0, c.pos[1] + 0.2, c.pos[2] - 3.37);
      // the lamp inside; its light reaches out only as far as the door is open
      u.uLampI.value = 1.1; u.uLampPow.value = 32.0; u.uBounce.value = 0.5;
      u.uSky.value = 1.0; u.uMoon.value = 0.0; u.uAmb.value = 4.2;
      u.uHaze.value = 0.6; u.uExpo.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.6, bloom: 0.09, threshold: 1.1, vignette: 0.45, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.04, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
