// s20-law: "Do not think I came to tear down the Law / Or the words the prophets gave".
// A Torah scroll lies open on a velvet-covered lectern in a dark stone synagogue; an oil lamp on a
// bronze stand beyond the page lights its columns. The camera glides low along the parchment from
// right to left, the way the writing reads, the focus travelling with it over the letters.
import * as THREE from 'three';
import { grade, ease, clamp01, drift } from '/song/lib/look.js';
import { SCROLL_GLSL, SCROLL_UNIFORMS, scrollCanvases, toW } from '/song/lib/x-scroll.js';

export const kind = 'shader';

export async function scrollTextures() {
  const sc = await scrollCanvases();
  const tex = (cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.anisotropy = 16;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  };
  return { sc, ink: tex(sc.canvas), detail: tex(sc.detail) };
}

export default async (P) => {
  const { sc, ink, detail } = await scrollTextures();
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from + 0.4) / (dur + 0.8)));
    const d = drift(t, 0.0025);
    const x = -0.13 + 0.19 * p;
    const pos = toW([x + d[0], 0.12 + 0.008 * p + d[1], -0.25 + 0.015 * p]);
    const target = toW([x + 0.06, 0.06, 0.14]);
    return { pos, target, fov: 40, focusPt: toW([x + 0.02, 0.0, 0.0]) };
  };
  return {
    name: 's20-law', from: P.from, to: P.to,
    frag: SCROLL_GLSL + 'vec3 shade(vec2 fc) { vec3 c = scroll(fc); return min(c, vec3(4.0)); }',
    uniforms: { ...SCROLL_UNIFORMS, uInk: ink, uDetail: detail, uDetRect: sc.detRect, uAper: 0.0035 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // focus on the writing a little up the page from the camera
      u.uFocus.value = Math.hypot(...c.focusPt.map((v, i) => v - c.pos[i]));
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.08, threshold: 1.1, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.004, 0.012], highlights: [1.0, 0.94, 0.84], amount: 0.35 } }; },
  };
};
