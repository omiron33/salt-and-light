// s26-grievance: "And remember your brother's grievance". A deep crack splits the great flagstones of
// the temple court and runs away from the lens into the dark. A low moon behind the camera lays two
// long human shadows down the pavement, one on either side of the crack, apart; the two who cast them
// stand behind us and are never seen. The camera travels slowly along the crack; on "grievance" the
// shadows draw a little further apart.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { CRACK_GLSL, CRACK_UNIFORMS } from '/song/lib/x-temple-crack.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'And remember');
  const tG = wordIn(L, 'grievance').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.006);
    const z = mix(-0.75, 0.15, p);
    return { pos: [0.02 + d[0], mix(1.15, 0.95, p) + d[1], z], target: [0.0, 0.0, z + 5.2], fov: 42 };
  };
  return {
    name: 's26-grievance', from: P.from, to: P.to,
    frag: CRACK_GLSL + 'vec3 shade(vec2 fc) { return pavement(fc); }',
    uniforms: { ...CRACK_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const apart = ease.inOut3(clamp01((t - tG + 0.2) / 1.4));
      u.uP1.value.set(mix(0.95, 1.1, apart), 0, -1.75);
      u.uP2.value.set(mix(-0.9, -1.05, apart), 0, -1.85);
      u.uPA.value.set(mix(0.2, 0.55, apart), mix(-0.25, -0.6, apart), 0);
      u.uFocus.value = Math.hypot(c.pos[1], 3.2);
      u.uAper.value = 0.005;
    },
    post(t) { return grade(t, { exposure: 1.4, bloom: 0.08, threshold: 1.1, contrast: 1.06, saturation: 0.95, vignette: 0.5, grain: 0.014, ca: 0.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.95, 0.96, 1.0], amount: 0.4 } }; },
  };
};
