// 50 · "If you love only those who love you" / "What reward is there?". Dawn, rose-gold low in the
// east, the town still dark and cool. Close on one small deep-set window in rough stone, a clay lamp
// burning on its sill and its light warm on the stone; the camera draws slowly back to show the house
// on the edge of the town with only a very few other windows lit, and all but stops on the question,
// the lit window still a clear subject on the left third of the frame.
import { linesAt, wordIn, mix, clamp, drift, grade } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS, HERO_POS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

const hill = (x, z) => 88 * Math.exp(-Math.pow(Math.hypot(x, z * 1.12) / 158, 2)) + 16 * Math.exp(-Math.pow(Math.hypot(x + 240, z + 170) / 150, 2));
const terrace = (h) => { const S = 3.4, k = h / S, f = k - Math.floor(k); const s = Math.min(1, Math.max(0, (f - 0.74) / 0.23)); return S * (Math.floor(k) + s * s * (3 - 2 * s)); };

export default (P) => {
  const [, L2] = linesAt(P.from - 0.6, 'If you love only', 'What reward');
  const tQ = wordIn(L2, 'What').start;
  const [hx, , hz] = HERO_POS;
  const base = terrace(hill(hx, hz));
  const W = [hx - 5.0, base + 1.42, hz + 0.6];   // the west window's sill lamp
  const cam = (t) => {
    // a slow pull-back that eases almost to rest on "What reward is there?", then only breathes
    const x = clamp((t - P.from) / (tQ + 0.6 - P.from), 0, 1);
    const p = 1 - Math.pow(1 - x, 2.6);
    const tail = Math.max(0, t - (tQ + 0.6)) * 0.012;
    const k = p + tail;
    const d = drift(t, 0.006 + 0.02 * k);
    const pos = [W[0] - mix(0.95, 10.0, k) + d[0], W[1] + mix(0.12, 0.5, k) + d[1], W[2] + mix(0.05, 2.0, k) + d[2]];
    const target = [W[0] + mix(0.2, 6.0, k), W[1] + mix(0.0, 1.6, k), W[2] + mix(0.0, 2.6, k)];
    return { pos, target, fov: mix(34, 40, k) };
  };
  return {
    name: 's50-reward', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS, uHero: 1, uSill: 1, uLitFrac: 0.45, uMoonDir: [-0.6, 0.35, 0.7], uGloryCore: 0, uMistTop: 22, uEdge: 1 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uDay.value = 2.0; u.uLit.value = 0.7; u.uHero.value = 1; u.uSill.value = 1; u.uMist.value = 0.7;
      // only the sill lamp burns in this house
      u.uHL0.value.set(0, 0.0, 0); u.uHL0w.value = 0; u.uHL1.value.set(0, 0, 0); u.uHL1w.value = 0;
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - W[0], c.pos[1] - W[1], c.pos[2] - W[2]);
      u.uAper.value = 0.002 + 0.004 * clamp(1 - (t - P.from) / 3, 0, 1);
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.5, bloom: 0.26, threshold: 0.6, vignette: 0.5, contrast: 1.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.9, 0.8], amount: 0.35 } }; },
  };
};
