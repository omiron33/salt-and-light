// s19-night-sea: the instrumental interlude. One slow glide low over the Sea of Galilee at night: a
// small fishing boat rests on still water far out, a lantern hung at its prow; its light trembles in
// the water below it. Stars overhead, mist drifting on the lake, and along the eastern hills the
// first deep blue of the coming dawn. The camera drifts past the boat toward the far shore.
import { grade, keys, ease, clamp01, drift } from '/song/lib/look.js';
import { BOAT_GLSL, BOAT_UNIFORMS, lanternPos, boatBob } from '/song/lib/x-galilee-boat.js';
import { flicker } from '/song/lib/x-galilee-lamp.js';

export const kind = 'shader';

export default (P) => {
  const D = P.to - P.from;
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const e = ease.inOut3(k);
    const d = drift(t, 0.012);
    const pos = [-6.5 + 10.0 * k + d[0], 1.25 - 0.3 * e + d[1] + 0.03 * Math.sin(t * 0.6), -49.0 - 5.0 * k];
    const L = lanternPos(t);
    // look at the boat, and let the eye travel on past it to the eastern hills
    const far = [pos[0] + 25, 2.6, pos[2] - 120];
    const w = 0.3 * ease.inOut3(clamp01((k - 0.35) / 0.65));
    const target = [L[0] + (far[0] - L[0]) * w, L[1] - 0.6 + (far[1] - L[1] + 0.6) * w, L[2] + (far[2] - L[2]) * w];
    return { pos, target, fov: 36, roll: 0.008 * Math.sin(t * 0.4) };
  };
  return {
    name: 's19-night-sea', from: P.from, to: P.to,
    frag: BOAT_GLSL + 'vec3 shade(vec2 fc) { return boatShot(fc); }',
    uniforms: { ...BOAT_UNIFORMS, uAper: 0.012, uSwell: 0.22, uMist: 1.6, uMoon: 0.0, uDawn: 0.15 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const L = lanternPos(t);
      const fl = flicker(t * 0.8 + 3.0);
      const I = 4.0 * fl;
      u.uL1Col.value.set(1.0 * I, 0.58 * I, 0.26 * I);
      u.uL1Pos.value.set(...L);
      u.uLantCol.value.set(1.0 * I, 0.58 * I, 0.26 * I);
      u.uLant.value.set(...L);
      u.uBob.value = boatBob(t);
      u.uRoll.value = 0.015 * Math.sin(t * 0.55 + 0.7);
      u.uFocus.value = Math.hypot(c.pos[0] - L[0], c.pos[1] - L[1], c.pos[2] - L[2]);
      u.uDawn.value = keys(t, [[P.from, 0.15], [P.to, 0.6]], (x) => x);
    },
    post(t) { return grade(t, { exposure: 3.4, bloom: 0.12, threshold: 0.9, vignette: 0.5, saturation: 1.02, contrast: 1.04, lift: [0.006, 0.007, 0.012] }); },
    finish(t) { return { flare: { amount: 0.06, threshold: 0.85, tint: [1.0, 0.7, 0.45], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.92, 0.8], amount: 0.45 } }; },
  };
};
