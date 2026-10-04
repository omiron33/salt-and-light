// s05-mercy: "Mercy will meet the merciful". Close and warm: a little clay juglet tilts over a dark,
// empty clay lamp and pours a thread of golden olive oil into it; the oil pools and rises and creeps
// up the linen wick, darkening it; on "merciful" the flame rises from the wick, flares and settles,
// and its light takes over the scene. The camera eases slowly in and down toward the lamp.
import { grade, ease, drift, clamp01, linesAt, wordIn } from '/song/lib/look.js';
import { LAMPW_GLSL, LAMP_UNIFORMS } from '/song/lib/x-vessel-lamp.js';

export const kind = 'shader';

export default (P) => {
  const [l] = linesAt(P.from - 0.6, 'Mercy will meet');
  const merciful = wordIn(l, 'merciful').start;
  const pour0 = P.from - 0.25, pour1 = merciful - 0.55;
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const e = ease.inOut3(p);
    const d = drift(t, 0.0015);
    return {
      pos: [0.02 - 0.03 * e + d[0], 0.16 - 0.02 * e + d[1], -0.4 + 0.07 * e],
      target: [-0.02 + 0.02 * e, 0.07 - 0.012 * e, 0.0],
      fov: 34,
    };
  };
  return {
    name: 's05-mercy', from: P.from, to: P.to,
    frag: LAMPW_GLSL + 'vec3 shade(vec2 fc) { return lampWorld(fc); }',
    uniforms: { ...LAMP_UNIFORMS, uPour0: pour0, uPour1: pour1, uFlame: merciful - 0.04 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - 0.0, c.pos[1] - 0.05, c.pos[2]);
      u.uAper.value = 0.0035;
      // the oil rises while it pours, the wick drinks it in after
      u.uFill.value = 0.08 + 0.85 * ease.inOut3(clamp01((t - pour0 - 0.15) / (pour1 - pour0)));
      u.uSoak.value = 0.15 + 0.85 * ease.inOut3(clamp01((t - pour0 - 0.6) / (merciful - pour0 - 0.6)));
      // the juglet tilts up to pour, and back as it stops
      const up = ease.inOut3(clamp01((t - pour1 + 0.15) / 0.8));
      u.uTilt.value = 1.95 - 0.06 * Math.sin(t * 1.3) * (1 - up) - 0.55 * up;
      u.uLift.value = ease.inOut3(clamp01((t - pour1) / 1.4)) * 1.6;
    },
    post(t) { return grade(t, { exposure: 1.4, bloom: 0.14, threshold: 1.0, vignette: 0.5 }); },
  };
};
