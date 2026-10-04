// s38-gehenna: "Better to lose one part of you / Than your whole body be cast into hell".
// Gehenna, sober and far: from the dark rim of the Valley of Hinnom in the cold grey-blue before dawn,
// looking down the deep ravine where low refuse fires smoulder red on its floor and their smoke rises
// slow and drifts down the valley; a faint pale band lies low in the east. The camera edges toward
// the rim and leans to look down, then on the last words pulls back from the edge.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { GEHENNA_GLSL, GEHENNA_UNIFORMS } from '/song/lib/x-heart-gehenna.js';

export const kind = 'shader';

export default (P) => {
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from - 1.2)));
    const back = ease.inOut3(clamp01((t - (P.to - 1.6)) / 1.6));
    const d = drift(t, 0.05);
    // low on the rim among the rocks: the camera edges forward to look over, then draws back
    return {
      pos: [117.5 - 1.0 * p + 1.4 * back + d[0] * 0.4, 3.0 - 0.3 * p + 0.3 * back + d[1] * 0.4, 52 - 0.6 * p + 0.6 * back],
      target: [-10 + 3 * p, -58 - 3 * p + 3 * back, -40 + 6 * p], fov: 44,
    };
  };
  return {
    name: 's38-gehenna', from: P.from, to: P.to,
    frag: GEHENNA_GLSL + 'vec3 shade(vec2 fc) { return gehenna(fc); }',
    uniforms: { ...GEHENNA_UNIFORMS },
    camera: cam,
    update(t, u) { u.uFocus.value = 60; u.uAper.value = 0.012; },
    post(t) { return grade(t, { exposure: 1.6, bloom: 0.09, threshold: 1.0, saturation: 0.95, vignette: 0.5, contrast: 1.04, lift: [0.006, 0.007, 0.01], grain: 0.014 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.92, 0.85], amount: 0.45 } }; },
  };
};
