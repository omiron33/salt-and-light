// s52-end: the end title over the dawn sea. The reverse of the opening: from the shore side we look
// east across the Sea of Galilee as the sun clears the far escarpment; the water is rose and gold,
// a path of glitter runs to us, mist lifts off the lake. In the foreground the same clay lamp burns
// on its basalt rock in the daylight, small and steady. The camera drifts slowly in and down toward
// the lamp; at the end of the music everything fades to black.
import { grade, keys, ease, clamp01, drift } from '/song/lib/look.js';
import { LAMP_GLSL, LAMP_UNIFORMS, wickTip, flicker } from '/song/lib/x-galilee-lamp.js';

export const kind = 'shader';
const W = wickTip();
const END = 306.8;

export default (P) => {
  const DIR = [0.17, -0.985];      // looking east, a little north of the sun
  const cam = (t) => {
    const p = clamp01((t - P.from) / (END - P.from));
    const e = ease.inOut3(p);
    const d = drift(t, 0.004);
    const dist = 1.6 - 0.6 * e, h = 0.58 - 0.1 * e;
    const right = [-DIR[1], DIR[0]];
    const side = -0.18 + 0.1 * e;
    const px = W[0] - DIR[0] * dist + right[0] * side, pz = W[2] - DIR[1] * dist + right[1] * side;
    const pitch = -0.03 - 0.012 * e;
    return { pos: [px + d[0], h + d[1], pz], target: [px + DIR[0] * 30, h + 30 * pitch, pz + DIR[1] * 30], fov: 34 };
  };
  return {
    name: 's52-end', from: P.from, to: P.to,
    frag: LAMP_GLSL + 'vec3 shade(vec2 fc) { return lampShot(fc); }',
    uniforms: { ...LAMP_UNIFORMS, uAper: 0.0018, uSwell: 0.4, uMist: 0.5, uDawn: 1.0, uDay: 0.75, uDaySun: 1.0, uMoon: 0.0, uStars: 0.0,
      uSunDir: [-0.42, 0.045, -0.906] },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const fl = flicker(t);
      u.uFlameK.value = 0.9 * (0.94 + 0.06 * fl);
      u.uEmber.value = 0;
      u.uCatch.value = -1e4;
      const I = 0.1 * fl;
      u.uL1Col.value.set(1.0 * I, 0.56 * I, 0.24 * I);
      u.uL1Pos.value.set(W[0], W[1] + 0.02, W[2]);
      u.uFocus.value = Math.hypot(c.pos[0] - W[0], c.pos[1] - W[1], c.pos[2] - W[2]);
      // the sun climbs a little through the shot
      const k = clamp01((t - P.from) / (END - P.from));
      const el = 0.035 + 0.025 * k;
      u.uSunDir.value.set(-0.42, el, -0.906);
      u.uDay.value = 0.7 + 0.15 * k;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.12, threshold: 0.95, vignette: 0.5, saturation: 1.05, contrast: 1.04 }); },
    finish(t) {
      const fade = ease.inOut3(clamp01((t - 304.4) / (306.5 - 304.4)));
      return { flare: { amount: 0.12, threshold: 0.9, tint: [1.0, 0.75, 0.5], length: 0.3 }, grade: { shadows: [0.01, 0.015, 0.035], highlights: [1.0, 0.92, 0.8], amount: 0.35 }, fade };
    },
  };
};
