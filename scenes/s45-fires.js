// s45-fires: "You heard, love your neighbor and hate your enemy". The deep blue just before dawn on
// the shore of the Sea of Galilee. Close by, on the shore stones, a campfire burns alone in its ring
// of stones, sparks going up, smoke lit from below, the wet stones and the water catching it. Across
// the dark water of the cove, on a low headland, the other fire burns alone, a small warm point with
// its own reflection. The camera drifts slowly along the shore.
import { grade } from '/song/lib/look.js';
import { FIRES_GLSL, FIRES_UNIFORMS } from '/song/lib/x-galilee-fires.js';
import { firesCam, firesUpdate } from '/song/lib/x-galilee-fires-cam.js';
import { flicker } from '/song/lib/x-galilee-lamp.js';

export const kind = 'shader';
export const firesPost = (t) => grade(t, { exposure: 3.2, bloom: 0.13, threshold: 0.9, vignette: 0.5, saturation: 1.03, contrast: 1.04, lift: [0.005, 0.006, 0.011] });
export const firesFinish = () => ({ flare: { amount: 0.06, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.92, 0.8], amount: 0.45 } });
export const firesUniforms = { ...FIRES_UNIFORMS, uDawn: 0.72, uStars: 1.0, uSwell: 0.3, uMist: 0.6, uAper: 0.004 };

export default (P) => ({
  name: 's45-fires', from: P.from, to: P.to,
  frag: FIRES_GLSL + 'vec3 shade(vec2 fc) { return firesShot(fc); }',
  uniforms: firesUniforms,
  camera: firesCam,
  update(t, u) { firesUpdate(t, u, flicker); },
  post: firesPost,
  finish: firesFinish,
});
