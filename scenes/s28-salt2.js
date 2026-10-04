// s28-salt2: "You are the salt of the earth" (second chorus, the blue hour). Rough salt crusted in the
// hollows of a dark basalt rock at the lake's edge before dawn; beyond the rock's lip the still water
// and the dark eastern hills under a pale cold band of first light. The camera glides low and slowly
// across the crust; the cold band catches the crystals' edges, and the dawn warms a little as we go.
import { grade, ease, drift, clamp01 } from '/song/lib/look.js';
import { SHORE_GLSL, SHORE_UNIFORMS } from '/song/lib/x-salt-shore.js';
import { SALT_UNIFORMS } from '/song/lib/x-salt.js';

export const kind = 'shader';

export default (P) => {
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const e = ease.inOut3(p);
    const d = drift(t, 0.04);
    const back = ease.in2(clamp01((p - 0.75) / 0.25));
    return {
      pos: [-3.0 + 4.0 * p + d[0] * 2.0, 6.0 + 0.3 * e + 1.5 * back + d[1] * 2.0, -1.0 + 1.0 * e - 3.0 * back],
      target: [-0.5 + 3.5 * p, 2.4, 14.0],
      fov: 36,
    };
  };
  return {
    name: 's28-salt2', from: P.from, to: P.to,
    frag: SHORE_GLSL + 'vec3 shade(vec2 fc) { return shore(fc); }',
    uniforms: { ...SALT_UNIFORMS, uSaltSize: 0.2, uSaltVar: 1.0, uSaltMilk: 1.0, uSaltDiff: 1.0, uSaltBody: 2.5, uSaltCleave: 0.5, uSaltGlit: 0.6, uSaltHopper: 0.6, uSaltTilt: 0.5, ...SHORE_UNIFORMS },
    camera: cam,
    update(t, u) {
      const p = (t - P.from) / dur;
      u.uFocus.value = 12.0 + 1.8 * Math.sin(p * Math.PI * 1.2 - 0.4) + 3.0 * ease.in2(clamp01((p - 0.75) / 0.25));
      u.uAper.value = 0.16;
      u.uDawn.value = 0.15 + 0.25 * p;
    },
    post(t) { return grade(t, { exposure: 1.8, bloom: 0.12, threshold: 1.0, vignette: 0.45, saturation: 1.0 }); },
  };
};
