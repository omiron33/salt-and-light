// s17-door: "Let your good works shine before others".
// Night. We stand in the open doorway of the lit house and push out over the threshold. The lamp on
// its stand behind us throws a long tilted rectangle of warm light down the step, across the cobbles
// and up the far wall. Into that light walks a shadow (no figure is ever seen, only its shadow): a
// person carrying a loaf out of our door and across the lane, the shadow huge on the far wall at
// first and shrinking as it nears it. By the neighbour's dark door the shadow turns and holds the loaf
// out; a second shadow hand reaches from the door, the two hands meet and the loaf passes from one to
// the other on the lit wall. Then the neighbour's door swings open and their own lamp comes alight:
// the good work shining, and answered.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Let your good works');
  const good = wordIn(L, 'good').start, shine = wordIn(L, 'shine').start;
  const before = wordIn(L, 'before').start, others = wordIn(L, 'others').start;
  const STAND = [-0.25, 0, 0.8];
  const LAMP = [STAND[0], 1.366, STAND[2]];
  const Y0 = -0.5;   // street level
  // the walk: out of our door, across the lane to stand by the neighbour's door (x 0.95)
  const tArrive = shine + 0.15, tGive0 = before - 0.05, tGive1 = before + 0.55, tBack = others + 0.1;
  const walk = (t) => {
    const k = ease.inOut3(clamp01((t - (P.from - 0.15)) / (tArrive - P.from + 0.15)));
    const kk = 0.15 * k + 0.85 * clamp01((t - (P.from - 0.15)) / (tArrive - P.from + 0.15));   // near-steady pace
    const x = -0.05 - 0.4 * kk, z = 3.55 + 3.4 * kk;
    // after giving, step back and away to the left, out of the light
    const b = ease.inOut3(clamp01((t - tBack) / 1.6));
    return [x - 1.3 * b, z - 0.8 * b, kk, b];
  };
  const sh = (t) => {
    const [x, z, kk, b] = walk(t);
    const moving = (kk > 0 && kk < 1) || (b > 0 && b < 1);
    const phase = t * 2 * Math.PI * 1.7;
    const bob = moving ? 0.025 * Math.abs(Math.sin(phase)) : 0.004 * Math.sin(t * 2.0);
    const yaw = b > 0 ? -2.2 * b : -0.12;
    // hands: carrying the loaf before the chest; then the right arm reaches out to the side
    const fw = [Math.sin(yaw), Math.cos(yaw)], rt = [fw[1], -fw[0]];
    const sway = moving ? 0.02 * Math.sin(phase) : 0;
    const carryR = [x + rt[0] * 0.12 + fw[0] * 0.34, Y0 + 1.08 + bob + sway, z + rt[1] * 0.12 + fw[1] * 0.34];
    const carryL = [x - rt[0] * 0.12 + fw[0] * 0.34, Y0 + 1.08 + bob - sway, z - rt[1] * 0.12 + fw[1] * 0.34];
    const reachR = [x + 0.5, Y0 + 1.3, z + 0.38];
    const restL = [x - rt[0] * 0.22 + fw[0] * 0.05, Y0 + 0.78, z - rt[1] * 0.22 + fw[1] * 0.05];
    const restR = [x + rt[0] * 0.22 + fw[0] * 0.05, Y0 + 0.78, z + rt[1] * 0.22 + fw[1] * 0.05];
    const out = ease.inOut3(clamp01((t - (tArrive - 0.1)) / (tGive0 - tArrive + 0.1)));
    const down = ease.inOut3(clamp01((t - tGive1) / 0.6));
    const hR = lerp(lerp(carryR, reachR, out), restR, down);
    const hL = lerp(lerp(carryL, [x - 0.05, Y0 + 1.0, z + 0.25], out), restL, down);
    // the neighbour's hand: out of the doorway to meet the loaf, then back in with it
    const nIn = [0.62, Y0 + 1.25, 7.62], nMeet = [reachR[0] + 0.26, reachR[1] + 0.04, reachR[2] + 0.02];
    const nOut = ease.inOut3(clamp01((t - (tGive0 - 0.25)) / 0.5));
    const nBack = ease.inOut3(clamp01((t - (tGive1 - 0.05)) / 0.6));
    const nh = lerp(lerp(nIn, nMeet, nOut), [0.75, Y0 + 1.2, 8.0], nBack);
    const nVis = t > tGive0 - 0.3 && t < tGive1 + 0.65;
    // the loaf: in both hands, then in the right hand held out, then passed, then gone inside
    const pass = ease.inOut3(clamp01((t - (tGive0 + 0.12)) / (tGive1 - tGive0 - 0.1)));
    let loaf = lerp(lerp(lerp(carryR, carryL, 0.5), [reachR[0] + 0.1, reachR[1] + 0.06, reachR[2] + 0.01], out), [nh[0] - 0.06, nh[1] + 0.06, nh[2]], pass);
    if (t > tGive1 + 0.6) loaf = [0, -50, 0];
    return { x, z, yaw, bob, hR, hL, nh: nVis ? nh : [0, -50, 0], loaf };
  };
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.004);
    return {
      pos: [-1.55 + 0.25 * p + d[0], 1.75 - 0.2 * p + d[1], 3.55 + 1.75 * p],
      target: [0.35 + 0.1 * p, 0.6 + 0.05 * p, 7.3],
      fov: 46,
    };
  };
  return {
    name: 's17-door', from: P.from, to: P.to,
    frag: houseFrag(['STAND', 'DOOR_LEAF', 'DOORSHAFT', 'GHOSTS', 'NEIGHBOR']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: 1.2, uStand: STAND, uAper: 0.012, uDoor: 1.95 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const g = sh(t);
      u.uFocus.value = Math.hypot(c.pos[0] - 0.3, c.pos[1] - 0.8, c.pos[2] - 7.5);
      u.uWalk.value.set(g.x, g.z, g.yaw);
      u.uWalkBob.value = g.bob;
      u.uHandR.value.set(...g.hR); u.uHandL.value.set(...g.hL);
      u.uLoaf.value.set(...g.loaf); u.uNHand.value.set(...g.nh);
      u.uLampI.value = 1.1; u.uLampPow.value = 120.0; u.uBounce.value = 0.5;
      u.uMoon.value = 0.55; u.uSky.value = 0.0; u.uHaze.value = 0.5;
      // the neighbour's door: ajar for the hand, then swung wide as their lamp is lit
      u.uNDoor.value = keys(t, [[tGive0 - 0.45, 0], [tGive0 - 0.1, 0.32], [tGive1 + 0.5, 0.32], [tGive1 + 1.3, 1.45]]);
      u.uNLamp.value = keys(t, [[tGive1 + 0.55, 0], [tGive1 + 0.75, 1.25], [tGive1 + 1.4, 1.0]]);
      u.uNPow.value = 45.0;
      u.uExpo.value = 1.0;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.6, bloom: 0.09, threshold: 1.1, vignette: 0.48, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.04, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.012, 0.035], highlights: [1.0, 0.93, 0.82], amount: 0.45 } }; },
  };
};
