// s43-mile: "If you are forced to walk one mile / Go with them another".
// A Roman road in the cold grey-blue before dawn. On the left verge a worn milestone with its carved
// miles; the paved road runs on past it toward the low band of the coming dawn, where a second
// milestone stands small against the light. Sandal prints in the dust walk past the first stone and
// on. The camera glides on down the road, passing the first stone as "Go with them another" is sung.
import { grade, ease, drift, clamp01, mix, linesAt, wordIn } from '/song/lib/look.js';
import { MILE_GLSL, MILE_UNIFORMS } from '/song/lib/x-road-mile.js';

export const kind = 'shader';
const roadX = (z) => 9.0 * (1 - Math.cos(z * 0.005));

export default (P) => {
  const [, l2] = linesAt(P.from - 0.6, 'If you are forced', 'Go with them');
  const go = l2.words[0].start;
  const MS = [roadX(7.0) - 3.65, 1.3, 7.0];
  const cam = (t) => {
    const x = clamp01((t - P.from) / (P.to - P.from)); const p = 0.45 * x + 0.55 * ease.inOut3(x);
    const d = drift(t, 0.004);
    // slow toward the stone while its carved miles are read, then on past it down the road
    const z = 1.0 + 0.85 * (t - P.from) + 2.2 * ease.in2((t - go + 0.3) / (P.to - go + 0.3));
    const k = ease.inOut3(clamp01((t - go + 0.5) / 2.4));
    const far = [roadX(z + 60) - 1.5, 1.0, z + 60];
    return {
      pos: [roadX(z) - 0.75 - 0.25 * p + d[0], 1.3 + d[1], z],
      target: mix(MS, far, k), fov: 40,
    };
  };
  return {
    name: 's43-mile', from: P.from, to: P.to,
    frag: MILE_GLSL + 'vec3 shade(vec2 fc) { return mileScene(fc); }',
    uniforms: { ...MILE_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // focus on the first stone, then racks out to the road and the second stone from "Go"
      const near = Math.hypot(MS[0] - c.pos[0], MS[2] - c.pos[2]);
      const k = ease.inOut3(clamp01((t - go + 0.6) / 1.8));
      u.uFocus.value = Math.exp(mix(Math.log(Math.max(near, 1.5)), Math.log(40), k));
      u.uAper.value = 0.0025;
      u.uDawn.value = clamp01((t - P.from) / (P.to - P.from));
    },
    post(t) { return grade(t, { exposure: 2.2, bloom: 0.12, threshold: 0.9, contrast: 1.06, saturation: 1.0, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [1.0, 0.9, 0.8], amount: 0.4 } }; },
  };
};
