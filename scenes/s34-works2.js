// s34-works2: "Let your good works shine before others" (second chorus, dawn).
// The lane at first light, the sky down the lane turning rose. One lamp burns on our threshold; across
// the lane and on down it, small clay lamps stand unlit on every doorstep. No hand carries the light:
// the lamps catch one from another. The burning lamp swells, and a spark leaps from its wick in a
// small arc to the next; on "shine" that lamp kindles, swells in its turn and sends the light on, and
// as the camera rises and draws back the light runs on from step to step, zigzagging down the lane.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS, LANE_LAMPS, flameRoot } from '/song/lib/x-house.js';

export const kind = 'shader';

const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Let your good works');
  const shine = wordIn(L, 'shine').start, before = wordIn(L, 'before').start, others = wordIn(L, 'others').start;
  const ign = new Array(12).fill(1e4);
  ign[0] = P.from - 30;
  ign[1] = shine + 0.03;
  ign[2] = before + 0.05;
  ign[3] = others + 0.05;
  const gaps = [0.45, 0.42, 0.4, 0.38, 0.36];
  for (let i = 4; i < LANE_LAMPS.length; i++) ign[i] = ign[i - 1] + gaps[i - 4];
  const R1 = flameRoot(LANE_LAMPS[1].slice(0, 3), LANE_LAMPS[1][3]);
  const cam = (t) => {
    const d = drift(t, 0.003);
    const a = ease.inOut3(clamp01((t - P.from) / (shine + 0.4 - P.from)));
    const k = ease.inOut3(clamp01((t - (shine + 0.2)) / (P.to - shine - 0.2)));
    const p0 = [2.9, 0.3, 4.3], p1 = [2.75, 0.34, 4.4], p2 = [2.9, 1.4, 4.65];
    const t0 = [-1.5, -0.05, 4.6], t1 = [-1.8, -0.08, 5.0], t2 = [-11.0, 0.1, 5.45];
    const pos = lerp(lerp(p0, p1, a), p2, k);
    const target = lerp(lerp(t0, t1, a), t2, k);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov: 42 + 4 * k };
  };
  return {
    name: 's34-works2', from: P.from, to: P.to,
    frag: houseFrag(['LANE']),
    uniforms: { ...HOUSE_UNIFORMS, uLampI: 0.0, uAper: 0.004, uSky: 2.0, uIgn: ign },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const k = ease.inOut3(clamp01((t - (shine + 0.2)) / (P.to - shine - 0.2)));
      const dNear = Math.hypot(c.pos[0] - R1[0], c.pos[1] - R1[1], c.pos[2] - R1[2]);
      u.uFocus.value = dNear * (1 - k) + 7.0 * k;
      u.uAper.value = 0.004;
      u.uCarryK.value = 0.0;
      u.uMoon.value = 0.0; u.uSky.value = 1.55;
      u.uExpo.value = 1.0 - 0.15 * k;
      u.uHaze.value = 0.6; u.uLanePow.value = 5.0 + 3.0 * k; u.uFog.value = 0.03; u.uAmb.value = 2.6 - 0.8 * k;
    },
    post(t) { return grade(t, { grain: 0.01, ca: 0.03, exposure: 1.6, bloom: 0.09, threshold: 1.1, vignette: 0.45, saturation: 1.02 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.3 }, grade: { shadows: [0.01, 0.01, 0.03], highlights: [1.0, 0.92, 0.82], amount: 0.4 } }; },
  };
};
