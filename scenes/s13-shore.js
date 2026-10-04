// s13-shore · "You are the light for the world"
// Night on the western shore of the Sea of Galilee. The camera glides low along the dark beach; on each
// sung word another lamp kindles along the shore ahead, and from "world" the lamps run on along the
// water's edge and up into the hills, until the darkness is strung with points of warm light, each
// trembling in the black water.
import { grade, ease, drift, linesAt, clamp01, mix } from '/song/lib/look.js';
import { DAWN_GLSL, DAWN_UNIFORMS, N_LAMPS, westShoreZ, inland, sunDir, packLamps, packProps, boatProw, houseDoor } from '/song/lib/x-dawn.js';

export const kind = 'shader';
const DAY = false;   // debugging: see the ground in daylight

// deterministic pseudo-random
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'You are the light');
  // the shore of a small fishing village: low basalt houses with lamps in their doorways, boats drawn up
  // in the shallows with a lamp at the prow, and lamps set down on the rocks at the water's edge
  const sz = (x) => westShoreZ(x);
  const houses = [[-0.81, sz(-0.81) - 0.045, 0.15, 8], [-0.735, sz(-0.735) - 0.032, -0.1, 7], [-0.67, sz(-0.67) - 0.06, 0.25, 9], [-0.6, sz(-0.6) - 0.038, -0.2, 7]];
  const boats = [[-0.775, sz(-0.775) + 0.018, 0.4, 7], [-0.705, sz(-0.705) + 0.03, -0.3, 6.5], [-0.64, sz(-0.64) + 0.014, 2.7, 7.5]];
  const props = packProps(boats, houses);
  const door = (h) => { const [x, z] = houseDoor(h); return [x, z, 0.9, props.uHouseY[houses.indexOf(h)] + 0.0007]; };
  const prow = (b) => { const [x, z] = boatProw(b); return [x, z, 0.8, 0.0011 + 0.0003 * rnd(b[0] * 100)]; };
  const rock = (x, dz, hm, k) => [x, sz(x) - dz, k, undefined, hm];
  // kindled in this order, one per sung word, then on along the shore and up the hill
  const near = [
    rock(-0.722, 0.004, 0.6, 0.7), prow(boats[0]), door(houses[1]), rock(-0.79, 0.007, 1.1, 0.6),
    prow(boats[1]), door(houses[0]), rock(-0.655, 0.003, 0.4, 0.8), door(houses[2]), prow(boats[2]), door(houses[3]),
    rock(-0.845, 0.01, 0.9, 0.5), rock(-0.6, 0.006, 0.5, 0.6), rock(-0.88, 0.003, 0.3, 0.5), rock(-0.57, 0.012, 1.3, 0.55),
  ];
  const hill = [];
  for (let i = 0; hill.length < N_LAMPS - near.length; i++) {
    const D = 0.07 + 1.1 * Math.pow(rnd(i + 90), 1.1);
    const x = -0.72 + (rnd(i + 40) - 0.5) * (0.35 + 0.9 * D);
    hill.push([x, inland(x, D), 0.45 + 0.6 * rnd(i + 7), undefined, 0.3 + 2.5 * rnd(i + 11), D + 0.25 * Math.abs(x + 0.72)]);
  }
  // the hill lamps kindle in order of their climb from the shore, so the light runs up the slopes
  hill.sort((a, b) => a[5] - b[5]);
  const ign = [P.from - 4];
  for (const w of L.words) ign.push(w.start);
  let tt = L.words.at(-1).start + 0.12, dt = 0.07;
  while (ign.length < N_LAMPS) { ign.push(tt); tt += dt; dt *= 0.93; }
  const all = [...near, ...hill];
  // [x, z, size, ignite, height above ground (m), absolute height (km)]
  const lamps = packLamps(all.map((l, i) => [l[0], l[1], l[2], ign[i], l[4], l[3]]));

  // the camera floats low over the water off the shore and drifts slowly along it, looking back to land
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0003);
    const x = mix(-0.79, -0.74, p);
    return { pos: [x + d[0] * 0.5, 0.0028 + 0.0008 * p + d[1] * 0.3, 1.36], target: [x + 0.05, 0.03 + 0.004 * p, 0.6], fov: 44 };
  };
  return {
    name: 's13-shore', from: P.from, to: P.to,
    frag: DAWN_GLSL + 'vec3 shade(vec2 fc) { float d; return dawnScene(fc, d); }',
    uniforms: { ...DAWN_UNIFORMS, ...lamps, ...props, uSwell: 1.0, uSunDir: DAY ? sunDir(-0.3, 0.3) : sunDir(-0.3, -0.5), uSunCol: DAY ? [6, 5.5, 5] : [0, 0, 0], uMoonK: 0.5, uMoonDir: [0.3, 0.45, 0.85], uMist: 0.6, uCloud: 0.3, uLampI: 0.6, uWave: 0.8, uAper: 0.000006, uFocus: 0.15 },
    camera: cam,
    update(t, u) { },
    post(t) { return grade(t, { exposure: 9.0, bloom: 0.2, threshold: 0.8, vignette: 0.5, saturation: 0.85 }); },
    finish(t) { return { flare: { amount: 0.1, threshold: 1.0, tint: [1.0, 0.7, 0.45], length: 0.2 }, grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.92, 0.8], amount: 0.45 } }; },
  };
};
