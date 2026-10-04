// 35 · "And give your Father glory" (the chorus rings out). From the flat roofs of the town, still
// lamplit in the deepest blue hour, the camera rises and tilts up over the houses into the sky; the
// morning star hangs low in the east and fades as a faint pale band grows along the far hills (no
// sunrise yet: that is saved for the end). On "glory" a soft gold light gathers high in the sky.
import { grade, linesAt, wordIn, mix, clamp, ease, drift } from '/song/lib/look.js';
import { CITY_GLSL, CITY_UNIFORMS } from '/song/lib/x-city.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'And give your Father');
  const tG = wordIn(L, 'glory').start;
  const cam = (t) => {
    const x = clamp((t - P.from) / (P.to - P.from), 0, 1);
    const p = 0.6 * x + 0.4 * ease.inOut3(x);
    const d = drift(t, 0.05);
    // over the western roofs, looking east across the town toward the sea and the far hills
    const pos = [mix(-110, -96, p) + d[0], mix(90, 116, p) + d[1], mix(34, 28, p)];
    const pitch = mix(-9, 4, p) * Math.PI / 180;
    const yaw = mix(-0.12, -0.05, x);
    const dir = [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)];
    return { pos, target: pos.map((v, i) => v + dir[i] * 200), fov: 44 };
  };
  return {
    name: 's35-glory2', from: P.from, to: P.to,
    frag: CITY_GLSL + `vec3 shade(vec2 fc) { return cityShade(fc); }`,
    uniforms: { ...CITY_UNIFORMS, uGloryDir: [0.95, 0.2, 0.0], uStarDir: [0.88, 0.2, 0.33], uGloryCore: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const x = clamp((t - P.from) / (P.to - P.from), 0, 1);
      // deep night blue to the deepest blue hour with a pale band low in the east
      u.uDay.value = mix(0.6, 1.2, x);
      u.uLit.value = mix(1.0, 0.85, x); u.uMist.value = 1.0;
      u.uStar.value = 1 - ease.inOut3(clamp((t - (tG - 1.0)) / 3.5, 0, 1)) * 0.92;
      u.uGlory.value = 1.4 * ease.out3(clamp((t - tG + 0.2) / 2.0, 0, 1));
      u.uFocus.value = 200; u.uAper.value = 0.0;
    },
    post(t) { return grade(t, { grain: 0.014, ca: 0.08, exposure: 1.5, bloom: 0.2, threshold: 0.8, vignette: 0.45 }); },
    finish(t) { return { flare: { amount: 0.06, threshold: 1.3, tint: [1.0, 0.8, 0.55], length: 0.25 }, grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.93, 0.84], amount: 0.35 } }; },
  };
};
