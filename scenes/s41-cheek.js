// s41-cheek: "You heard an eye for an eye / But I tell you, turn the other cheek".
// A stone colonnade by the road in the cold before dawn. On a block on the open, cold side a bronze
// balance swings, pan against pan, in the grey-blue light: an eye for an eye. From "But I tell you"
// the camera turns slowly round the nearest pillar, through its shadowed side, and comes round into
// the warm light of a clay lamp burning behind it, the light raking the fluted stone, on "turn the
// other cheek". One continuous move.
import { grade, ease, drift, clamp01, mix, linesAt, wordIn } from '/song/lib/look.js';
import { CHEEK_GLSL, CHEEK_UNIFORMS, SCALE_P, LAMP_P } from '/song/lib/x-road-cheek.js';

export const kind = 'shader';

export default (P) => {
  const [l1, l2] = linesAt(P.from - 0.6, 'You heard an eye', 'But I tell you');
  const but = l2.words[0].start, turn = wordIn(l2, 'turn').start, cheek = wordIn(l2, 'cheek').start;
  // the turn: from a little before "turn" to past "cheek", round the pillar
  const t0 = but + 0.4, t1 = P.to;
  const orbit = (t) => ease.inOut3(clamp01((t - t0) / (t1 - t0)));
  const cam = (t) => {
    const k = orbit(t);
    const d = drift(t, 0.003);
    // polar about the pillar's axis
    const a0 = 2.62, a1 = 2 * Math.PI - 1.1;
    const a = mix(a0, a1, k) + 0.04 * (t - P.from) * (1 - k);
    const r = mix(2.3, 1.75, k) + 0.12 * Math.sin(Math.PI * k);
    const y = mix(1.32, 1.42, k);
    const pos = [Math.cos(a) * r + d[0], y + d[1], Math.sin(a) * r];
    // look at the scales first, then at the pillar's lit flank
    const s = [SCALE_P[0] + 0.1, SCALE_P[1] + 0.32, SCALE_P[2]];
    const pf = [0.02, 1.36, 0.05];
    const kt = ease.inOut3(clamp01((t - t0 + 0.2) / (t1 - t0 - 0.6)));
    return { pos, target: mix(s, pf, kt), fov: mix(36, 40, k) };
  };
  return {
    name: 's41-cheek', from: P.from, to: P.to,
    frag: CHEEK_GLSL + 'vec3 shade(vec2 fc) { return cheekScene(fc); }',
    uniforms: { ...CHEEK_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const dist = Math.hypot(...c.target.map((v, i) => v - c.pos[i]));
      u.uFocus.value = dist - 0.25 * orbit(t); u.uAper.value = 0.0035;
      u.uDawn.value = 0.0;
      // the beam swings, an eye for an eye; it is still swinging, smaller, as the camera turns away
      const x = t - P.from;
      u.uSwing.value = 0.22 * Math.sin(x * 2.3 + 0.3) * Math.exp(-x * 0.12) + 0.05 * Math.sin(x * 3.9);
      u.uPan.value = 0.1 * Math.sin(x * 2.3 - 0.9) * Math.exp(-x * 0.12);
      u.uWarm.value = orbit(t);
    },
    post(t) { return grade(t, { exposure: 2.0, bloom: 0.12, threshold: 0.9, contrast: 1.05, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.012, 0.035], highlights: [1.0, 0.92, 0.8], amount: 0.4 } }; },
  };
};
