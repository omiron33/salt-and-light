// s37-eye: "If your right eye leads you into sin / Tear it out and throw it away".
// A grapevine in the dark, lit hard from the side; one branch hangs withered from the arm. A pruning
// knife's curved blade (no hand: its back runs out of the bottom of frame) rises into shot and
// poises beside it through the first line; on "Tear" it sweeps through the withered branch at its
// base, and the cut branch tumbles away down into the dark by "throw it away" while the vine
// shivers. The camera drifts slowly in toward the cut, focused on it.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { VINE_GLSL, VINE_UNIFORMS } from '/song/lib/x-heart-vine.js';

export const kind = 'shader';

const CUTP = [0.092, 0.035, 0.011];
export default (P) => {
  const [l1, l2] = linesAt(P.from - 0.6, 'If your right eye', 'Tear it out');
  const tear = wordIn(l2, 'Tear').start;
  const tCut = tear + 0.08;               // the edge passes the branch
  const sw0 = tCut - 0.1, sw1 = tCut + 0.12;
  // the knife (mirrors knifeLocal in the world file): local -> world is tilt back, then turn by ang
  const KT = 0.55, ANG = 1.25;
  const toWorld = (v, ang) => {
    const x = v[0] * Math.cos(KT) - v[2] * Math.sin(KT), z = v[0] * Math.sin(KT) + v[2] * Math.cos(KT);
    const c = Math.cos(ang), sn = Math.sin(ang);
    return [c * x - sn * v[1], sn * x + c * v[1], z];
  };
  const EA = 0.45, ER = 0.060;
  const knife = (t) => {
    const rise = ease.inOut3(clamp01((t - (P.from + 1.4)) / 2.0));
    let s = -0.03;
    if (t > sw0) s = -0.03 + 0.03 * clamp01((t - sw0) / (tCut - sw0)) ** 1.6;
    if (t > tCut) s = 0.07 * ease.out3(clamp01((t - tCut) / 0.3));
    const out = ease.inOut3(clamp01((t - (tCut + 0.5)) / 1.0));
    const breathe = 0.0025 * Math.sin(t * 1.5) * (t < sw0 ? 1 : 0);
    const ang = ANG + 0.12 * (1 - rise) - 0.1 * out;
    const e = toWorld([ER * Math.cos(EA), ER * Math.sin(EA), 0], ang);
    const D = toWorld([-Math.cos(EA), -Math.sin(EA), 0], ang);
    const H = toWorld([0, -1, 0], ang);
    const away = 0.3 * (1 - rise);
    const exit = [0.45 * out, 0.05 * out, 0.0];      // after the cut it withdraws out to the right
    return {
      pos: [0, 1, 2].map((i) => CUTP[i] - e[i] + (s + breathe) * D[i] + away * H[i] + exit[i]),
      ang,
    };
  };
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.003);
    return { pos: [0.03 + 0.03 * p + d[0], 0.1 - 0.01 * p + d[1], 0.66 - 0.08 * p], target: [0.08 + 0.01 * p, 0.065, 0.0], fov: 32 };
  };
  return {
    name: 's37-eye', from: P.from, to: P.to,
    frag: VINE_GLSL + 'vec3 shade(vec2 fc) { return vine(fc); }',
    uniforms: { ...VINE_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(CUTP[0] - c.pos[0], CUTP[1] - c.pos[1], CUTP[2] - c.pos[2]);
      u.uCut.value = tCut;
      const k = knife(t);
      u.uKpos.value = k.pos; u.uKang.value = k.ang;
      const x = t - tCut;
      u.uShiver.value = x > 0 ? Math.exp(-x * 3.5) : 0;
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.07, threshold: 1.1, saturation: 1.0, vignette: 0.5, contrast: 1.03, lift: [0.004, 0.004, 0.006], grain: 0.014 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.93, 0.82], amount: 0.4 } }; },
  };
};
