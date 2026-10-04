// s27-go: "Leave your gift and go make peace / Then come and offer it". One sentence, out and back.
// The gift lies on the altar step in the last of the night; the camera leaves it and travels out
// across the court, through the gate and onto the road in the blue hour, footprints in the dust
// leading away. On the road the two small clay lamps from the cracked pavement sit far apart, each in
// its own small pool of light; they are drawn together through the dust, nozzle to nozzle, and on
// "peace" their light merges into one warm pool. Then back at the altar step: the gift is offered, and
// a clean thread of incense smoke rises straight up into a shaft of gold light on "offer it".
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { COURT_GLSL, COURT_UNIFORMS } from '/song/lib/x-temple-court.js';

export const kind = 'shader';

const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
// a smooth path through keyframes [time, value]
function path(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) return lerp3(a, b, ease.inOut3((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'Leave your gift', 'Then come');
  const tGo = wordIn(A, 'go').start, tPeace = wordIn(A, 'peace').start;
  const tOffer = wordIn(B, 'offer').start;
  const tBack = 159.34;   // the measured beat before "Then": the cut back to the altar
  const F = P.from;
  // out: from the gift, across the court, through the gate, onto the road
  const outPos = [[F, [-1.5, 0.6, -1.12]], [157.3, [-1.38, 0.62, -1.28]], [157.62, [-0.75, 0.95, -2.2]], [tGo - 0.1, [0.15, 1.6, -5.0]], [tGo + 0.5, [0.0, 2.1, -12.6]], [tBack, [0.0, 0.95, -14.8]]];
  const outTgt = [[F, [0.15, 0.34, -1.35]], [157.3, [0.15, 0.36, -1.45]], [157.62, [0.1, 1.0, -5.5]], [tGo - 0.1, [0.0, 1.3, -11.0]], [tGo + 0.5, [0.0, 0.3, -17.6]], [tBack, [0.0, 0.1, -17.7]]];
  // back: low at the step, rising with the incense into the light
  const inPos = [[tBack, [1.85, 0.5, -3.45]], [P.to, [1.75, 0.62, -3.65]]];
  const inTgt = [[tBack, [0.45, 0.62, -1.3]], [tOffer - 0.1, [0.5, 0.75, -1.3]], [P.to, [0.5, 1.0, -1.3]]];
  const back = (t) => t >= tBack;
  const cam = (t) => {
    const d = drift(t, 0.005);
    if (!back(t)) {
      const p = path(outPos, t), q = path(outTgt, t);
      return { pos: [p[0] + d[0], p[1] + d[1], p[2]], target: q, fov: mix(42, 40, clamp01((t - 157.3) / 0.5)) + 12 * clamp01((t - tGo + 0.1) / 0.6) - 8 * ease.inOut3(clamp01((t - tGo - 0.5) / (tBack - tGo - 0.5))) };
    }
    const p = path(inPos, t), q = path(inTgt, t);
    return { pos: [p[0] + d[0], p[1] + d[1], p[2]], target: q, fov: 36 };
  };
  return {
    name: 's27-go', from: P.from, to: P.to,
    frag: COURT_GLSL + 'vec3 shade(vec2 fc) { return court(fc); }',
    uniforms: { ...COURT_UNIFORMS, uMoon: [0.05, 0.3, 1.0] },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFire.value = 1; u.uSmoke.value = 1;
      if (!back(t)) {
        u.uBlue.value = mix(0.45, 1.0, clamp01((t - F) / (tGo - F)));
        u.uIncense.value = 0; u.uGold.value = 0;
        // the two lamps: far apart, drawn together through the dust, nozzle to nozzle on "peace";
        // their pools merge and the one light swells a little
        const t0 = tGo + 0.35, t1 = tPeace + 0.1;
        const m = 0.5 - 0.5 * Math.cos(Math.PI * clamp01((t - t0) / (t1 - t0)));
        const sep = mix(1.3, 0.122, m);
        u.uL1.value.set(sep, 0, -17.2);
        u.uL2.value.set(-sep, 0, -17.2);
        u.uLStart.value = 1.3;
        u.uLamp.value = 1.0 + 0.45 * ease.inOut3(clamp01((t - tPeace + 0.05) / 0.4));
        u.uFocus.value = Math.hypot(c.pos[1] + 0.25, c.pos[2] + 17.2); u.uAper.value = 0.003;
        if (t < tGo - 0.1) { u.uFocus.value = mix(1.6, 5.0, ease.inOut3(clamp01((t - 157.3) / (tGo - 0.1 - 157.3)))); }
      } else {
        u.uBlue.value = 0.7;
        u.uLamp.value = 0;
        u.uIncense.value = mix(0.25, 1.0, ease.inOut3(clamp01((t - tBack) / (P.to - tBack))));
        u.uGold.value = 0.15 + 0.85 * ease.inOut3(clamp01((t - tOffer + 0.15) / 0.7));
        u.uFocus.value = Math.hypot(c.pos[0] - 0.7, c.pos[1] - 0.6, c.pos[2] + 1.28);
        u.uAper.value = 0.004;
      }
    },
    post(t) { return grade(t, { exposure: back(t) ? 1.45 : 1.5, bloom: 0.11, threshold: 1.0, contrast: 1.05, vignette: 0.5, grain: 0.014, ca: 0.06 }); },
    finish(t) {
      return back(t)
        ? { grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.9, 0.74], amount: 0.45 } }
        : { grade: { shadows: [0.0, 0.015, 0.04], highlights: [0.96, 0.95, 0.98], amount: 0.4 } };
    },
  };
};
