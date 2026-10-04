// s12-taste: "Do not let it lose its taste". A salt pan on the Dead Sea shore at night under a low
// moon: a pavement of crusted polygons runs to the still black water and the dark hills of Moab. The
// crust glitters toward the moon, every sparked facet walking as the camera glides slowly forward
// and to the right; in the foreground one patch has gone dull and grey and does not glint at all.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { PAN_GLSL, PAN_UNIFORMS } from '/song/lib/x-salt-pan.js';
import { LENS_GLSL } from '/song/lib/x-salt.js';

export const kind = 'shader';

export default (P) => {
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const d = drift(t, 0.01);
    return {
      pos: [-1.2 + 1.6 * p + d[0], 1.35 + 0.05 * p + d[1], 0.0 + 2.2 * p],
      target: [0.4 + 1.6 * p, 0.25, 14.0 + 2.2 * p],
      fov: 46,
    };
  };
  return {
    name: 's12-taste', from: P.from, to: P.to,
    frag: LENS_GLSL + PAN_GLSL + 'vec3 shade(vec2 fc) { return pan(fc); }',
    uniforms: { ...PAN_UNIFORMS },
    camera: cam,
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.14, threshold: 1.0, vignette: 0.45 }); },
  };
};
