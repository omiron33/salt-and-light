// s24-anger: "I tell you anger also faces judgment". Embers in the dark: a bed of wood coals in a
// stone hearth smoulders and breathes; on "anger" it flares angry red, small flames lick up and
// sparks spit and rise; on "judgment" a cold white light falls from above onto the bed, its edge
// travelling down through the haze, and the coals sink to a dull red under it.
import { grade, ease, drift, linesAt, wordIn, clamp01, spring, mix } from '/song/lib/look.js';
import { EMBER_GLSL, EMBER_UNIFORMS } from '/song/lib/x-ember.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'I tell you anger');
  const tAnger = wordIn(L, 'anger').start, tJudge = wordIn(L, 'judgment').start;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0025);
    // a slow push in over the bed, easing a little lower as the light falls
    const pos = [mix(0.05, 0.02, p) + d[0], mix(0.17, 0.15, p) + d[1], mix(-0.27, -0.22, p)];
    const target = [mix(-0.01, -0.02, p), 0.0, mix(0.1, 0.11, p)];
    return { pos, target, fov: 40 };
  };
  const flare = (t) => {
    const up = spring(t, tAnger - 0.05, 0.35, 0.45);
    const down = 1 - ease.inOut3(clamp01((t - tJudge) / 0.9));
    return Math.max(0, up) * down;
  };
  return {
    name: 's24-anger', from: P.from, to: P.to,
    frag: EMBER_GLSL + 'vec3 shade(vec2 fc) { return embers(fc); }',
    uniforms: { ...EMBER_UNIFORMS, uAngerT: tAnger },
    camera: cam,
    update(t, u) {
      const f = flare(t);
      const cold = ease.out3(clamp01((t - tJudge + 0.08) / 0.35));
      // smoulder 0.42, flare to 1.25, then sink under the cold light to 0.3
      const sink = ease.inOut3(clamp01((t - tJudge) / 1.1));
      u.uFlare.value = f;
      u.uHeat.value = mix(0.55 + 0.05 * Math.sin(t * 1.3) + 0.22 * f, 0.3, sink);
      u.uCold.value = cold;
      u.uColdY.value = mix(-0.55, 0.75, ease.inOut3(clamp01((t - tJudge + 0.05) / 0.9)));
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] + 0.02, c.pos[1] - 0.02, c.pos[2] - 0.02);
      u.uAper.value = 0.0022;
    },
    post(t) {
      const cold = clamp01((t - tJudge) / 0.8);
      return grade(t, { exposure: 1.25, bloom: 0.12, threshold: 1.0, saturation: mix(1.02, 0.92, cold), contrast: 1.04, vignette: 0.5, grain: 0.014, ca: 0.06 });
    },
    finish(t) {
      const cold = clamp01((t - tJudge) / 0.8);
      return { grade: { shadows: [0.0, 0.01 * cold, 0.03 * cold], highlights: mix([1.0, 0.9, 0.8], [0.92, 0.96, 1.0], cold), amount: 0.4 } };
    },
  };
};
