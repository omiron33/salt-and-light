// The dawn world: the hills above the Sea of Galilee, from deep night to full morning. One terrain,
// one sea, one sky; only the time of day, the lamps, the weather and the camera change between scenes
// (s13-shore, s30-light2, s48-sun, s49-rain, s51-perfect).
// Units are kilometres. y is up, the sea's surface is y = 0, +x is north and +z is east, so the sun
// rises over the eastern ridge (the Golan escarpment) across the water from the western shore, where
// the mount stands. The shoreline is analytic (sines only), so JS can place lamps and cameras on it.
// Every frame is a pure function of uTime.

export const N_LAMPS = 64;

// ---- the shape of the lake and its shore (mirrored exactly in GLSL below) ----
export const LC = [0.0, 5.0], LR = [9.0, 4.2];
export const MOUNT = [-0.6, -0.35];
// GLSL-matching noise (glsl.js hash12 / vnoise / vnoised), so JS can stand lamps on the ground
const fract = (x) => x - Math.floor(x);
function hash12(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function vnoised(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  const k1 = b - a, k2 = c - a, k4 = a - b - c + d;
  return [a + k1 * ux + k2 * uy + k4 * ux * uy, dux * (k1 + k4 * uy), duy * (k2 + k4 * ux)];
}
const vnoise = (x, y) => vnoised(x, y)[0];
export function lakeD(x, z) {
  const qx = (x - LC[0]) / LR[0], qy = (z - LC[1]) / LR[1];
  const r = Math.hypot(qx, qy), a = Math.atan2(qx, qy);
  const rb = 1.0 + 0.06 * Math.sin(3 * a + 1) + 0.035 * Math.sin(7 * a + 2) + 0.018 * Math.sin(13 * a + 0.5);
  return (r - rb) * 4.2 + 0.07 * (vnoise(x * 3, z * 3) - 0.5) + 0.008 * (vnoise(x * 40, z * 40) - 0.5) + 0.003 * (vnoise(x * 230, z * 230) - 0.5);
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const eastW = (x, z) => { const qx = (x - LC[0]) / LR[0], qy = (z - LC[1]) / LR[1]; return sstep(-0.1, 0.7, qy / Math.max(Math.hypot(qx, qy), 1e-3)); };
// the smooth base height (no noise detail)
export function baseH(x, z) {
  const D = lakeD(x, z);
  if (D < 0) return -0.03 * (1 - Math.exp(D / 0.25)) - 0.0025 * (1 - Math.exp(D / 0.02));
  const w = eastW(x, z);
  const west = 0.2 * (1 - Math.exp(-D / 0.9)) + 0.05 * sstep(1.2, 4.0, D);
  const east = (0.40 + 0.06 * Math.sin(x * 1.3 + 1.0)) * sstep(0.0, 1.3, D) + 0.07 * sstep(1.3, 6.0, D);
  let h = west + (east - west) * w;
  const mx = x - MOUNT[0], mz = z - MOUNT[1];
  h += 0.11 * Math.exp(-(mx * mx + mz * mz) / 0.45) * sstep(0.0, 0.6, D);
  return h * sstep(0.0, 0.05, D);
}
function eroded(x, z, oct) {
  let qx = x * 0.9 + 13.1, qy = z * 0.9 + 7.7, a = 0, b = 1, dx = 0, dy = 0;
  for (let i = 0; i < oct; i++) {
    const n = vnoised(qx, qy);
    dx += n[1]; dy += n[2];
    a += b * n[0] / (1 + dx * dx + dy * dy);
    b *= 0.5;
    const nx = (0.8 * qx + 0.6 * qy) * 2, ny = (-0.6 * qx + 0.8 * qy) * 2; qx = nx; qy = ny;
  }
  return a;
}
function fieldIn(x, z, F) {
  const c = Math.cos(F[4]), s = Math.sin(F[4]);
  const px = x - F[0], pz = z - F[1];
  const qx = c * px + s * pz, qy = -s * px + c * pz;
  const e = Math.max(Math.abs(qx) - F[2], Math.abs(qy) - F[3]);
  return 1 - sstep(-0.004, 0, e);
}
function fieldEdge(x, z, b, x0, x1, h0, h1) {
  const wob = 0.014 * (vnoise(x * 21, z * 21) - 0.5) + 0.004 * (vnoise(x * 95, z * 95) - 0.5);
  const bend = 0.05 * (vnoise(z * 7, 1.3) - 0.5);
  return Math.max(Math.max(x0 + bend - x, x - x1 - bend * 0.7) + wob, Math.max(h0 - b, b - h1) / 0.05 + wob * 0.6 + 0.012 * (vnoise(x * 6 + 3, z * 6 + 3) - 0.5));
}
const hash11 = (p) => { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); };
function fieldsJS(x, z, b) {
  if (x < 0.28 || x > 1 || b < 0.13 || b > 0.19) return [0, 0, 0, 0];
  const ew = fieldEdge(x, z, b, 0.36, 0.647, 0.152, 0.171), et = fieldEdge(x, z, b, 0.659, 0.93, 0.146, 0.165);
  const e = Math.min(ew, et);
  if (e > 0.006) return [0, 0, 0, 0];
  let wi = 1 - sstep(-0.004, -0.0018, ew); const ti = 1 - sstep(-0.004, -0.0018, et), inside = Math.max(wi, ti);
  let wall = Math.exp(-(((e + 0.0011) / 0.0007) ** 2));
  const cx = (x + 0.025 * (vnoise(x * 9, z * 9) - 0.5)) / 0.083 + 0.37;
  const dw = (0.5 - Math.abs(fract(cx) - 0.5)) * 0.083;
  wall = Math.max(wall, Math.exp(-((dw / 0.0006) ** 2)) * sstep(-0.0025, -0.004, e));
  const u = b / 0.0028 + 0.4 * vnoise(x * 30, z * 30), fr = u - Math.floor(u);
  const terr = (sstep(0.86, 1, fr) - fr) * 0.0028 * inside;
  if (wi > 0 && hash11(Math.floor(cx) * 7.3) < 0.3) wi = 0;
  return [wi, ti, terr + wall * 0.0008, Math.max(wall, sstep(0.8, 0.88, fr) * inside)];
}
// the ground height without stones, crops or trees (as the shader's groundH)
export function groundH(x, z, oct = 7) {
  const b = baseH(x, z);
  let h = b;
  const D = lakeD(x, z), w = eastW(x, z);
  const amp = (0.055 + 0.085 * w) * sstep(0.02, 0.7, D);
  const f = fieldsJS(x, z, b);
  if (amp > 0) h += (eroded(x, z, oct) - 0.45) * amp * (1 - 0.9 * sstep(-0.2, 1, Math.max(f[0], f[1]) + f[3] * 0.5));
  return h + f[2];
}
// the z of the western shore at a given x (D = 0), by bisection
export function westShoreZ(x) {
  let a = -3, b = LC[1];
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lakeD(x, m) > 0) a = m; else b = m; }
  return (a + b) / 2;
}
// a point on the western side at distance D inland from the shore (along -z) at this x
export function inland(x, D) {
  let a = -6, b = westShoreZ(x);
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lakeD(x, m) > D) a = m; else b = m; }
  return (a + b) / 2;
}

// fields on the western slope below the mount: centre xz, half size (along, across), rotation
export const WHEAT = [0.52, -0.2, 0.115, 0.16, 0.08];
export const THORN = [0.78, -0.19, 0.115, 0.15, -0.06];

export const DAWN_UNIFORMS = {
  uSunDir: [-0.25, -0.2, 1.0], uSunCol: [0, 0, 0],
  uMoonDir: [-0.5, 0.55, -0.4], uMoonK: 0.0,
  uLamp: new Array(N_LAMPS * 4).fill(0).map((v, i) => (i % 4 === 3 ? 1e4 : 0)),
  uLampY: new Array(N_LAMPS).fill(-9),
  uLampI: 1.0, uLampR: 1.0,
  uSweep: [0, 1, 100], uSweepSoft: 0.15,
  uRain: 0.0, uBow: 0.0, uGold: 0.0, uFill: 1.0, uMist: 0.3, uCloud: 0.35, uStorm: 0.0, uWave: 1.0,
  uFocus: 1.0, uAper: 0.0, uTreeNear: 0.0, uProps: 0.0, uStalks: 0.0, uSwell: 0.0,
  uVMist: 0.0, uSlope: 0.0,
  uBoat: new Array(16).fill(0), uHouse: new Array(16).fill(0), uHouseY: [0, 0, 0, 0],
};

