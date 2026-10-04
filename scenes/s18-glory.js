// 18 · "And give your Father glory". Above the lamplit lanes of the town on the hill, the camera
// rises from the glowing doorways up into a vast field of stars; sparks and motes of light rise with
// it from the houses, and on "glory" a great soft gold light opens high in the sky.
import { grade, linesAt, wordIn, mix, clamp, ease } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'And give your Father');
  const tG = wordIn(L, 'glory').start;
  const cam = (t) => {
    const x = clamp((t - P.from) / (P.to - P.from), 0, 1);
    const p = 0.55 * x + 0.45 * ease.inOut3(x);
    const pitch = mix(-11, 44, p) * Math.PI / 180;
    const yaw = mix(-0.06, 0.05, x);
    const pos = [mix(-8, -4, x), mix(86, 132, p), mix(118, 94, x)];
    const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    return { pos, target: pos.map((v, i) => v + dir[i] * 50), fov: 46 };
  };
  return {
    name: 's18-glory', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS, uGloryCore: 0.35, uCloud: 0.65, uStars: 2.2, uMoonDir: [-0.72, 0.4, 0.56], uGloryDir: [0.22, 0.6, -0.77] },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uDay.value = 0.0; u.uLit.value = 1.0; u.uMist.value = 1.0;
      u.uSpark.value = clamp((t - P.from + 0.4) / 0.8, 0, 1);
      // the gold glory opens on its word and keeps gathering
      u.uGlory.value = 1.0 * ease.out3(clamp((t - tG + 0.15) / 1.6, 0, 1)) * (1 + 0.2 * clamp((t - tG) / 3, 0, 1));
      u.uFocus.value = 60; u.uAper.value = 0.0;
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.5, bloom: 0.3, threshold: 0.6, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.02, threshold: 1.6, tint: [1.0, 0.75, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.9, 0.76], amount: 0.4 } }; },
  };
};
