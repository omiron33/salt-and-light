// s09-storm: "When they speak against you because of Me".
// A storm at night: low cloud rolling fast over dark hills, wind thrashing the dry grass on the ridge
// and driving dust; lightning flickers inside the cloud. Far below in the valley one tiny lamp holds.
// At the end the camera tilts up into the cloud, handing off to the rise through it.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { STORM_GLSL, STORM_UNIFORMS, LAMP_POS } from '/song/lib/x-nature-storm.js';

export const kind = 'shader';

// the ground height, the same function as the shader's (to stand the camera on the ridge)
const fr = (x) => x - Math.floor(x);
function hash12(x, y) { let a = fr(x * 0.1031), b = fr(y * 0.1031), c = fr(x * 0.1031); const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; return fr((a + b) * c); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct) { let s = 0, a = 0.5; for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); const nx = 0.8 * x + 0.6 * y, ny = -0.6 * x + 0.8 * y; x = nx * 2.03; y = ny * 2.03; a *= 0.5; } return s; }
function groundH(x, z) {
  const sm = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  let h = -110 * sm(-5, 110, z) + 130 * sm(650, 1400, z) + 30 * (fbm(x * 0.0035 + 1.7, z * 0.0035 + 1.7, 5) - 0.5) + 10 * (fbm(x * 0.012, z * 0.012, 3) - 0.5);
  return h + 6 * Math.exp(-(x * x + z * z) / 900);
}

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'When they speak');
  const because = wordIn(L, 'because').start;
  const g0 = groundH(0, 0);
  const tilt0 = P.to - 1.45;
  const cam = (t) => {
    const p = clamp01((t - P.from) / (P.to - P.from));
    const d = drift(t, 0.03);
    const k = ease.inOut3(clamp01((t - tilt0) / (P.to - tilt0 + 0.25)));
    const y = g0 + 1.7 + 0.5 * p + 4 * k * k;
    const z = -2 + 3 * p;
    // looking out and a little down over the valley; then tilting up into the cloud
    const pitch = mix(-0.26, 0.95, k);
    const yaw = 0.05 - 0.04 * p;
    return { pos: [0.4 + d[0] * 2, y + d[1], z], target: [0.4 + Math.sin(yaw) * 100, y + Math.tan(pitch) * 100, z + Math.cos(yaw) * 100], fov: 50, roll: 0.01 * Math.sin(t * 0.7) };
  };
  // lightning inside the cloud: a far flicker on "speak", a nearer one on "because"
  const flashes = [[wordIn(L, 'speak').start + 0.05, [-700, 230, 1400], 0.6], [because + 0.08, [500, 200, 700], 1.0]];
  const flashAt = (t) => {
    let best = [0, flashes[0][1]];
    for (const [t0, pos, k] of flashes) {
      const x = t - t0;
      if (x < 0 || x > 0.6) continue;
      const v = k * (Math.exp(-x * 18) + 0.6 * Math.exp(-Math.pow((x - 0.16) / 0.04, 2)) + 0.3 * Math.exp(-Math.pow((x - 0.3) / 0.05, 2)));
      if (v > best[0]) best = [v, pos];
    }
    return best;
  };
  return {
    name: 's09-storm', from: P.from, to: P.to,
    frag: STORM_GLSL + 'vec3 shade(vec2 fc) { return storm(fc); }',
    uniforms: { ...STORM_UNIFORMS, uAper: 0.0 },
    camera: cam,
    update(t, u) {
      const [f, pos] = flashAt(t);
      u.uFlash.value = f; u.uFlashP.value.set(...pos);
    },
    post(t) { return grade(t, { exposure: 2.2, bloom: 0.12, threshold: 0.9, vignette: 0.55, saturation: 0.9 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.035], highlights: [0.92, 0.95, 1.0], amount: 0.5 } }; },
  };
};
