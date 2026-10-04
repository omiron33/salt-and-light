// s01-poor: "Blessed are the poor in spirit / Heaven's kingdom belongs to them". A dark stone room;
// an empty, worn wooden bowl on a rough table, dust in the air. A narrow shaft of pale gold light
// comes down from a gap in the roof, lands in the empty bowl and slowly fills it, until on "kingdom"
// the bowl brims with light and glows; motes turn in the beam. The camera drifts in and, at the end,
// pushes slowly into the glowing bowl.
import { grade, ease, drift, clamp01, linesAt, wordIn } from '/song/lib/look.js';
import { ROOM_GLSL, ROOM_UNIFORMS } from '/song/lib/x-vessel-room.js';

export const kind = 'shader';

export default (P) => {
  const [l1, l2] = linesAt(P.from - 0.6, 'Blessed are the poor', "Heaven's kingdom");
  const kingdom = wordIn(l2, 'kingdom').start;
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = clamp01((t - P.from) / dur);
    const e = ease.inOut3(p);
    const push = ease.inOut3(clamp01((t - (kingdom + 0.6)) / (P.to - kingdom - 0.6)));
    const d = drift(t, 0.004);
    return {
      pos: [-0.22 + 0.1 * e + 0.04 * push + d[0], 0.3 - 0.02 * e + 0.02 * push + d[1], -0.82 + 0.16 * e + 0.16 * push],
      target: [0.2 - 0.03 * e - 0.05 * push, 0.07 - 0.01 * e - 0.02 * push, 0.06],
      fov: 30,
    };
  };
  return {
    name: 's01-poor', from: P.from, to: P.to,
    frag: ROOM_GLSL + 'vec3 shade(vec2 fc) { return room(fc); }',
    uniforms: { ...ROOM_UNIFORMS },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[1] - 0.05, c.pos[2]);
      u.uAper.value = 0.006;
      // the shaft comes down from the roof as the first words are sung
      u.uFront.value = 0.86 + 0.14 * ease.inOut3(clamp01((t - P.from) / 1.1));
      u.uBeam.value = 0.75 + 0.25 * ease.inOut3(clamp01((t - kingdom + 0.5) / 1.5)) + 0.03 * Math.sin(t * 1.7);
      // and fills the bowl, brimming on "kingdom"
      u.uFill.value = 0.82 * ease.inOut3(clamp01((t - (l1.start + 0.6)) / (kingdom - l1.start - 0.6))) + 0.18 * ease.out3(clamp01((t - kingdom) / 1.6));
    },
    post(t) { return grade(t, { exposure: 1.35, bloom: 0.12, threshold: 1.0, vignette: 0.5 }); },
  };
};
