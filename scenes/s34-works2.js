// s34-works2: "Let your good works shine before others" (second chorus, dawn).
// The lane at first light, the sky over the roofs turning rose. On the step of a dark doorway across
// the lane stands an unlit lamp. A lit lamp comes to it, carried low in a cupped hand (only the hand
// and sleeve at the frame's edge; the person is never seen, only their long shadow, thrown up the
// walls by the lamp still burning in the open door behind). The carried flame dips to the wick and
// on "shine" the new lamp catches. Then the hand carries the light on, across the lane to the next
// door, and as the camera rises and draws back the lamps are lit one after another down the lane.
import { grade, ease, drift, linesAt, wordIn, clamp01, keys } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS, LANE_LAMPS, N_LANE, flameRoot } from '/song/lib/x-house.js';

export const kind = 'shader';

const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Let your good works');
  const shine = wordIn(L, 'shine').start, others = wordIn(L, 'others').start;
  const ign = new Array(12).fill(1e4);
  ign[0] = P.from - 30;
  ign[1] = shine + 0.03;
  const t2 = others + 0.05;
  ign[2] = t2;
  for (let i = 3; i < N_LANE; i++) ign[i] = t2 + 0.4 + 0.3 * (i - 3);
  const root = (i) => flameRoot(LANE_LAMPS[i].slice(0, 3), LANE_LAMPS[i][3]);
  const R1 = root(1), R2 = root(2);
  // the carried lamp's base: comes in from the open door's side, lowers to the wick, lifts and goes on
  const carry = (t) => {
    const a = [-2.3, 0.1, 7.1];
    const at1 = [R1[0] + 0.09, R1[1] + 0.012, R1[2] - 0.05];            // nozzle tip over the wick
    const up1 = [R1[0] + 0.2, 0.2, R1[2] - 0.5];
    const at2 = [R2[0] - 0.09, R2[1] + 0.012, R2[2] + 0.05];
    const k0 = ease.inOut3(clamp01((t - P.from) / (shine - 0.15 - P.from)));
    if (t < shine + 0.35) return lerp(a, at1, k0);
    const k1 = clamp01((t - (shine + 0.35)) / (t2 - 0.1 - (shine + 0.35)));
    const e = ease.inOut3(k1);
    const mid = lerp(up1, [R2[0] + 0.4, 0.25, R2[2] + 1.2], e);
    const p = k1 < 0.25 ? lerp(at1, up1, ease.inOut3(k1 / 0.25)) : k1 > 0.8 ? lerp(mid, at2, ease.inOut3((k1 - 0.8) / 0.2)) : mid;
    if (t < t2 + 0.3) return p;
    // then on, away down the lane
    const k2 = clamp01((t - (t2 + 0.3)) / 2.5);
    return lerp(at2, [-13.0, 0.3, 5.3], ease.in2(k2) * 0.7 + 0.3 * k2);
  };
  const cam = (t) => {
    const d = drift(t, 0.003);
    const k = ease.inOut3(clamp01((t - (shine + 0.5)) / (P.to - shine - 0.4)));
    const near = { pos: [-2.75, 0.2, 5.75], target: [-3.3, -0.12, 7.45] };
    const far = { pos: [0.6, 1.45, 4.8], target: [-8.0, 0.1, 5.6] };
    const p0 = ease.inOut3(clamp01((t - P.from) / (shine - P.from)));
    const pos = lerp(lerp(near.pos, [-2.85, 0.16, 5.95], p0), far.pos, k);
    const target = lerp(near.target, far.target, k);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov: 40 + 4 * k };
  };
  return {
    name: 's34-works2', from: P.from, to: P.to,
    frag: houseFrag(['LANE', 'GHOSTS', 'DOOR_LEAF']),
    uniforms: { ...HOUSE_UNIFORMS, uLampI: 0.0, uAper: 0.004, uSky: 2.0, uIgn: ign, uDoor: 1.95 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const cb = carry(t);
      u.uCarry.value.set(...cb);
      u.uCarryK.value = 1.0;
      // the hand under the lamp, the elbow up and back toward the body
      const body = [cb[0] + 0.75, -0.5, cb[2] - 1.0];
      u.uHandR.value.set(cb[0] + 0.005, cb[1] - 0.006, cb[2]);
      u.uHandL.value.set(cb[0] + 0.55, cb[1] + 0.05, cb[2] - 0.75);
      // the person: invisible, only their shadow, standing behind the hand
      const yaw = Math.atan2(cb[0] - body[0], cb[2] - body[2]);
      u.uWalk.value.set(body[0], body[2], yaw);
      u.uWalkBob.value = 0.0;
      u.uLoaf.value.set(0, -50, 0);
      u.uHandR.value.y = cb[1] - 0.006;
      // focus: the lamps at the step, then far down the lane
      const k = ease.inOut3(clamp01((t - (shine + 0.5)) / (P.to - shine - 0.4)));
      const dNear = Math.hypot(c.pos[0] - R1[0], c.pos[1] - R1[1], c.pos[2] - R1[2]);
      u.uFocus.value = dNear * (1 - k) + 6.0 * k;
      u.uAper.value = 0.004 * (1 - k) + 0.012 * k;
      u.uMoon.value = 0.0; u.uSky.value = 1.55;
      u.uExpo.value = 1.0 - 0.2 * k;
      u.uHaze.value = 0.6; u.uLanePow.value = 2.5 + 5.5 * k; u.uFog.value = 0.03; u.uAmb.value = 1.6 - 0.7 * k;
      u.uHandK.value = k < 0.25 ? 1 : 0;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.6, bloom: 0.09, threshold: 1.1, vignette: 0.45, saturation: 1.02 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.3 }, grade: { shadows: [0.01, 0.01, 0.03], highlights: [1.0, 0.92, 0.82], amount: 0.4 } }; },
  };
};