export const DAWN_GLSL = /* glsl */ `
uniform vec3 uSunDir, uSunCol, uMoonDir;
uniform float uMoonK;
uniform vec4 uLamp[${N_LAMPS}];     // xz, size, kindling time
uniform float uLampY[${N_LAMPS}];  // the ground height under each lamp
uniform float uLampI;              // lamp brightness overall (fades as day comes)
uniform float uLampR;              // lamp light reach on the ground
uniform vec3 uSweep;               // a travelling line of sunlight: direction xz, front position (km along it)
uniform float uSweepSoft;
uniform float uRain, uBow, uGold, uMist, uCloud, uStorm, uWave, uFill;
uniform float uFocus, uAper, uTreeNear, uProps, uStalks, uSwell;
uniform float uVMist;   // volumetric low mist lying on the water (s30); 0 = none
uniform float uSlope;   // a broken, scrubby hillside: relief, rocks, scrub and dry grass (s30); 0 = the plain slope
uniform vec4 uBoat[4];   // x, z (km), heading, length (m); length 0 = none
uniform vec4 uHouse[4];  // x, z (km), turn, width (m)
uniform float uHouseY[4];
#define NL ${N_LAMPS}
#define SUN normalize(uSunDir)
const vec2 LC = vec2(${LC[0].toFixed(3)}, ${LC[1].toFixed(3)});
const vec2 LR = vec2(${LR[0].toFixed(3)}, ${LR[1].toFixed(3)});
const vec2 MOUNT = vec2(${MOUNT[0].toFixed(3)}, ${MOUNT[1].toFixed(3)});
const vec3 LAMPC = vec3(1.0, 0.52, 0.2);

float lakeD(vec2 p) {
  vec2 q = (p - LC) / LR;
  float r = length(q), a = atan(q.x, q.y);
  float rb = 1.0 + 0.06 * sin(3.0 * a + 1.0) + 0.035 * sin(7.0 * a + 2.0) + 0.018 * sin(13.0 * a + 0.5);
  float D = (r - rb) * 4.2 + 0.07 * (vnoise(p * 3.0) - 0.5);
  float w = smoothstep(0.04, 0.025, abs(D));
  if (w <= 0.0) return D;
  return D + w * (0.008 * (vnoise(p * 40.0) - 0.5) + 0.003 * (vnoise(p * 230.0) - 0.5));
}
float eastW(vec2 p) { vec2 q = (p - LC) / LR; return smoothstep(-0.1, 0.7, q.y / max(length(q), 1e-3)); }
float baseH(vec2 p, out float D) {
  D = lakeD(p);
  if (D < 0.0) return -0.03 * (1.0 - exp(D / 0.25)) - 0.0025 * (1.0 - exp(D / 0.02));
  float w = eastW(p);
  float west = 0.2 * (1.0 - exp(-D / 0.9)) + 0.05 * smoothstep(1.2, 4.0, D);
  float east = (0.40 + 0.06 * sin(p.x * 1.3 + 1.0)) * smoothstep(0.0, 1.3, D) + 0.07 * smoothstep(1.3, 6.0, D);
  float h = mix(west, east, w);
  vec2 m = p - MOUNT; h += 0.11 * exp(-dot(m, m) / 0.45) * smoothstep(0.0, 0.6, D);
  return h * smoothstep(0.0, 0.05, D);
}
// erosion-style detail (after Genesis 8's Ararat)
float eroded(vec2 p, int oct) {
  vec2 q = p * 0.9 + vec2(13.1, 7.7);
  float a = 0.0, b = 1.0; vec2 d = vec2(0);
  for (int i = 0; i < 12; i++) {
    if (i >= oct) break;
    vec3 n = vnoised(q);
    d += n.yz;
    a += b * n.x / (1.0 + dot(d, d));
    b *= 0.5; q = M2 * q * 2.0;
  }
  return a;
}
// The two fields: hand-worked plots laid along the contours of the slope (bounded by a range of x and
// by two contour heights of the smooth hill), terraced, and edged by low dry-stone walls.
const float TERR = 0.0028;     // the rise of one terrace (km)
float fieldEdge(vec2 p, float b, float x0, float x1, float h0, float h1) {
  float wob = 0.014 * (vnoise(p * 21.0) - 0.5) + 0.004 * (vnoise(p * 95.0) - 0.5);
  float bend = 0.05 * (vnoise(vec2(p.y * 7.0, 1.3)) - 0.5);          // the side walls wander down the slope
  float ex = max(x0 + bend - p.x, p.x - x1 - bend * 0.7) + wob;
  float eh = max(h0 - b, b - h1) / 0.05 + wob * 0.6 + 0.012 * (vnoise(p * 6.0 + 3.0) - 0.5);
  return max(ex, eh);                                   // km; negative inside
}
// x: wheat, y: thorns (inside 0..1), z: wall and terrace height (km), w: stone (0..1, wall or riser)
vec4 fields(vec2 p, float b) {
  if (p.x < 0.28 || p.x > 1.0 || b < 0.13 || b > 0.19) return vec4(0);
  // a cheap bound before the wobbly edges
  float raw = min(max(max(0.36 - p.x, p.x - 0.647), max(0.152 - b, b - 0.171) / 0.05), max(max(0.659 - p.x, p.x - 0.93), max(0.146 - b, b - 0.165) / 0.05));
  if (raw > 0.05) return vec4(0);
  float ew = fieldEdge(p, b, 0.36, 0.647, 0.152, 0.171);
  float et = fieldEdge(p, b, 0.659, 0.93, 0.146, 0.165);
  float e = min(ew, et);
  if (e > 0.006) return vec4(0);
  float wi = 1.0 - smoothstep(-0.004, -0.0018, ew), ti = 1.0 - smoothstep(-0.004, -0.0018, et);
  float inside = max(wi, ti);
  // the perimeter wall: about 0.8 m high and 1.5 m thick, uneven stones
  float wall = exp(-pow((e + 0.0011) / 0.0007, 2.0));
  // cross walls split each field into a few plots of uneven width
  float cx = (p.x + 0.025 * (vnoise(p * 9.0) - 0.5)) / 0.083 + 0.37;
  float dw = (0.5 - abs(fract(cx) - 0.5)) * 0.083;
  wall = max(wall, exp(-pow(dw / 0.0006, 2.0)) * smoothstep(-0.0025, -0.004, e));
  // terraces: level treads and a short steep stone riser
  float u = b / TERR + 0.4 * vnoise(p * 30.0), fr = fract(u);
  float terr = (smoothstep(0.86, 1.0, fr) - fr) * TERR * inside;
  float riser = smoothstep(0.8, 0.88, fr) * inside;
  float stones = 0.7 + 0.45 * vnoise(p * 2600.0) + 0.15 * vnoise(p * 9000.0);
  // one wheat plot in three lies fallow this year: stubble and bare earth
  float plot = hash11(floor(cx) * 7.3);
  if (wi > 0.0 && plot < 0.3) wi *= 0.0;
  return vec4(wi, ti, terr + wall * 0.0008 * stones, max(wall, riser));
}
float fieldMask(vec2 p) { float D; float b = baseH(p, D); vec4 f = fields(p, b); return max(f.x, f.y); }

// the broken hillside (s30): spurs and gullies running down the slope, swales and hummocks (km).
// Zero where uSlope is 0, so the other scenes keep their ground exactly.
float slopeRelief(vec2 p, float D) {
  if (uSlope <= 0.0 || D < 0.03) return 0.0;
  float land = smoothstep(0.03, 0.15, D);
  // ridged noise stretched down the fall line (+z), so the gullies run toward the water
  float g = 1.0 - abs(vnoise(vec2(p.x * 26.0, p.y * 9.0) + vec2(3.1, 7.4)) * 2.0 - 1.0);
  float g2 = 1.0 - abs(vnoise(vec2(p.x * 70.0, p.y * 30.0) + vec2(9.7, 1.3)) * 2.0 - 1.0);
  float r = (g - 0.62) * 0.0042 + (g2 - 0.62) * 0.0013;
  r += (vnoise(p * 90.0 + 4.0) - 0.5) * 0.0014;     // swales
  r += (vnoise(p * 330.0) - 0.5) * 0.0005;           // hummocks
  return r * land * uSlope;
}

// the small things of the slope near the camera: basalt boulders and scrub in the grass, and in the
// thorn field tangled thorn clumps among rocks. Returns height (km); kind 1 rock, 2 scrub, 3 thorn
float features(vec2 p, float D, vec4 f, out float kind) {
  kind = 0.0;
  float h = 0.0;
  if (D < 0.02) return 0.0;
  // boulders: cells of 7 m
  { vec2 c = floor(p / 0.007); float r = hash12(c + 1.7);
    float clus = uSlope > 0.0 ? smoothstep(0.45, 0.8, vnoise(p * 38.0 + 5.0) * 0.7 + vnoise(p * 150.0) * 0.3) : 0.0;   // outcrops
    float pr = (0.12 + 0.25 * f.y) * (1.0 - f.x) + uSlope * (0.03 + 0.5 * clus);
    if (r < pr) {
      vec2 o = (hash22(c + 4.1) * 0.6 + 0.2) * 0.007;
      float rad = 0.0005 + 0.0008 * hash11(r * 31.0) + uSlope * 0.0009 * clus * hash11(r * 57.0);
      vec2 q = (p - c * 0.007 - o) / rad;
      if (uSlope > 0.0) q += (vec2(vnoise(p * 2600.0 + r * 9.0), vnoise(p * 2600.0 + 5.0)) - 0.5) * 0.7 * uSlope;   // broken, angular outlines
      float d2 = dot(q, q) * (1.0 + 0.25 * sin(atan(q.y, q.x) * 3.0 + r * 20.0));
      if (d2 < 1.0) { float bh = rad * 0.75 * pow(1.0 - d2, 0.6) * (0.9 + 0.2 * vnoise(p * 6000.0)) * (1.0 - uSlope * 0.35 * (1.0 - vnoise(p * 9000.0 + r * 3.0))); if (bh > h) { h = bh; kind = 1.0; } }
    } }
  // scrub (and thorn clumps inside the thorn field): cells of 4.5 m
  { vec2 c = floor(p / 0.0045); float r = hash12(c + 9.3);
    float pr = mix(0.08 * smoothstep(0.35, 0.7, vnoise(p * 30.0)), 0.75, f.y) * (1.0 - f.x);
    pr += uSlope * (0.015 + 0.55 * smoothstep(0.5, 0.8, vnoise(p * 24.0 + 7.0) * 0.7 + vnoise(p * 110.0 + 2.0) * 0.3));
    if (r < pr) {
      vec2 o = (hash22(c + 2.9) * 0.5 + 0.25) * 0.0045;
      float rad = (0.0008 + 0.0008 * hash11(r * 17.0)) * (1.0 + 0.4 * f.y);
      vec2 q = (p - c * 0.0045 - o) / rad;
      if (uSlope > 0.0) q = q * (1.0 + 0.4 * uSlope) + (vec2(vnoise(p * 5200.0 + r * 7.0), vnoise(p * 5200.0 + 3.0)) - 0.5) * 1.1 * uSlope;   // ragged bushes
      float d2 = dot(q, q);
      if (d2 < 1.0) {
        float tangle = 0.25 + 0.75 * smoothstep(0.25, 0.75, vnoise(p * 7000.0 + r * 50.0) * 0.55 + vnoise(p * 21000.0) * 0.45);
        float bh = rad * 0.75 * pow(1.0 - d2, 0.7) * tangle;
        if (bh > h) { h = bh; kind = f.y > 0.5 ? 3.0 : 2.0; }
      }
    } }
  return h;
}

float groundH(vec2 p, int oct, out float D) {
  float b = baseH(p, D);
  float h = b;
  float w = eastW(p);
  float land = smoothstep(0.02, 0.7, D);
  float amp = (0.055 + 0.085 * w) * land;
  vec4 f = fields(p, b);
  float infield = max(f.x, f.y);
  if (amp > 0.0) {
    float e = eroded(p, oct);
    // the worked ground is smoothed flat, so the plots follow the hill's contours
    h += (e - 0.45) * amp * (1.0 - 0.9 * smoothstep(-0.2, 1.0, infield + f.w * 0.5));
  }
  h += f.z;
  h += slopeRelief(p, D);
  // the wheat stands about a metre, rolling in the wind
  if (f.x > 0.0) {
    float wv = sin(dot(p, vec2(0.6, 0.8)) * 500.0 - uTime * 2.2 + 6.0 * vnoise(p * 30.0)) * (0.4 + 0.6 * vnoise(p * 90.0 - uTime * 0.3));
    h += f.x * f.x * (0.0008 + 0.00003 * wv + 0.00006 * vnoise(p * 3000.0 + uTime * vec2(1.5, 0.4)));
  }
  if (oct > 6) { float k; h += features(p, D, f, k); }
  // pebbles and small relief along the shore and underwater shelf
  if (oct > 6 && D > -0.008 && D < 0.016) {
    vec2 q = p * 2600.0; vec2 c = floor(q); vec2 fq = fract(q) - 0.5 - (hash22(c) - 0.5) * 0.5;
    float hs = hash12(c + 3.3);
    float rr = 0.08 + 0.12 * hs;
    float st = sqrt(max(0.0, rr - dot(fq, fq))) * step(0.45, hs);
    h += (0.00022 * st + 0.00008 * (vnoise(p * 900.0) - 0.5)) * smoothstep(-0.006, 0.002, D) * smoothstep(0.014, 0.004, D);
  }
  return h;
}

// ---- olive trees ----
// One possible tree per 22 m cell, in groves. Far away a tree is a lumpy crown in the heightfield; near
// the camera (within uTreeNear) it is a true 3D tree with a gnarled trunk and an airy silver crown.
const float CS = 0.022;
bool treeCell(vec2 c, out vec2 ctr, out float r, out float seed) {
  vec2 pc = (c + 0.5) * CS;
  float grove = smoothstep(0.64, 0.8, vnoise(pc * 4.0 + 5.0) * 0.7 + vnoise(pc * 13.0) * 0.3) * (1.0 - eastW(pc) * 0.7);
  seed = hash12(c * 1.37 + 3.1);
  if (seed > grove * 0.45) return false;
  ctr = c * CS + (hash22(c + 7.7) * 0.5 + 0.25) * CS;
  r = CS * (0.12 + 0.1 * hash11(seed * 91.0));
  float D = lakeD(ctr);
  if (D < 0.06) return false;
  // none in the walled plots (a cheap box round them)
  if (ctr.x > 0.31 && ctr.x < 0.97 && ctr.y > -0.6 && ctr.y < -0.03) return false;
  return true;
}
float treeH(vec2 p, float D, out float tid) {
  tid = 0.0;
  if (D < 0.06) return 0.0;
  vec2 c = floor(p / CS);
  vec2 ctr; float r, seed;
  if (!treeCell(c, ctr, r, seed)) return 0.0;
  if (uTreeNear > 0.0 && length(ctr - uCamPos.xz) < uTreeNear) return 0.0;
  vec2 q = p - ctr;
  float ang = atan(q.y, q.x);
  float rr = r * (0.78 + 0.22 * sin(ang * 3.0 + seed * 40.0) + 0.12 * sin(ang * 7.0 + seed * 17.0));
  float d = length(q) / rr;
  if (d > 1.0) return 0.0;
  tid = 1.0;
  // the crown stands on a short trunk: a dome lifted off the ground, lumpy and broken
  float dome = sqrt(1.0 - d * d);
  return r * (0.35 + 0.85 * dome) * (0.75 + 0.4 * vnoise(p * 1400.0 + seed * 9.0)) * smoothstep(1.0, 0.85, d);
}
float terrainAll(vec2 p, int oct, out float D, out float tid) {
  float g = groundH(p, oct, D);
  float tr = treeH(p, D, tid);
  if (tr > 0.0) return g + tr;
  tid = 0.0;
  return g;
}
float terrainMarch(vec3 p, int oct, out float D, out float tid) {
  float g = groundH(p.xz, oct, D);
  tid = 0.0;
  if (p.y - g > 0.012) return g;
  float tr = treeH(p.xz, D, tid);
  if (tr > 0.0) return g + tr;
  tid = 0.0;
  return g;
}
float terrainLo(vec2 p, int oct) { float D; return groundH(p, oct, D); }

float marchLand(vec3 ro, vec3 rd, float tmax, int steps, int oct) {
  float t = 0.0005;
  float D, tid, h = 1.0;
  for (int i = 0; i < 400; i++) {
    if (i >= steps) break;
    vec3 p = ro + rd * t;
    // well above the smooth hills: step on the cheap bound (detail and trees stay under 70 m)
    float hb = p.y - baseH(p.xz, D) - 0.1;
    // over open water no land can be nearer than the shore
    if (D < -0.01 && p.y > -0.001) hb = max(hb, -D * 0.85);
    float k = 0.8;
    if (hb > 0.002) h = hb;
    else {
      int o = max(3, oct - int(clamp(log2(t / 0.04), 0.0, 5.0)));
      // first an upper bound from the eroded hill alone (crops, walls, stones and trees stay under 9 m)
      float b0 = hb + 0.1;   // p.y - baseH
      float amp = (0.055 + 0.085 * eastW(p.xz)) * smoothstep(0.02, 0.7, D);
      float hu = b0 - max((eroded(p.xz, min(o, 6)) - 0.45) * amp, 0.0) - 0.0095 - 0.012 * amp;
      if (hu > 0.0004 + 0.0004 * t) { h = hu; k = 0.9; }
      else {
        h = p.y - terrainMarch(p, o, D, tid);
        if (h < (uSlope > 0.0 ? 0.00015 : 0.0005) * t + 0.00002) return t;
        k = 0.7;
      }
    }
    t += max(h * k, 0.00008 + 0.0008 * t + 0.003 * max(t - 1.0, 0.0));
    if (t > tmax || (p.y > 0.7 && rd.y > 0.0)) return -1.0;
  }
  // out of steps while still skimming the ground: count it as a hit
  // (s30) a ray that ran out of steps skimming over the shore toward the water is not a hit
  return h < (uSlope > 0.0 ? 0.0003 : 0.03 * t) && t < tmax ? t : -1.0;
}
vec3 landNormal(vec2 p, float t, out float tid, int omax) {
  float e = max(0.00012, 0.0007 * t);
  float D, tt;
  int o = min(omax, 10 - int(clamp(log2(t / 0.05), 0.0, 6.0)));
  float h = terrainAll(p, o, D, tid);
  return normalize(vec3(h - terrainAll(p + vec2(e, 0), o, D, tt), e, h - terrainAll(p + vec2(0, e), o, D, tt)));
}
float sunShadow(vec3 ro) {
  vec3 L = SUN;
  if (L.y < -0.03) return 0.0;
  ro.y = max(ro.y, terrainLo(ro.xz, 5)) + 0.0008;
  float res = 1.0, t = 0.002;
  for (int i = 0; i < 26; i++) {
    vec3 p = ro + L * t;
    float h = p.y - terrainLo(p.xz, 4);
    res = min(res, 24.0 * h / t);
    t += clamp(h * 0.8, 0.006 + 0.04 * t, 0.8);
    if (res < -0.2 || p.y > 0.7) break;
  }
  return smoothstep(-0.05, 1.0, res);
}
// the travelling line of first light, layered on the real shadow of the ridge
float sweep(vec3 p) { float f = uSweep.z - dot(p.xz, normalize(uSweep.xy)) + 0.08 * (vnoise(p.xz * 6.0) - 0.5) + 0.6 * p.y; return smoothstep(-uSweepSoft, uSweepSoft, f); }

// shadows of the rain clouds drifting over the land (only in stormy weather)
float cloudShade(vec3 p) {
  if (uStorm <= 0.0) return 1.0;
  vec2 q = (p.xz + SUN.xz / max(SUN.y, 0.05) * (2.6 - p.y)) * 0.22 + vec2(uTime * 0.004, uTime * 0.002);
  float n = fbm(q * 1.0, 4);
  return mix(1.0, smoothstep(0.66, 0.5, n), uStorm * 0.35);
}
// ---- sky ----
vec3 skyBase(vec3 rd, float sunK) {
  float se = SUN.y;
  float mu = dot(rd, SUN);
  float day = smoothstep(-0.16, 0.18, se);
  float blue = smoothstep(-0.2, -0.08, se) * (1.0 - smoothstep(0.02, 0.2, se));     // the blue hour
  float y = max(rd.y, 0.0);
  vec3 zenN = vec3(0.0045, 0.006, 0.012), horN = vec3(0.009, 0.0105, 0.017);
  vec3 zenD = vec3(0.07, 0.16, 0.42), horD = vec3(0.55, 0.52, 0.5);
  vec3 zen = mix(zenN, zenD, day) + vec3(0.004, 0.02, 0.08) * blue;
  vec3 hor = mix(horN, horD, day) + vec3(0.02, 0.035, 0.09) * blue;
  vec3 c = mix(hor, zen, 1.0 - exp(-y * 3.5));
  // dawn glow along the horizon toward the sun
  float tw = smoothstep(-0.22, -0.04, se) * (1.0 - smoothstep(0.06, 0.35, se) * 0.6);
  float az = max(mu * 0.5 + 0.5, 0.0);
  float toward = pow(az, 6.0);
  vec3 glowC = mix(vec3(1.0, 0.3, 0.07), vec3(1.0, 0.58, 0.24), smoothstep(-0.1, 0.05, se));
  c += glowC * tw * toward * exp(-y * mix(26.0, 6.0, day)) * mix(1.1, 2.0, day);
  c += vec3(1.0, 0.42, 0.16) * tw * pow(az, 3.0) * exp(-y * mix(9.0, 4.0, day)) * mix(0.1, 0.4, day);
  c += vec3(0.25, 0.12, 0.2) * tw * exp(-y * 3.0) * 0.06 * (1.0 - toward);
  // the sun and the bright air around it
  float sv = smoothstep(-0.05, 0.0, se) * sunK;
  c += uSunCol * 0.012 * pow(max(mu, 0.0), 12.0) * sv + uSunCol * 0.05 * pow(max(mu, 0.0), 200.0) * sv + uSunCol * 0.25 * pow(max(mu, 0.0), 4000.0) * sv;
  c += uSunCol * 14.0 * smoothstep(0.99985, 0.99993, mu) * sv;
  return c * (1.0 + uGold * vec3(0.5, 0.25, -0.15));
}
vec3 stars(vec3 rd) {
  if (rd.y < 0.0) return vec3(0);
  vec2 uv = vec2(atan(rd.x, rd.z), asin(rd.y)) * 57.3 * 4.0;
  vec2 id = floor(uv);
  float h = hash12(id);
  if (h < 0.93) return vec3(0);
  vec2 f = fract(uv) - 0.5 - (hash22(id * 1.7) - 0.5) * 0.7;
  float b = pow(hash11(h * 71.0), 6.0) * 1.4 + 0.03;
  float tw = 0.75 + 0.25 * sin(uTime * (3.0 + 5.0 * hash11(h * 13.0)) + h * 40.0);
  vec3 tint = mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), hash11(h * 7.0));
  return tint * b * tw * exp(-dot(f, f) * 160.0) * smoothstep(0.0, 0.12, rd.y);
}
// a thin deck of high cloud, lit from below at dawn
vec4 cloudLayer(vec3 ro, vec3 rd) {
  if (rd.y <= 0.004 || uCloud <= 0.0) return vec4(0, 0, 0, 1);
  float t = (2.6 - ro.y) / rd.y;
  vec2 q = (ro.xz + rd.xz * t) * 0.22 + vec2(uTime * 0.004, uTime * 0.002);
  float n = fbm(q, 5) + 0.25 * (fbm(q * 3.0 + 4.0, 3) - 0.5);
  float cov = smoothstep(0.62 - 0.35 * uCloud, 0.95 - 0.3 * uCloud, n);
  cov *= smoothstep(0.004, 0.08, rd.y);
  float se = SUN.y;
  float mu = dot(rd, SUN);
  float day = smoothstep(-0.16, 0.18, se);
  vec3 dark = mix(vec3(0.004, 0.005, 0.01), vec3(0.22, 0.24, 0.3), day) * (1.0 - 0.75 * uStorm);
  float under = smoothstep(-0.16, 0.0, se) * (1.0 - smoothstep(0.1, 0.4, se) * 0.5);
  vec3 lit = mix(vec3(1.0, 0.3, 0.16), vec3(1.0, 0.62, 0.32), smoothstep(-0.12, 0.06, se)) * under * (0.06 + 1.6 * pow(max(mu * 0.5 + 0.5, 0.0), 6.0));
  lit += vec3(0.9, 0.85, 0.8) * smoothstep(0.05, 0.3, se) * 0.6;
  float thin = smoothstep(0.0, 0.35, cov);
  vec3 c = mix(dark, dark + lit * (1.0 - 0.85 * uStorm), 1.0 - 0.5 * thin * (fbm(q * 2.0 + 9.0, 3)));
  c += vec3(0.03, 0.035, 0.05) * uMoonK * 0.6;
  return vec4(c * cov, 1.0 - cov * mix(0.92, 1.0, uStorm));
}
vec3 sky(vec3 ro, vec3 rd) {
  vec3 c = skyBase(rd, 1.0);
  c += stars(rd) * (1.0 - smoothstep(-0.2, -0.06, SUN.y)) * 0.06;
  // the moon (a small disc and its halo) when it is up and meant to be seen
  vec3 M = normalize(uMoonDir);
  float mm = dot(rd, M);
  c += vec3(0.6, 0.65, 0.75) * uMoonK * (smoothstep(0.99996, 0.99998, mm) * 3.0 + pow(max(mm, 0.0), 300.0) * 0.02 + pow(max(mm, 0.0), 20.0) * 0.004);
  // a rain sky: heavy grey-blue cloud low over the land away from the sun
  c = mix(c, vec3(0.035, 0.04, 0.05) * (0.7 + 0.5 * smoothstep(0.0, 0.5, rd.y)) * (1.0 + 2.0 * pow(max(dot(rd, SUN), 0.0), 4.0)), min(1.0, uStorm * 1.25));
  vec4 cl = cloudLayer(ro, rd);
  return c * cl.a + cl.rgb;
}
vec3 ambientSky(vec3 n) {
  float se = SUN.y;
  float day = smoothstep(-0.16, 0.18, se);
  float blue = smoothstep(-0.2, -0.08, se) * (1.0 - smoothstep(0.02, 0.2, se));
  vec3 up = mix(vec3(0.008, 0.011, 0.02), vec3(0.18, 0.26, 0.42), day) + vec3(0.03, 0.06, 0.15) * blue;
  up += vec3(0.02, 0.025, 0.04) * uMoonK;
  // the warm low sky at dawn lights the land too
  float tw = smoothstep(-0.2, -0.04, se) * (1.0 - smoothstep(0.1, 0.4, se));
  up += vec3(0.06, 0.03, 0.012) * tw;
  vec3 dn = up * 0.25 + vec3(0.02, 0.012, 0.006) * day;
  return mix(dn, up, n.y * 0.5 + 0.5) * (1.0 + uGold * vec3(0.9, 0.6, 0.25));
}

// ---- lamps ----
vec3 LP[NL];
float LK[NL];
float lampLit(int i) { float x = uTime - uLamp[i].w; return x < 0.0 ? 0.0 : 1.0 - exp(-x * 7.0) * cos(x * 11.0) * 0.85; }
float lampFlare(int i) { float x = uTime - uLamp[i].w; return x < 0.0 ? 0.0 : exp(-x * 4.0) * smoothstep(0.0, 0.05, x); }
void setupLamps() {
  for (int i = 0; i < NL; i++) {
    LK[i] = 0.0; LP[i] = vec3(0, -9, 0);
    if (uLamp[i].w > 9000.0) continue;
    float k = lampLit(i) + 2.0 * lampFlare(i);
    float fl = 0.82 + 0.18 * vnoise(vec2(uTime * 9.0, float(i) * 17.0)) + 0.08 * sin(uTime * 23.0 + float(i));
    LK[i] = k * fl * uLamp[i].z * uLampI;
    LP[i] = vec3(uLamp[i].x, uLampY[i] + 0.0012, uLamp[i].y);
    if (uSlope > 0.0) LP[i].y += slopeRelief(uLamp[i].xy, lakeD(uLamp[i].xy));
  }
}
// light the ground from the lamps (metres for the falloff)
vec3 lampLight(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, out vec3 spec) {
  vec3 dif = vec3(0); spec = vec3(0);
  float a2 = pow(max(0.05, rough * rough), 2.0);
  for (int i = 0; i < NL; i++) {
    if (LK[i] <= 0.0) continue;
    vec3 L = LP[i] - p; float dm = length(L) * 1000.0 / uLampR;
    if (dm > 120.0 * uLampR) continue;
    L = normalize(L);
    float nl = sat(dot(n, L) * 0.8 + 0.2);
    vec3 lc = LAMPC * LK[i] * 40.0 * uLampR / (1.0 + dm * dm * 0.35);
    dif += lc * nl;
    vec3 h = normalize(L + v); float nh = sat(dot(n, h));
    float dd = nh * nh * (a2 - 1.0) + 1.0;
    spec += lc * nl * a2 / (PI * dd * dd) * 0.04;
  }
  return dif * alb / PI;
}

// the 3D olive tree, in metres about its foot
float oliveSDF(vec3 q, float R, float seed, out float part) {
  part = 2.0;
  float bound = length(q - vec3(0, 1.6 + 0.6 * R, 0)) - (1.15 * R + 1.6);
  if (bound > 0.5) return bound;
  float s1 = hash11(seed * 13.0), s2 = hash11(seed * 29.0), s3 = hash11(seed * 47.0);
  float tw = q.y * (0.5 + 0.4 * s1);
  vec2 xz = rot(tw) * q.xz;
  vec3 qt = vec3(xz.x, q.y, xz.y);
  vec3 top = vec3((s1 - 0.5) * 0.9, 1.4 + 0.5 * s2, (s2 - 0.5) * 0.9);
  // a short, thick, twisted trunk, split and gnarled
  float dT = sdRoundCone(qt, vec3(0, -0.4, 0), top, 0.42 + 0.1 * s3, 0.26);
  dT = min(dT, sdRoundCone(qt, vec3(0.15, -0.4, 0.1), top + vec3(0.3, -0.2, -0.2), 0.3, 0.18));
  dT -= 0.07 * vnoise(q * 3.1 + seed * 7.0) + 0.04 * vnoise(q * 9.0);
  // boughs out to the crown
  vec3 C = vec3(0, 1.9 + 0.62 * R, 0);
  for (int i = 0; i < 3; i++) {
    float a = 6.2832 * (float(i) / 3.0 + s3);
    vec3 e = C + vec3(cos(a), 0.15 * float(i) - 0.2, sin(a)) * R * 0.48;
    dT = min(dT, sdRoundCone(q, top, e, 0.2, 0.07));
  }
  // the crown: a few loose masses of small leaves, open to the sky
  float dC = 1e9;
  for (int i = 0; i < 5; i++) {
    float a = 6.2832 * (float(i) / 5.0 + s1) ;
    vec3 o = vec3(cos(a) * 0.5, (hash11(seed * 3.0 + float(i)) - 0.4) * 0.5, sin(a) * 0.5) * R;
    dC = min(dC, sdEllipsoid(q - C - o, vec3(0.55, 0.36, 0.55) * R));
  }
  float n = vnoise(q * 1.1 + seed * 11.0) * 0.45 + vnoise(q * 4.0 + seed) * 0.35 + vnoise(q * 11.0) * 0.2;
  dC += (0.56 - n) * 1.6;
  part = dT < dC ? 1.0 : 2.0;
  return min(dT, dC);
}
float marchTrees(vec3 ro, vec3 rd, float tmax, out vec3 tbase, out float tR, out float tSeed) {
  if (uTreeNear <= 0.0 || rd.y > 0.25) return -1.0;
  float t = 0.0;
  vec2 lastC = vec2(1e9);
  bool has = false; vec2 ctr; float r = 0.0, seed = 0.0, gy = 0.0;
  for (int i = 0; i < 90; i++) {
    if (t > tmax) break;
    vec3 p = ro + rd * t;
    vec2 c = floor(p.xz / CS);
    if (c != lastC) {
      lastC = c;
      has = treeCell(c, ctr, r, seed) && length(ctr - uCamPos.xz) < uTreeNear;
      if (has) gy = terrainLo(ctr, 6) - 0.0003;
    }
    vec2 cmin = c * CS, cmax = cmin + CS;
    float ex = rd.x > 1e-6 ? (cmax.x - p.x) / rd.x : rd.x < -1e-6 ? (cmin.x - p.x) / rd.x : 1e9;
    float ez = rd.z > 1e-6 ? (cmax.y - p.z) / rd.z : rd.z < -1e-6 ? (cmin.y - p.z) / rd.z : 1e9;
    float d = min(ex, ez) + 0.00002;
    if (has) {
      float R = r * 1000.0;
      vec3 q = (p - vec3(ctr.x, gy, ctr.y)) * 1000.0;
      float part;
      float ds = oliveSDF(q, R, seed, part) / 1000.0;
      if (ds < 0.00002 + 0.00002 * t * 10.0) { tbase = vec3(ctr.x, gy, ctr.y); tR = R; tSeed = seed; return t; }
      d = min(d, max(ds * 0.6, 0.00001));
    }
    t += d;
  }
  return -1.0;
}
vec3 shadeTree(vec3 ro, vec3 rd, float t, vec3 base, float R, float seed) {
  vec3 p = ro + rd * t;
  vec3 q = (p - base) * 1000.0;
  float part, pp;
  const vec2 e = vec2(0.04, -0.04);
  vec3 n = normalize(e.xyy * oliveSDF(q + e.xyy, R, seed, pp) + e.yyx * oliveSDF(q + e.yyx, R, seed, pp) + e.yxy * oliveSDF(q + e.yxy, R, seed, pp) + e.xxx * oliveSDF(q + e.xxx, R, seed, pp));
  oliveSDF(q, R, seed, part);
  vec3 alb; float trans;
  float cy = (q.y - 1.9) / (1.3 * R);                         // 0 at the crown's foot .. 1 at its top
  if (part < 1.5) {
    // grey, furrowed bark
    float furrow = abs(sin(atan(q.z, q.x) * 9.0 + q.y * 2.0 + 3.0 * vnoise(q * 2.0)));
    alb = vec3(0.17, 0.15, 0.13) * (0.55 + 0.45 * furrow) * (0.8 + 0.4 * vnoise(q * 12.0));
    trans = 0.0;
  } else {
    // olive leaves: dull grey-green above, silver beneath, glinting as the wind turns them
    float flip = vnoise(q * 16.0 + vec3(uTime * 2.5, 0, uTime * 1.5)) * 0.6 + vnoise(q * 40.0) * 0.4;
    alb = mix(vec3(0.07, 0.085, 0.055), vec3(0.3, 0.33, 0.3), smoothstep(0.4, 0.8, flip));
    trans = 0.1;
  }
  float sh = sunShadow(p + vec3(0, 0.002, 0)) * sweep(p) * cloudShade(p);
  float self = part < 1.5 ? 0.35 : sat(0.3 + 0.8 * cy);
  vec3 col = alb * uSunCol * (sat(dot(n, SUN)) * 0.8 + 0.2) * sh * self / PI;
  col += alb * uSunCol * trans * sh * pow(sat(dot(rd, SUN)), 4.0) * 0.8;
  col += alb * ambientSky(n) * (0.4 + 0.5 * self) * mix(1.0, uFill, exp(-t / 0.8));
  col += alb * vec3(0.5, 0.6, 0.85) * 0.12 * uMoonK * sat(dot(n, normalize(uMoonDir)));
  vec3 sp; col += lampLight(p, n, -rd, alb, 0.8, sp);
  return col;
}

// ---- materials ----
vec3 landAlbedo(vec3 p, vec3 n, float D, float tid, out float rough) {
  rough = 0.9;
  float w = eastW(p.xz);
  float slope = 1.0 - n.y;
  // spring grass, gold-green, with dry tawny patches; basalt on the steep slopes
  float g = fbm(p.xz * 18.0, 4);
  vec3 grass = mix(vec3(0.13, 0.15, 0.06), vec3(0.28, 0.24, 0.12), smoothstep(0.3, 0.75, g));
  grass *= (0.8 + 0.4 * vnoise(p.xz * 320.0)) * (0.8 + 0.4 * vnoise(p.xz * 2500.0)) * (0.7 + 0.6 * vnoise(p.xz * vec2(14000.0, 9000.0))) * (0.75 + 0.5 * hash12(floor(p.xz * 30000.0)));
  vec3 rock = vec3(0.07, 0.065, 0.06) * (0.7 + 0.6 * vnoise(p.xz * 600.0));
  vec3 a = mix(grass, rock, smoothstep(0.25, 0.55, slope + 0.25 * (g - 0.5)) * (0.5 + 0.5 * w));
  // the dark basalt tableland above the eastern escarpment
  a *= 1.0 - 0.8 * w * smoothstep(0.75, 0.95, n.y) * smoothstep(0.25, 0.35, p.y);
  // basalt boulders scattered in the grass
  float bo = smoothstep(0.7, 0.9, vnoise(p.xz * 1400.0)) * smoothstep(0.4, 0.8, vnoise(p.xz * 90.0));
  a = mix(a, vec3(0.06, 0.055, 0.05), bo * 0.35);
  if (uSlope > 0.0 && D > 0.02) {
    // a dry hillside in patches: tawny grass and green, bare earth and pale limestone, darker swales
    float m1 = vnoise(p.xz * 40.0 + 2.0) * 0.55 + vnoise(p.xz * 150.0) * 0.3 + vnoise(p.xz * 600.0) * 0.15;
    float bare = smoothstep(0.6, 0.78, vnoise(p.xz * 85.0 + 11.0) * 0.65 + vnoise(p.xz * 520.0) * 0.35);
    vec3 g2 = mix(vec3(0.075, 0.09, 0.045), vec3(0.25, 0.2, 0.12), smoothstep(0.32, 0.68, m1));
    g2 *= (0.75 + 0.5 * vnoise(p.xz * 1800.0)) * (0.8 + 0.4 * hash12(floor(p.xz * 20000.0)));
    vec3 earth = mix(vec3(0.17, 0.14, 0.11), vec3(0.24, 0.22, 0.19), smoothstep(0.5, 0.8, vnoise(p.xz * 260.0))) * (0.75 + 0.5 * vnoise(p.xz * 4000.0));
    g2 = mix(g2, earth, bare * 0.85);
    g2 *= 0.7 + 0.3 * smoothstep(-0.25, 0.4, n.y - 0.8 + 0.6 * (vnoise(p.xz * 60.0) - 0.5));
    a = mix(a, g2, uSlope * smoothstep(0.02, 0.07, D));
  }
  // the shore: dark wet basalt pebbles and sand
  float shore = smoothstep(0.03, 0.0, D);
  a = mix(a, vec3(0.09, 0.08, 0.07) * (0.6 + 0.8 * vnoise(p.xz * 1500.0)), shore);
  if (D < 0.006) { a *= 0.55; rough = 0.25; }
  // the fields, their walls and the small things of the slope
  float Db; float bb = baseH(p.xz, Db);
  vec4 f = fields(p.xz, bb);
  if (f.x > 0.001) {
    float rows = 0.5 + 0.5 * sin(bb / 0.00004 * 6.2832 + 2.0 * vnoise(p.xz * 80.0));
    float wv = 0.5 + 0.5 * sin(dot(p.xz, vec2(0.6, 0.8)) * 500.0 - uTime * 2.2 + 6.0 * vnoise(p.xz * 30.0)) * (0.4 + 0.6 * vnoise(p.xz * 90.0 - uTime * 0.3));
    float patchy = vnoise(p.xz * 140.0) * 0.6 + vnoise(p.xz * 600.0) * 0.4;
    vec3 wheat = mix(vec3(0.34, 0.23, 0.1), vec3(0.62, 0.47, 0.22), 0.5 + 0.3 * wv + 0.2 * rows) * (0.7 + 0.5 * patchy);
    a = mix(a, wheat, f.x); rough = mix(rough, 0.7, f.x);
  }
  if (f.y > 0.001) a = mix(a, vec3(0.13, 0.11, 0.08) * (0.7 + 0.6 * vnoise(p.xz * 900.0)), f.y);   // dry earth between the clumps
  { float ew = fieldEdge(p.xz, bb, 0.36, 0.647, 0.152, 0.171);
    float fal = (1.0 - smoothstep(-0.004, -0.0018, ew)) * (1.0 - f.x) * (1.0 - f.w);
    if (fal > 0.01) a = mix(a, mix(vec3(0.2, 0.15, 0.09), vec3(0.4, 0.32, 0.18), vnoise(p.xz * 3000.0) * vnoise(p.xz * 700.0)) , fal); }
  if (f.w > 0.01) {
    // dry-stone: grey basalt and limestone blocks with dark joints
    vec2 ve = voronoiEdge(vec2((p.x + p.z) * 2200.0, p.y * 3000.0));
    float joint = smoothstep(0.0, 0.1, ve.x);
    vec3 stone = mix(vec3(0.13, 0.12, 0.11), vec3(0.3, 0.28, 0.24), ve.y) * (0.3 + 0.7 * joint) * (0.8 + 0.4 * vnoise(p.xz * 9000.0));
    a = mix(a, stone, smoothstep(0.2, 0.6, f.w)); rough = mix(rough, 0.85, f.w);
  }
  if (p.y - terrainLo(p.xz, 5) > 0.00015 || true) {
    float kind; features(p.xz, Db, f, kind);
    if (kind > 0.5 && kind < 1.5) a = mix(vec3(0.05, 0.048, 0.045), vec3(0.15, 0.14, 0.13), vnoise(p.xz * 5000.0) * vnoise(p.xz * 17000.0 + 2.0) * 1.4) * (0.75 + 0.4 * n.y);
    else if (kind > 1.5 && kind < 2.5) a = mix(vec3(0.018, 0.024, 0.015), vec3(0.07, 0.08, 0.055), vnoise(p.xz * 9000.0 + p.y * 5000.0));
    else if (kind > 2.5) {
      // thorn: a tangle of dark grey-brown twigs, pale dead spines catching the light
      float tw = abs(sin(vnoise(p.xz * 2500.0 + p.y * 800.0) * 30.0));
      a = mix(vec3(0.05, 0.04, 0.035), vec3(0.3, 0.24, 0.17), smoothstep(0.75, 0.98, tw));
    }
  }
  if (tid > 0.5) { a = mix(vec3(0.06, 0.075, 0.05), vec3(0.17, 0.19, 0.15), vnoise(p.xz * 4000.0 + p.y * 900.0)) * (0.45 + 0.55 * smoothstep(0.0, 0.004, p.y - terrainLo(p.xz, 6))); rough = 0.8; }
  return a;
}
// wheat glows when the sun is behind it; leaves pass a little light
float transl(vec3 p, float tid) { float D; vec4 f = fields(p.xz, baseH(p.xz, D)); return max(max(f.x * 0.15, f.y * 0.3), tid * 0.25); }

vec3 shadeLand(vec3 ro, vec3 rd, float t, bool cheap) {
  vec3 p = ro + rd * t;
  float tid;
  vec3 n = landNormal(p.xz, t, tid, cheap ? 5 : 11);
  float D = lakeD(p.xz);
  float rough;
  vec3 alb = landAlbedo(p, n, D, tid, rough);
  vec3 v = -rd;
  float sh = cheap ? smoothstep(-0.02, 0.06, SUN.y) : sunShadow(p + n * 0.0006);
  sh *= sweep(p) * cloudShade(p);
  float dif = sat(dot(n, SUN));
  vec3 col = alb * uSunCol * dif * sh / PI;
  // backlight through wheat and leaves
  col += alb * uSunCol * sh * transl(p, tid) * pow(sat(dot(rd, SUN)), 3.0) * 0.6;
  // sky light with a little occlusion from the slope and the canopy
  float occ = 0.55 + 0.45 * n.y;
  if (tid > 0.5) occ *= 0.75;
  col += alb * ambientSky(n) * occ * mix(1.0, uFill, exp(-t / 0.8));
  // moonlight
  col += alb * vec3(0.5, 0.6, 0.85) * 0.12 * uMoonK * sat(dot(n, normalize(uMoonDir)));
  vec3 sp;
  col += lampLight(p, n, v, alb, rough, sp) + sp;
  // a wet sheen in the rain
  if (uRain > 0.0) { vec3 r = reflect(rd, n); col += uSunCol * 0.004 * pow(sat(dot(r, SUN)), 30.0) * sh * uRain; }
  return col;
}

// ---- the sea ----
vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0);
  float a = 1.0, f = 120.0;
  vec2 o = vec2(uTime * 0.012, uTime * 0.006);
  for (int i = 0; i < 4; i++) {
    vec3 n = vnoised((p + o * (1.0 + float(i) * 0.4)) * f * vec2(1.0, 1.6));
    g += n.yz * a;
    o = rot(1.1) * o; f *= 2.3; a *= 0.55;
  }
  return g;
}
vec3 waterN(vec2 p, float t) {
  vec2 g = waveGrad(p, t);
  // a long gentle swell under the ripples
  vec2 sw = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 dir = vec2(cos(float(i) * 0.7 + 0.4), sin(float(i) * 0.7 + 0.4));
    float k = 6.2832 / (0.009 + 0.004 * float(i));
    sw += dir * cos(dot(p, dir) * k - uTime * (1.4 - 0.2 * float(i)) + float(i) * 2.0) * (0.5 - 0.12 * float(i));
  }
  g += sw * 1.2 * uSwell;
  float amp = 0.035 * uWave / (1.0 + t * 1.2);
  // rain rings
  if (uRain > 0.0) {
    vec2 q = p * 900.0; vec2 c = floor(q); vec2 f = fract(q) - 0.5;
    float ph = fract(uTime * 1.3 + hash12(c) * 7.0);
    float r = length(f + (hash22(c) - 0.5) * 0.4);
    float ring = sin((r - ph * 0.5) * 60.0) * exp(-ph * 4.0) * smoothstep(0.5, 0.2, r);
    g += normalize(f + 1e-4) * ring * 1.5 * uRain / (1.0 + t * 8.0);
  }
  return normalize(vec3(-g.x * amp, 1.0, -g.y * amp));
}
vec3 lampGlowRefl(vec3 p, vec3 n, vec3 v) {
  vec3 acc = vec3(0);
  for (int i = 0; i < NL; i++) {
    if (LK[i] <= 0.0) continue;
    vec3 L = LP[i] - p; float d = length(L); L /= d;
    vec3 h = normalize(L + v);
    float nh = sat(dot(n, h));
    float spec = pow(nh, 1400.0) * 1400.0 * 0.03 + pow(nh, 220.0) * 220.0 * 0.0025;
    acc += LAMPC * LK[i] * spec * 0.0006 / (d * d + 0.0004);
  }
  return acc;
}

vec3 rainbow(vec3 rd, float amt) {
  if (uBow <= 0.0) return vec3(0);
  float th = acos(clamp(dot(rd, -SUN), -1.0, 1.0)) * 57.2958;
  float x = (th - 40.6) / 1.8;            // 0 violet .. 1 red, across the primary bow
  vec3 spec = vec3(smoothstep(0.35, 0.95, x) * smoothstep(1.5, 1.0, x), smoothstep(0.1, 0.55, x) * smoothstep(1.05, 0.55, x), smoothstep(-0.45, 0.1, x) * smoothstep(0.5, 0.1, x));
  vec3 c = spec * 0.8;
  // the brighter sky inside the bow and the faint secondary
  c += vec3(0.08) * smoothstep(40.5, 34.0, th) * smoothstep(20.0, 34.0, th);
  float x2 = (52.0 - th) / 2.6;
  c += 0.12 * vec3(smoothstep(0.35, 0.95, x2) * smoothstep(1.5, 1.0, x2), smoothstep(0.1, 0.55, x2) * smoothstep(1.05, 0.55, x2), smoothstep(-0.45, 0.1, x2) * smoothstep(0.5, 0.1, x2));
  return c * uBow * amt * mix(uSunCol, vec3(dot(uSunCol, vec3(0.33))), 0.6) * 0.012;
}


// ---- boats and houses on the shore (s13) ----
float boatSDF(vec3 q, float L, float seed, out float part) {
  // a small Galilee fishing boat: a round-bilged hull, open, with a short mast
  q.y -= 0.05 * sin(uTime * 1.3 + seed * 6.0);
  q.xy = rot(0.03 * sin(uTime * 1.1 + seed * 3.0)) * q.xy;
  float W = L * 0.3;
  float hull = sdEllipsoid(q - vec3(0, 0.15, 0), vec3(L * 0.5, 0.75, W * 0.5));
  hull = max(hull, q.y - 0.5);
  float inner = sdEllipsoid(q - vec3(0, 0.35, 0), vec3(L * 0.5 - 0.15, 0.7, W * 0.5 - 0.12));
  hull = max(hull, -inner);
  float mast = sdCapsule(q, vec3(L * 0.12, 0.2, 0), vec3(L * 0.12, 3.6, 0), 0.06);
  part = hull < mast ? 1.0 : 2.0;
  return min(hull, mast);
}
float houseSDF(vec3 q, float W, out float part) {
  // a low basalt house with a flat roof and an open doorway on its lake side
  float b = sdBox(q - vec3(0, 1.3, 0), vec3(W * 0.5, 1.3, W * 0.4)) - 0.12 + 0.08 * vnoise(q.xy * 3.0 + q.z);
  b = max(b, -sdBox(q - vec3(0, 0.95, W * 0.4), vec3(0.45, 0.95, 0.35)));
  float roof = sdBox(q - vec3(0, 2.65, 0), vec3(W * 0.5 + 0.12, 0.1 + 0.08 * vnoise(q.xz * 2.0), W * 0.4 + 0.12));
  part = 3.0;
  return min(b, roof);
}
float propSDF(vec3 p, out float part, out int which) {
  float d = 1e9; part = 0.0; which = -1;
  for (int i = 0; i < 4; i++) {
    if (uBoat[i].w > 0.0) {
      vec3 q = (p - vec3(uBoat[i].x, 0.0, uBoat[i].y)) * 1000.0;
      q.xz = rot(uBoat[i].z) * q.xz;
      float pp; float b = boatSDF(q, uBoat[i].w, float(i), pp) / 1000.0;
      if (b < d) { d = b; part = pp; which = i; }
    }
    if (uHouse[i].w > 0.0) {
      vec3 q = (p - vec3(uHouse[i].x, uHouseY[i], uHouse[i].y)) * 1000.0;
      q.xz = rot(uHouse[i].z) * q.xz;
      float pp; float b = houseSDF(q, uHouse[i].w, pp) / 1000.0;
      if (b < d) { d = b; part = pp; which = 4 + i; }
    }
  }
  return d;
}
float marchProps(vec3 ro, vec3 rd, float tmax) {
  if (uProps <= 0.0) return -1.0;
  // only where the ray passes near one of them
  float t0 = 1e9, t1 = -1.0;
  for (int i = 0; i < 8; i++) {
    vec4 o = i < 4 ? uBoat[i] : uHouse[i - 4];
    if (o.w <= 0.0) continue;
    vec3 c = vec3(o.x, i < 4 ? 0.0015 : uHouseY[i - 4] + 0.0015, o.y);
    vec3 oc = c - ro; float tc = dot(oc, rd); float h2 = dot(oc, oc) - tc * tc;
    float R = 0.0065;
    if (h2 > R * R) continue;
    float dt = sqrt(R * R - h2);
    t0 = min(t0, tc - dt); t1 = max(t1, tc + dt);
  }
  if (t1 < 0.0) return -1.0;
  float t = max(t0, 0.0); t1 = min(t1, tmax);
  for (int i = 0; i < 64; i++) {
    if (t > t1) break;
    float part; int w;
    float d = propSDF(ro + rd * t, part, w);
    if (d < 0.00002) return t;
    t += max(d * 0.8, 0.00002);
  }
  return -1.0;
}
vec3 shadeProps(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float part; int w;
  propSDF(p, part, w);
  const vec2 e = vec2(0.00003, -0.00003);
  float pp; int ww;
  vec3 n = normalize(e.xyy * propSDF(p + e.xyy, pp, ww) + e.yyx * propSDF(p + e.yyx, pp, ww) + e.yxy * propSDF(p + e.yxy, pp, ww) + e.xxx * propSDF(p + e.xxx, pp, ww));
  vec3 alb;
  vec3 emit = vec3(0);
  if (part < 1.5) alb = vec3(0.12, 0.08, 0.05) * (0.7 + 0.5 * vnoise(p.xz * 4000.0 + p.y * 9000.0));
  else if (part < 2.5) alb = vec3(0.1, 0.08, 0.06);
  else {
    // rough basalt walls; the doorway glows with the lamp set inside it
    alb = vec3(0.06, 0.055, 0.05) * (0.5 + 0.7 * vnoise(p.xz * 4000.0 + p.y * 3000.0)) * (0.7 + 0.5 * vnoise(p.xz * 900.0 + p.y * 600.0));
    vec3 q = (p - vec3(uHouse[w - 4].x, uHouseY[w - 4], uHouse[w - 4].y)) * 1000.0;
    q.xz = rot(uHouse[w - 4].z) * q.xz;
    float W = uHouse[w - 4].w;
    if (abs(q.x) < 0.46 && q.y < 1.9 && q.z < W * 0.4 - 0.02) emit = LAMPC * 1.6 * uLampI * smoothstep(1.9, 0.3, q.y) * (0.85 + 0.15 * vnoise(vec2(uTime * 8.0, float(w))));
  }
  vec3 col = alb * ambientSky(n) * 0.8 + alb * vec3(0.5, 0.6, 0.85) * 0.12 * uMoonK * sat(dot(n, normalize(uMoonDir)));
  vec3 sp; col += lampLight(p, n, -rd, alb, 0.7, sp) + sp + emit;
  return col;
}

// ---- standing wheat near the camera ----
// Layers of stalks at fixed distances from the lens (2 m out to 25 m), drawn where they stand inside
// the wheat field: each a thin stalk bending in the wind with its ear at the top, backlit by the sun.
vec4 wheatStalks(vec3 ro, vec3 rd, float tHit) {
  if (uStalks <= 0.0 || rd.y > 0.01 || tHit < 0.0008) return vec4(0);
  vec4 acc = vec4(0);          // premultiplied
  float lr = length(rd.xz);
  float az = atan(rd.x, rd.z);
  for (int k = 17; k >= 0; k--) {
    float fk = float(k);
    float dh = 0.0012 * pow(1.2, fk);                     // horizontal distance (km)
    float tt = dh / max(lr, 1e-3);
    if (tt > tHit + 0.0005) continue;
    vec3 q = ro + rd * tt;
    float D; float b = baseH(q.xz, D);
    if (D < 0.01) continue;
    vec4 f = fields(q.xz, b);
    if (f.w > 0.3 || f.y > 0.5) continue;
    bool wheat = f.x > 0.5;
    if (!wheat && k > 11) continue;
    float g = terrainLo(q.xz, 5);
    float H = wheat ? 0.00105 * (0.9 + 0.2 * vnoise(q.xz * 300.0)) : 0.0003 * (0.5 + vnoise(q.xz * 260.0));
    float y = (q.y - g) / H;                              // 0 ground .. 1 top
    if (y > 1.08 || y < -0.1) continue;
    float cellw = wheat ? 0.05 : 0.035;
    float s = az * dh * 1000.0 / cellw + fk * 13.7;
    float c = floor(s);
    float hs = hash11(c * 1.31 + fk * 7.0);
    if (!wheat && hs > 0.6) continue;
    float top = wheat ? 0.88 + 0.14 * hs : 0.4 + 0.6 * hs;
    if (y > top + 0.05) continue;
    // the wind: a slow sway and gusts running across the slope
    float gust = sin(q.x * 2600.0 + q.z * 1900.0 - uTime * 2.4) * 0.5 + 0.5;
    float sway = (0.25 * sin(uTime * 1.7 + hs * 6.0) + 0.55 * gust) * y * y * (wheat ? 1.0 : 0.6);
    float x = fract(s) - 0.5 - (hs - 0.5) * 0.5 - sway;
    float wpx = (wheat ? 0.07 : 0.09) + 0.012 * fk;
    float a, ear = 0.0;
    if (wheat) {
      float stalk = smoothstep(wpx, wpx * 0.4, abs(x)) * step(y, top - 0.12);
      float ey = (y - (top - 0.07)) / 0.07;
      ear = smoothstep(1.0, 0.7, length(vec2(x / 0.17, ey)));
      float awn = smoothstep(0.03, 0.0, abs(x - (y - top + 0.12) * 0.5)) * step(top - 0.06, y) * step(y, top + 0.05);
      a = max(max(stalk, ear), awn * 0.6);
    } else {
      // a blade of dry grass, tapering to its tip
      a = smoothstep(wpx * (1.0 - y / top), 0.0, abs(x)) * step(y, top);
    }
    if (a < 0.01) continue;
    a *= smoothstep(17.0, 13.0, fk) * (wheat ? 1.0 : smoothstep(11.0, 8.0, fk));
    vec3 alb = wheat ? mix(vec3(0.36, 0.27, 0.12), vec3(0.7, 0.55, 0.28), ear) * (0.75 + 0.35 * hs)
                     : mix(vec3(0.15, 0.16, 0.07), vec3(0.42, 0.36, 0.2), hash11(c * 3.7)) ;
    float lit = sweep(q) * smoothstep(-0.02, 0.01, SUN.y) * cloudShade(q);
    float rim = (ear * 0.8 + 0.4) * pow(sat(dot(rd, SUN)), 2.0);
    vec3 cc = alb * uSunCol * lit * (0.06 + 0.25 * y + 0.7 * rim) / PI + alb * ambientSky(vec3(0, 1, 0)) * (0.35 + 0.4 * max(y, 0.0)) * mix(1.0, uFill, exp(-tt / 0.8));
    vec3 sp; cc += lampLight(q, vec3(0, 1, 0), -rd, alb, 0.8, sp);
    acc = acc * (1.0 - a) + vec4(cc * a, a);
  }
  return acc;
}

// ---- the rain ----
// Streaks at real sizes in layers from 1.5 m to 40 m: the near ones large and fast across the frame,
// the far ones fine; past that the rain is soft veils hanging from the cloud.
vec3 rainLayer(vec3 ro, vec3 rd, float tHit, float jit) {
  if (uRain <= 0.0) return vec3(0);
  vec3 acc = vec3(0);
  float az = atan(rd.x, rd.z);
  float back = pow(max(dot(rd, SUN), 0.0), 3.0);
  float lr = length(rd.xz);
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float dh = 0.0015 * pow(1.75, fk);                    // km
    float tt = dh / max(lr, 1e-3);
    if (tt > tHit) break;
    float y = (ro.y + rd.y * tt) * 1000.0;                // m
    float arc = az * dh * 1000.0;                          // m along the arc
    vec2 uv = vec2(arc / 0.22 + fk * 17.3, (y + uTime * 8.5 + fk * 3.7) / 0.9);
    uv.x += uv.y * 0.06;
    vec2 c = floor(uv);
    float h = hash12(c + fk * 31.0);
    if (h > 0.4) continue;
    vec2 f = fract(uv);
    float off = (hash11(h * 13.0) - 0.5) * 0.7;
    float y0 = hash11(h * 29.0) * 0.4;
    float wdt = 0.035 + 0.02 * fk;                         // far streaks spread into soft lines
    float streak = smoothstep(wdt, 0.0, abs(f.x - 0.5 - off)) * smoothstep(y0, y0 + 0.08, f.y) * smoothstep(y0 + 0.55, y0 + 0.35, f.y);
    float glint = pow(hash11(h * 77.0 + floor(uTime * 8.0 + h * 5.0)), 14.0) * 8.0;
    vec3 lit = uSunCol * (0.006 + 0.02 * back) * (1.0 + glint) + ambientSky(vec3(0, 1, 0)) * 0.15;
    acc += lit * streak * uRain * (k == 0 ? 0.55 : 1.0) / (1.0 + fk * 0.45);
  }
  return acc;
}
// veils of distant rain: streaky curtains drifting across the hills, darker toward the storm
float rainVeil(vec3 rd, float t) {
  if (uRain <= 0.0) return 0.0;
  float az = atan(rd.x, rd.z) + rd.y * 0.15;            // curtains lean a little with the wind
  float n = vnoise(vec2(az * 7.0 + uTime * 0.05, 3.0)) * 0.6 + vnoise(vec2(az * 23.0 - uTime * 0.03, rd.y * 3.0 + uTime * 0.3)) * 0.4;
  float band = smoothstep(0.25, -0.02, rd.y);           // they hang low, between the cloud and the hills
  return uRain * smoothstep(0.3, 2.5, t) * band * smoothstep(0.35, 0.75, n) * 0.45;
}

// ---- the scene ----
vec3 fogCol(vec3 rd) {
  float se = SUN.y;
  float day = smoothstep(-0.16, 0.18, se);
  float mu = dot(rd, SUN);
  // the haze takes the colour of the low sky in its direction
  vec3 c = skyBase(normalize(vec3(rd.x, 0.06, rd.z)), 0.0) * 0.85;
  c += uSunCol * 0.01 * pow(max(mu, 0.0), 8.0) * smoothstep(-0.03, 0.01, se);
  c += uSunCol * 0.006 * pow(max(mu, 0.0), 24.0) * smoothstep(-0.03, 0.01, se);
  // under a rain sky the haze is the grey of the cloud
  c = mix(c, vec3(0.018, 0.021, 0.027) + uSunCol * 0.0008, min(1.0, uStorm * 1.25));
  return c * (1.0 + uGold * vec3(0.55, 0.28, -0.1));
}
float fogAmt(vec3 ro, vec3 rd, float t) {
  // haze that thickens toward the water (mist on the lake at dawn)
  float a = 0.05 + 0.25 * uMist, b = 9.0;
  float by = b * rd.y;
  float k = abs(by) < 1e-4 ? a * exp(-b * ro.y) * t : a * exp(-b * ro.y) * (1.0 - exp(-by * t)) / by;
  return 1.0 - exp(-k - t * 0.012 * (1.0 + 6.0 * uRain));
}

// Low mist lying on the water (s30): banks and wisps with ragged edges and real depth, thickest along
// the shores and drifting slowly; marched through a thin slab over the lake.
vec4 lowMist(vec3 ro, vec3 rd, float tEnd, float jit) {
  if (uVMist <= 0.0 || rd.y >= -0.0005) return vec4(0, 0, 0, 1);
  const float HT = 0.16;
  float t0 = max((ro.y - HT) / -rd.y, 0.0);
  float t1 = min(tEnd, ro.y / -rd.y);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 22;
  float dt = (t1 - t0) / float(N);
  vec3 fc = fogCol(rd);
  vec3 skyUp = ambientSky(vec3(0, 1, 0));
  float T = 1.0; vec3 L = vec3(0);
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    vec2 q = (p.xz - LC) / LR;
    float D = (length(q) - 1.0) * 4.2 + 0.07 * (vnoise(p.xz * 3.0) - 0.5);   // lakeD without the fine shore detail
    float over = smoothstep(0.45, -0.02, D);
    if (over <= 0.0) continue;
    vec2 w = p.xz + vec2(uTime * 0.005, uTime * 0.002);
    float n = vnoise(w * 1.6) * 0.45 + vnoise(w * 5.5 + 3.0) * 0.3 + vnoise(w * 19.0 + vec2(0.0, uTime * 0.03)) * 0.17 + vnoise(w * 70.0 - uTime * 0.04) * 0.08;
    // banks pile up along the shores, the open lake carries thinner drifts
    float shoreK = exp(-abs(D) / 0.12);
    // along the shores the banks heap up unevenly and climb into the folds of the hills
    float heap = smoothstep(0.25, 0.85, vnoise(p.xz * 2.2 + 17.0) * 0.6 + vnoise(p.xz * 9.0 + 3.0) * 0.4);
    float top = HT * (0.04 + 0.2 * smoothstep(0.3, 0.85, n) + 0.75 * shoreK * heap * smoothstep(0.25, 0.7, n + 0.15));
    float h = p.y / max(top, 1e-4);
    float dens = smoothstep(1.0, 0.2, h + 0.25 * (vnoise(p.xz * 140.0 + p.y * 400.0) - 0.5)) * smoothstep(0.36, 0.78, n + 0.15 * shoreK) * over;
    if (dens <= 0.0) continue;
    float sig = dens * uVMist * 14.0 * (0.4 + 0.9 * shoreK);                    // extinction per km
    float a = exp(-sig * dt);
    // lit from above by the sky and toward the dawn; darker in its depths
    vec3 c = fc * (0.75 + 0.55 * sat(h)) + skyUp * 0.25;
    L += T * (1.0 - a) * c;
    T *= a;
    if (T < 0.02) break;
  }
  return vec4(L, T);
}

vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

vec3 dawnScene(vec2 fc, out float depth) {
  vec3 ro, rd0;
  vec3 rd = lensRay(fc, ro, rd0);
  float jit = hash12(fc + uJitter * 31.0);
  setupLamps();
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float tl = marchLand(ro, rd, min(tw, 25.0), uSlope > 0.0 ? 360 : 200, 8);
  if (uSlope > 0.0 && tl > 0.0 && ro.y + rd.y * tl < 0.0002 && tw < 1e8) tl = -1.0;   // the shallows are water, not a stripe of land
  vec3 col; float t;
  float tHit0 = tl > 0.0 ? tl : (tw < 1e8 ? tw : 60.0);
  vec3 tb; float tR, tS;
  float tt = marchTrees(ro, rd, min(tHit0, uTreeNear * 1.6), tb, tR, tS);
  float tp = marchProps(ro, rd, tHit0);
  if (tt > 0.0 && (tp < 0.0 || tt < tp)) {
    t = tt;
    col = shadeTree(ro, rd, t, tb, tR, tS);
  } else if (tp > 0.0) {
    t = tp;
    col = shadeProps(ro, rd, t);
  } else if (tl > 0.0) {
    t = tl;
    col = shadeLand(ro, rd, t, false);
  } else if (tw < 1e8) {
    t = tw;
    vec3 p = ro + rd * t;
    vec3 n = waterN(p.xz, t);
    vec3 v = -rd;
    vec3 r = reflect(rd, n);
    if (r.y < 0.002) r = normalize(vec3(r.x, 0.002, r.z));
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(n, v)), 5.0);
    // the far hills mirrored, then the sky
    vec3 rc;
    float tr = marchLand(p + vec3(0, 0.0003, 0), r, 25.0, uVMist > 0.0 ? 96 : 64, 5);
    if (tr > 0.0) { rc = shadeLand(p + vec3(0, 0.0003, 0), r, tr, true); rc = mix(rc, fogCol(r), fogAmt(p, r, tr)); }
    else rc = sky(p, r);
    vec3 body = vec3(0.01, 0.022, 0.024) * (ambientSky(vec3(0, 1, 0)) * 3.0 + uSunCol * 0.02 * sat(SUN.y + 0.05));
    col = mix(body, rc, fr);
    // sun glitter
    vec3 h = normalize(SUN + v); float nh = sat(dot(n, h));
    float gl = (pow(nh, 2400.0) * 40.0 + pow(nh, 300.0) * 2.0) * fr * smoothstep(-0.03, 0.0, SUN.y);
    if (gl > 0.02) gl *= sunShadow(p + vec3(0, 0.0005, 0)) * sweep(p); else gl = 0.0;
    col += uSunCol * gl;
    col += lampGlowRefl(p, n, v);
    // moon glitter
    vec3 hm = normalize(normalize(uMoonDir) + v); float nm = sat(dot(n, hm));
    col += vec3(0.6, 0.68, 0.85) * uMoonK * (pow(nm, 5000.0) * 30.0 + pow(nm, 700.0) * 0.6) * fr;
    // lamps also light the water near the shore
    vec3 sp; col += lampLight(p, n, v, vec3(0.03), 0.2, sp) * 0.5 + sp * 0.5;
  } else {
    t = 60.0;
    col = sky(ro, rd);
  }
  vec4 ws = wheatStalks(ro, rd, t);
  col = col * (1.0 - ws.a) + ws.rgb;
  if (uVMist > 0.0) { vec4 lm = lowMist(ro, rd, t, jit); col = col * lm.a + lm.rgb; }
  if (t < 59.0) col = mix(col, fogCol(rd), fogAmt(ro, rd, t));
  // distant rain hangs in veils that hide the far hills
  float veil = rainVeil(rd, t);
  col = mix(col, fogCol(rd) * 0.9 + uSunCol * 0.0012, veil);
  // lamps seen directly: the flame point, the lens glow round it and the light it hangs in the air
  for (int i = 0; i < NL; i++) {
    if (LK[i] <= 0.0) continue;
    vec3 c = LP[i] + vec3(0, 0.0008, 0);
    vec3 oc = c - ro; float tc = dot(oc, rd);
    if (tc <= 0.0) continue;
    float hh = max(length(oc - rd * tc), 1e-6);
    // in-scattered lamplight along the ray up to what it hits (no hard cut where a hill hides it)
    float g = (atan((min(t, 60.0) - tc) / hh) + atan(tc / hh)) / hh;
    col += LAMPC * LK[i] * g * 0.0000005 * (0.4 + uMist);
    if (tc > t + 0.002) continue;
    float ang = hh / tc;
    float atten = 1.0 / (1.0 + tc * tc * 2.0);
    float core = exp(-hh / 0.00012) * 50.0 + exp(-ang / 0.0007) * 1.4 + exp(-ang / 0.004) * 0.06;
    col += LAMPC * LK[i] * core * atten * (1.0 - 0.6 * fogAmt(ro, rd, tc));
  }
  col += rainLayer(ro, rd, t, jit);
  col += rainbow(rd, (1.0 - exp(-t * 0.6)) * smoothstep(0.0, 0.25, rd.y + 0.12));
  depth = t;
  return col;
}
`;

