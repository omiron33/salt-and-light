// s23-murder: "You heard the command against murder". The cut lands on the same shape: the small mark
// of the scroll, now cut into a rough stone. The camera pulls back and up off it to reveal a dark
// stone field at dusk under a cold sky, the one stone lying in the last cold light with a long dark
// stain of its shadow beside it.
import * as THREE from 'three';
import { grade, ease, clamp01, drift, mix } from '/song/lib/look.js';
import { yodCanvas } from '/song/lib/x-scroll-text.js';
import { STONE_GLSL, STONE_UNIFORMS, CARVE } from '/song/lib/x-scroll-stone.js';

export const kind = 'shader';

export default async (P) => {
  const { canvas } = await yodCanvas(512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  const C = CARVE.c;
  const dur = P.to - P.from;
  const cam = (t) => {
    // hold on the mark a breath, then pull back and up, easing out into the wide
    const x = clamp01((t - P.from - 0.25) / (dur - 0.25));
    const p = 1 - Math.pow(1 - x, 2.6);
    const d = drift(t, 0.002 + 0.01 * p);
    const dist = 0.2 * Math.pow(2.1 / 0.2, p);          // 0.2 m to 2.1 m, at a steady zoom-like rate
    const el = mix(0.47, 0.12, p), az = mix(0.0, 0.35, p);
    const pos = [C[0] + Math.sin(az) * Math.cos(el) * dist + d[0], C[1] + Math.sin(el) * dist + d[1], C[2] - Math.cos(az) * Math.cos(el) * dist];
    const target = [C[0] + 0.03 * (1 - p) + 0.1 * p, C[1] + 0.03 * (1 - p) - 0.02 * p, C[2] + 0.009 + 0.5 * p];
    return { pos, target, fov: 34 };
  };
  return {
    name: 's23-murder', from: P.from, to: P.to,
    frag: STONE_GLSL + 'vec3 shade(vec2 fc) { return stoneField(fc); }',
    uniforms: { ...STONE_UNIFORMS, uYodTex: tex },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(...C.map((v, i) => v - c.pos[i]));
      u.uAper.value = 0.0045 * Math.min(1, u.uFocus.value);
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.08, saturation: 0.9, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.9, 0.95, 1.0], amount: 0.45 } }; },
  };
};
