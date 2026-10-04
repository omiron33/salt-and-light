// s46-love: "But I tell you, love your enemies". The same shore, the same drift. A small boat with a
// lantern pushes off from our shore and crosses the dark water toward the far fire, its lantern trail
// glittering behind it. On "enemies" it touches the far shore: both fires brighten and the glittering
// trail becomes one path of light across the water, joining them. No figures.
import { FIRES_GLSL } from '/song/lib/x-galilee-fires.js';
import { firesCam, firesUpdate } from '/song/lib/x-galilee-fires-cam.js';
import { flicker } from '/song/lib/x-galilee-lamp.js';
import { firesPost, firesFinish, firesUniforms } from '/song/scenes/s45-fires.js';

export const kind = 'shader';

export default (P) => ({
  name: 's46-love', from: P.from, to: P.to,
  frag: FIRES_GLSL + 'vec3 shade(vec2 fc) { return firesShot(fc); }',
  uniforms: firesUniforms,
  camera: firesCam,
  update(t, u) { firesUpdate(t, u, flicker); },
  post: firesPost,
  finish: firesFinish,
});
