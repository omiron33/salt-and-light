// 33 · "Set it where the whole house can see" (second chorus). From the yard outside, in the blue
// hour: one stone house of two storeys whose windows light one after another, room after room, each
// with its lamp on the sill, until the door opens its light onto the yard and the whole house glows.
// The camera draws slowly back from it.
import { grade, linesAt, wordIn, mix, clamp, ease, drift } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS, HERO_POS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

// the yard's level (the terrace the house stands on), as the world computes it
const hill = (x, z) => 88 * Math.exp(-Math.pow(Math.hypot(x, z * 1.12) / 158, 2)) + 16 * Math.exp(-Math.pow(Math.hypot(x + 240, z + 170) / 150, 2));
const terrace = (h) => { const S = 3.4, k = h / S, f = k - Math.floor(k); const s = Math.min(1, Math.max(0, (f - 0.62) / 0.35)); return S * (Math.floor(k) + s * s * (3 - 2 * s)); };

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Set it where');
  const at = (w) => wordIn(L, w).start;
  // the order the rooms are lit: ground left, upper left, upper middle, ground right, upper right,
  // the west side, and on "house" the door; [uniform slot, time]
  const order = [
    [0, at('Set')], [2, at('it') + 0.05], [3, at('where')], [1, at('the') + 0.1],
    [4, at('whole')], [6, at('whole') + 0.3], [5, at('house') - 0.15], [7, at('house')],
  ];
  const [hx, , hz] = HERO_POS;
  const base = terrace(hill(hx, hz));
  const cam = (t) => {
    const x = clamp((t - P.from) / (P.to - P.from), 0, 1);
    const p = 0.7 * x + 0.3 * ease.inOut3(x);
    const d = drift(t, 0.02);
    const pos = [hx + 1.0 + d[0], base + mix(2.0, 3.0, p) + d[1], hz + mix(17.5, 24.5, p)];
    const target = [hx - 0.2, base + 3.4, hz + 3.5];
    return { pos, target, fov: 40 };
  };
  return {
    name: 's33-house2', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS, uHero: 1, uMoonDir: [-0.45, 0.4, 0.8], uGloryCore: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uDay.value = 1.3; u.uLit.value = 0.4; u.uMist.value = 0.6; u.uHero.value = 1;
      const k = [0, 0, 0, 0, 0, 0, 0, 0];
      for (const [i, t0] of order) {
        // a wick catches: a quick flare that settles to a steady lamp
        const a = clamp((t - t0 + 0.04) / 0.35, 0, 1);
        k[i] = ease.out3(a) * (1 + 0.35 * Math.exp(-Math.max(0, t - t0 - 0.12) * 6) * (a > 0 ? 1 : 0));
      }
      // on "see" the whole house glows: every lamp brighter, and one lit on the roof
      const g = ease.out3(clamp((t - at('see') + 0.1) / 0.6, 0, 1));
      for (let i = 0; i < 8; i++) k[i] *= 1 + 0.25 * g;
      u.uGlory.value = g;
      u.uHL0.value.set(k[0], k[1], k[2]); u.uHL0w.value = k[3];
      u.uHL1.value.set(k[4], k[5], k[6]); u.uHL1w.value = k[7];
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - hx, c.pos[2] - (hz + 3.5)); u.uAper.value = 0.025;
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.5, bloom: 0.28, threshold: 0.6, vignette: 0.6, contrast: 1.08 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 1.4, tint: [1.0, 0.7, 0.4], length: 0.2 }, grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.9, 0.78], amount: 0.4 } }; },
  };
};
