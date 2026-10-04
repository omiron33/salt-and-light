// s30-light2 · "You are the light for the world" (second chorus)
// The blue hour before dawn, from high on the western slope above the Sea of Galilee: a line of first
// light burns along the eastern ridge across the water, while below, on the dark slopes and along the
// shore, the small lamps of the night are still lit. The camera pans slowly along the ridge.
import { grade, ease, drift, clamp01, mix } from '/song/lib/look.js';
import { DAWN_GLSL, DAWN_UNIFORMS, N_LAMPS, inland, groundH, sunDir, packLamps, westShoreZ, lakeD } from '/song/lib/x-dawn.js';

export const kind = 'shader';
const rnd = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

export default (P) => {
  // the lamps still burning on the slopes below and along the shore (all lit long since)
  const list = [];
  const C0 = [-0.3, -0.05];
  for (let i = 0; list.length < N_LAMPS && i < 4000; i++) {
    const shore = i % 4 === 0;
    let x, z;
    if (shore) { x = -0.3 + 2.6 * (rnd(i) - 0.5); z = inland(x, 0.006 + 0.02 * rnd(i + 5)); }
    else {
      const dz = 0.07 + 1.25 * rnd(i + 9) ** 1.3;
      x = C0[0] + dz * (0.75 * (rnd(i) - 0.5) - 0.07);
      z = C0[1] + dz;
      if (lakeD(x, z) < 0.01) continue;
    }
    list.push([x, z, 0.5 + 0.7 * rnd(i + 3), P.from - 30]);
  }
  const lamps = packLamps(list);
  const C = [-0.3, 0, -0.05];
  C[1] = groundH(C[0], C[2]) + 0.01;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0006);
    const yaw = mix(-0.2, 0.06, p);
    return { pos: [C[0] + d[0] + 0.05 * p, C[1] + d[1], C[2]], target: [C[0] + Math.sin(yaw) * 5, C[1] - 0.42, C[2] + Math.cos(yaw) * 5], fov: 34 };
  };
  return {
    name: 's30-light2', from: P.from, to: P.to,
    frag: DAWN_GLSL + 'vec3 shade(vec2 fc) { float d; return dawnScene(fc, d); }',
    uniforms: { ...DAWN_UNIFORMS, ...lamps, uSunDir: sunDir(-0.28, -0.11), uSunCol: [0, 0, 0], uMoonK: 0.15, uMoonDir: [-0.5, 0.5, -0.6], uMist: 0.5, uCloud: 0.3, uFill: 3.0, uLampI: 0.5, uWave: 0.6 },
    camera: cam,
    update(t, u) {
      // the first light strengthens as the pan runs along the ridge
      const p = clamp01((t - P.from) / (P.to - P.from));
      u.uSunDir.value.set(...sunDir(-0.28, -0.115 + 0.02 * p));
    },
    post(t) { return grade(t, { exposure: 2.0, bloom: 0.18, threshold: 0.85, vignette: 0.45, saturation: 0.95 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.9, 0.78], amount: 0.4 } }; },
  };
};
