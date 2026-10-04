// s26-grievance: "And remember your brother's grievance". A deep crack splits the great flagstones of
// the temple court under a low moon and runs away from the lens into the dark. Two small clay oil
// lamps sit one on either side of it, nozzles turned toward each other, their warm pools of light not
// meeting. The camera travels slowly along the crack; on "grievance" the crack opens a little wider,
// carrying the lamps further apart, and dust trickles off its lips into the dark.
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
      const w = 0.05 * apart;
      u.uWiden.value = w;
      u.uDust.value = clamp01((t - tG + 0.3) / 0.6);
      u.uL1.value.set(0.66 + w, 0, 2.35);
      u.uL2.value.set(-0.62 - w, 0, 2.5);
      u.uFocus.value = Math.hypot(c.pos[1], 2.42 - c.pos[2]);
      u.uAper.value = 0.005;
    },
    post(t) { return grade(t, { exposure: 1.4, bloom: 0.08, threshold: 1.1, contrast: 1.06, saturation: 0.95, vignette: 0.5, grain: 0.014, ca: 0.06 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.95, 0.96, 1.0], amount: 0.4 } }; },
  };
};
