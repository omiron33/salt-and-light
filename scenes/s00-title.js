// s00-title: the instrumental opening. From the first frame the camera glides low over the black
// Sea of Galilee at night, stars trembling in the slow swell; ahead, on a basalt rock at the water's
// edge, a clay oil lamp, its wick already glowing like a coal. On the first hit the wick catches;
// on the first great beat the flame leaps up and warm light runs over the wet stones and onto the
// water. The Mount stands black against the stars. The camera keeps coming, then rises past the
// lamp into the dark above the hill.
import { grade, keys, ease, clamp01, drift } from '/song/lib/look.js';
import { LAMP_GLSL, LAMP_UNIFORMS, wickTip, flicker } from '/song/lib/x-galilee-lamp.js';

export const kind = 'shader';

const CATCH = 0.98, LEAP = 3.93;
const W = wickTip();
function flameK(t) {
  if (t < CATCH) return 0;
  const a = 0.38 * (1 - Math.exp(-(t - CATCH) * 14));
  if (t < LEAP - 0.05) return a * (0.85 + 0.15 * Math.sin((t - CATCH) * 9));
  const x = t - (LEAP - 0.05);
  const s = 1 - Math.exp(-x * 6) * Math.cos(x * 11) * 0.62;
  return a + (1.0 - a) * s;
}

export default (P) => {
  // the glide: in along a line toward the lamp (looking up the shore toward the Mount, the open lake
  // on the right), then up and over it
  const DIR = [-0.996, -0.087];   // horizontal view direction (x, z)
  const cam = (t) => {
    const d = drift(t, 0.005);
    const dist = keys(t, [[0, 0.5], [6.2, 1.45], [11.5, 0.7], [16.9, -0.15]], ease.inOut3);
    const h = keys(t, [[0, 0.37], [6.2, 0.42], [11.5, 0.43], [16.9, 2.3]], ease.inOut3);
    const side = keys(t, [[0, 0.03], [6.2, 0.12], [13.0, 0.06], [16.9, 0.0]], ease.inOut3);
    const pitch = keys(t, [[0, -0.02], [6.2, 0.035], [11.5, 0.03], [16.9, 0.16]], ease.inOut3);
    const right = [-DIR[1], DIR[0]];
    const px = W[0] - DIR[0] * dist + right[0] * side, pz = W[2] - DIR[1] * dist + right[1] * side;
    const bob = 0.01 * Math.sin(t * 0.9);
    const pos = [px + d[0], h + d[1] + bob, pz];
    const target = [px + DIR[0] * 30, h + 30 * pitch, pz + DIR[1] * 30];
    return { pos, target, fov: 30, roll: 0.01 * Math.sin(t * 0.37) };
  };
  return {
    name: 's00-title', from: P.from, to: P.to,
    frag: LAMP_GLSL + 'vec3 shade(vec2 fc) { return lampShot(fc); }',
    uniforms: { ...LAMP_UNIFORMS, uAper: 0.004, uSwell: 0.55, uMist: 0.35, uMoon: 0.2 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = flameK(t), fl = flicker(t);
      u.uFlameK.value = k * (0.92 + 0.08 * fl);
      u.uEmber.value = t < CATCH + 0.4 ? (0.75 + 0.25 * Math.sin(t * 9.0) * Math.sin(t * 2.3)) * clamp01((CATCH + 0.4 - t) / 0.4) : 0.0;
      u.uCatch.value = CATCH;
      const I = 0.12 * k * fl;
      u.uL1Col.value.set(1.0 * I, 0.56 * I, 0.24 * I);
      u.uL1Pos.value.set(W[0], W[1] + 0.02, W[2]);
      u.uFocus.value = Math.max(0.4, Math.hypot(c.pos[0] - W[0], c.pos[1] - W[1], c.pos[2] - W[2]));
      u.uAper.value = keys(t, [[0, 0.0012], [12, 0.0012], [16.9, 0.0006]]);
      u.uSwell.value = 0.55;
    },
    post(t) {
      const open = 0.55 + 0.45 * ease.out3(clamp01(t / 0.5));
      return grade(t, { exposure: 3.5 * open, bloom: 0.12, threshold: 0.9, vignette: 0.5, saturation: 1.02, contrast: 1.04, lift: [0.006, 0.007, 0.012] });
    },
    finish(t) { return { flare: { amount: 0.18, threshold: 0.85, tint: [1.0, 0.7, 0.45], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.92, 0.8], amount: 0.45 } }; },
  };
};