// sun colour for a given elevation (sin): deep red at the horizon, gold, then white-gold
export function sunColour(se, k = 1) {
  const s = Math.max(0, Math.min(1, (se + 0.02) / 0.3));
  const r = 7.5, g = 2.2 + 3.6 * s, b = 0.6 + 2.6 * s * s;
  const vis = Math.max(0, Math.min(1, (se + 0.03) / 0.04));
  return [r * vis * k, g * vis * k, b * vis * k];
}
// a sun direction: azimuth from east toward north (radians), elevation (radians)
export function sunDir(az, el) {
  return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
}

// pack lamps [[x, z, size, ignite], ...] into the uniforms (standing each on the ground)
export function packLamps(list) {
  const uLamp = new Array(N_LAMPS * 4).fill(0), uLampY = new Array(N_LAMPS).fill(-9);
  for (let i = 0; i < N_LAMPS; i++) {
    const l = list[i];
    if (!l) { uLamp[i * 4 + 3] = 1e4; continue; }
    uLamp.splice(i * 4, 4, l[0], l[1], l[2], l[3]);
    // l[4]: height above the ground (m); l[5]: an absolute flame height (km) instead
    uLampY[i] = l[5] !== undefined ? l[5] - 0.0012 : groundH(l[0], l[1]) + (l[4] ?? 0) / 1000;
  }
  return { uLamp, uLampY };
}

// boats [[x, z, heading, length m]] and houses [[x, z, turn, width m]] for the shore
export function packProps(boats = [], houses = []) {
  const uBoat = new Array(16).fill(0), uHouse = new Array(16).fill(0), uHouseY = [0, 0, 0, 0];
  boats.slice(0, 4).forEach((b, i) => uBoat.splice(i * 4, 4, ...b));
  houses.slice(0, 4).forEach((h, i) => { uHouse.splice(i * 4, 4, ...h); uHouseY[i] = groundH(h[0], h[1]) - 0.0002; });
  return { uBoat, uHouse, uHouseY, uProps: boats.length + houses.length > 0 ? 1 : 0 };
}
// where a boat's prow lamp and a house's doorway lamp stand (to match the shader's shapes)
export function boatProw(b) { const c = Math.cos(b[2]), s = Math.sin(b[2]); const d = b[3] * 0.42 / 1000; return [b[0] + c * d, b[1] + s * d]; }
export function houseDoor(h) { const c = Math.cos(h[2]), s = Math.sin(h[2]); const d = (h[3] * 0.4 - 0.25) / 1000; return [h[0] - s * d, h[1] + c * d]; }
