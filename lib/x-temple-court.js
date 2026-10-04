// The temple court at night (s25-altar, s27-go): a paved court walled in dressed stone, an altar of
// unhewn stones with horns at its corners and a fire on top, a broad stone step before it. On the
// step: a basket of loaves, a jar of oil and a clay lamp set down beside them. A gateway in the front
// wall opens onto a dusty road that runs away between low hills (the blue hour, in s27). A small
// incense bowl on the step sends up a thin straight thread of smoke when uIncense rises, into a shaft
// of gold light (uGold). Two people are present only as their long shadows on the road (uShad).
// Altar centred on the origin; the step on its -z side; the gate in the wall at z = -9.
import { TEMPLE_BASE } from './x-temple.js';

export const COURT_UNIFORMS = {
  uFocus: 1.0, uAper: 0.01,
  uFire: 1.0,        // altar fire 0..1
  uSmoke: 1.0,       // altar smoke 0..1
  uIncense: 0.0,     // incense thread 0..1
  uGold: 0.0,        // gold shaft 0..1
  uBlue: 0.0,        // 0 night, 1 blue hour
  uShad: 0.0,        // the two shadows on the road 0/1
  uP1: [2.0, 0.0, -14.0], uP2: [-2.0, 0.0, -14.0],   // their feet
  uPA: [0.0, 0.0, 0.0],                                // yaw 1, yaw 2, arms
  uMoon: [-0.5, 0.85, -0.55],                            // towards the moon
};

export const COURT_GLSL = TEMPLE_BASE + /* glsl */ `
uniform float uFire, uSmoke, uIncense, uGold, uBlue, uShad;
uniform vec3 uP1, uP2, uPA, uMoon;

const vec3 FIRE_P = vec3(0.0, 1.78, 0.0);
const vec3 LAMP_P = vec3(0.12, 0.352, -1.52);
const vec3 BASKET_P = vec3(-0.22, 0.3, -1.3);
const vec3 JAR_P = vec3(0.26, 0.3, -1.16);
const vec3 INC_P = vec3(0.7, 0.3, -1.28);
// the moon (night) or the low pale west (blue hour): behind the camera when it looks out of the gate
vec3 moonDir() { return normalize(uMoon); }
vec3 moonCol() { return mix(vec3(0.08, 0.095, 0.125), vec3(0.62, 0.64, 0.74), uBlue); }
const vec3 GOLD_DIR = normalize(vec3(0.35, 1.0, 0.55));

float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

// footprints pressed into the dust, leading away down the road: depth (m) at xz
float footDepth(vec2 xz) {
  float dz = -5.9 - xz.y;
  if (dz < 0.0 || dz > 40.0) return 0.0;
  float st = 0.72, k = 0.0;
  float i = floor(dz / st);
  for (int j = -1; j < 2; j++) {
    float ii = i + float(j);
    float side = mod(ii, 2.0) < 0.5 ? -1.0 : 1.0;
    vec2 c = vec2(0.12 * side + 0.04 * sin(ii * 0.7) - 0.3 * sin((ii * st) * 0.06), -5.9 - ii * st - 0.15);
    vec2 q = xz - c; q = rot(0.08 * side) * q;
    float ball = length((q + vec2(0.0, 0.05)) / vec2(0.055, 0.085));
    float heel = length((q - vec2(0.0, 0.085)) / vec2(0.045, 0.05));
    float f = min(ball, heel);
    float press = 0.012 * smoothstep(1.0, 0.7, f);                        // the print
    float rim = 0.003 * smoothstep(1.4, 1.1, f) * smoothstep(0.95, 1.1, f); // dust pushed up round it
    k += press - rim;
  }
  return k;
}
// ground outside the gate: packed dust, two cart ruts, stones; the road falls gently away
float groundY(vec2 xz) {
  float dz = max(-5.6 - xz.y, 0.0);
  float cx = xz.x + 0.3 * sin(dz * 0.06);
  float road = smoothstep(2.6, 4.4, abs(cx));
  float h = -0.025 * dz + road * (0.25 + 0.6 * fbm(xz * 0.15, 3)) * smoothstep(0.0, 4.0, dz);
  h += 0.012 * fbm(xz * 3.0, 3) + 0.003 * vnoise(xz * 25.0);
  // ruts worn by cart wheels
  float rut = smoothstep(0.16, 0.0, abs(abs(cx + 0.1) - 0.78)) * smoothstep(0.0, 1.0, dz);
  h -= 0.05 * rut * (0.7 + 0.3 * vnoise(xz * 2.0));
  // stones half sunk in the dust
  vec2 g = xz * 3.3; vec2 gi = floor(g), gf = fract(g) - 0.5;
  vec2 o = (hash22(gi) - 0.5) * 0.45;
  float sr = 0.05 + 0.2 * pow(hash12(gi + 4.0), 2.0);
  vec2 sq = rot(6.28 * hash12(gi + 2.0)) * (gf - o);
  float sd = length(sq / vec2(1.0, 0.65)) / sr + 0.35 * (vnoise(sq * 30.0 + gi) - 0.5);
  float keep = step(0.62, hash12(gi + 9.0)) * smoothstep(0.0, 0.6, dz) * (0.25 + 0.75 * road + 0.6 * rut);
  h += keep * 0.1 * sr * smoothstep(1.0, 0.45, sd);
  h -= footDepth(xz);
  return h;
}
// ids: 1 pavement, 2 altar stone, 3 step, 4 wall, 5 basket, 6 loaf, 7 jar, 8 lamp clay, 9 ground, 10 altar hearth, 11 bowl
float mapC(vec3 p, out float id) {
  id = 1.0;
  // pavement: flagstones, each a little proud or sunk
  float d = p.y;
  if (p.z < -5.6) {
    d = p.y - groundY(p.xz); id = 9.0;
  } else {
    vec2 g = p.xz / vec2(1.1, 0.8); g.x += 0.5 * mod(floor(g.y), 2.0);
    vec2 gi = floor(g), gf = fract(g) - 0.5;
    float jt = min(0.5 - abs(gf.x), 0.5 - abs(gf.y));
    d = p.y - 0.006 * (hash12(gi) - 0.5) + 0.006 * smoothstep(0.03, 0.0, jt);
  }
  // walls (dressed ashlar) with the gateway
  float wf = sdBox(p - vec3(0.0, 2.4, -5.0), vec3(9.5, 2.4, 0.6));
  wf = max(wf, -sdBox(p - vec3(0.0, 1.6, -5.0), vec3(1.2, 1.6, 0.8)));
  float ws = min(sdBox(p - vec3(6.5, 2.4, 1.5), vec3(0.6, 2.4, 6.5)), sdBox(p - vec3(-6.5, 2.4, 1.5), vec3(0.6, 2.4, 6.5)));
  ws = min(ws, sdBox(p - vec3(0.0, 2.4, 8.0), vec3(9.5, 2.4, 0.6)));
  float w = min(wf, ws);
  if (w < d) { d = w; id = 4.0; }
  // the altar, unhewn stones, with horns
  vec3 q = p - vec3(0.0, 0.8, 0.0);
  float ab = sdBox(q, vec3(0.85, 0.7, 0.85)) - 0.15;
  if (ab < 0.25) {
    vec3 aq = abs(q);
    // blend the three faces' stone patterns smoothly (a hard switch leaves seams the march slips through)
    vec2 csA = cells(vec2(q.z, q.y) * vec2(4.2, 5.4)), csB = cells(vec2(q.x, q.y) * vec2(4.2, 5.4)), csC = cells(q.xz * vec2(4.2, 4.2));
    float wA = smoothstep(-0.08, 0.08, aq.x - aq.z);
    float wT = smoothstep(0.6, 0.78, aq.y) * smoothstep(-0.2, 0.0, aq.y - max(aq.x, aq.z));
    float rA = 0.04 * sqrt(smoothstep(0.0, 0.3, csA.x)) + 0.012 * (csA.y - 0.5) * smoothstep(0.0, 0.12, csA.x);
    float rB = 0.04 * sqrt(smoothstep(0.0, 0.3, csB.x)) + 0.012 * (csB.y - 0.5) * smoothstep(0.0, 0.12, csB.x);
    float rC = 0.04 * sqrt(smoothstep(0.0, 0.3, csC.x)) + 0.012 * (csC.y - 0.5) * smoothstep(0.0, 0.12, csC.x);
    ab -= mix(mix(rB, rA, wA), rC, wT) + 0.012 * fbm(q.xy * 9.0 + q.zz * 7.0, 2);
    // horns at the corners
    vec3 hq = vec3(abs(q.x) - 0.82, q.y - 0.8, abs(q.z) - 0.82);
    ab = smin(ab, sdRoundCone(hq, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.2, 0.0), 0.13, 0.05), 0.05);
    // the hearth: a shallow hollow in the top where the fire burns
    ab = max(ab, -sdBox(q - vec3(0.0, 0.86, 0.0), vec3(0.62, 0.12, 0.62)));
  }
  if (ab < d) { d = ab; id = 2.0; }
  // the embers bed in the hearth
  float bed = sdBox(q - vec3(0.0, 0.8, 0.0), vec3(0.6, 0.02, 0.6)) - 0.03 * vnoise(q.xz * 9.0);
  if (bed < d) { d = bed; id = 10.0; }
  // the step
  vec3 sq = p - vec3(0.0, 0.15, -1.32);
  float st = sdBox(sq, vec3(1.18, 0.14, 0.34)) - 0.012;
  if (st < d) { d = st; id = 3.0; }
  // the gift, only evaluated near the step
  float gb = length(p - vec3(-0.05, 0.4, -1.3)) - 0.95;
  if (gb > 0.0) d = min(d, gb + 0.02);
  else {
    vec3 b = p - BASKET_P;
    float bk = sdCylY(b - vec3(0.0, 0.065, 0.0), 0.175 + 0.03 * sat(b.y / 0.13), 0.065) - 0.01;
    bk = max(bk, -sdCylY(b - vec3(0.0, 0.14, 0.0), 0.17, 0.05));
    if (bk < d) { d = bk; id = 5.0; }
    float lf = 1e9;
    for (int i = 0; i < 4; i++) {
      float a = float(i) * 2.1 + 0.4;
      vec3 c = vec3(cos(a) * 0.08, 0.16 + 0.012 * float(i), sin(a) * 0.08);
      if (i == 3) c = vec3(0.01, 0.215, -0.01);
      vec3 lq = b - c; lq.xy = rot(0.25 * sin(a * 3.0)) * lq.xy;
      lf = min(lf, sdEllipsoid(lq, vec3(0.085, 0.042, 0.08)));
    }
    if (lf < d) { d = lf; id = 6.0; }
    vec3 j = p - JAR_P;
    float jr = sdEllipsoid(j - vec3(0.0, 0.115, 0.0), vec3(0.092, 0.12, 0.092));
    jr = smin(jr, sdCylY(j - vec3(0.0, 0.25, 0.0), 0.035, 0.04), 0.03);
    jr = smin(jr, sdCylY(j - vec3(0.0, 0.29, 0.0), 0.048, 0.008) - 0.004, 0.01);
    jr = max(jr, -sdCylY(j - vec3(0.0, 0.31, 0.0), 0.028, 0.03));
    if (jr < d) { d = jr; id = 7.0; }
    vec3 l = p - (LAMP_P - vec3(0.06, 0.052, 0.0));
    float lp = sdEllipsoid(l - vec3(0.0, 0.025, 0.0), vec3(0.075, 0.032, 0.058));
    lp = smin(lp, sdEllipsoid(l - vec3(0.065, 0.032, 0.0), vec3(0.04, 0.016, 0.022)), 0.02);
    lp = max(lp, -sdEllipsoid(l - vec3(-0.01, 0.06, 0.0), vec3(0.03, 0.012, 0.03)));
    if (lp < d) { d = lp; id = 8.0; }
    vec3 ib = p - INC_P;
    float bw = sdEllipsoid(ib - vec3(0.0, 0.03, 0.0), vec3(0.07, 0.04, 0.07));
    bw = max(bw, -(ib.y - 0.05));
    bw = smin(bw, sdCylY(ib - vec3(0.0, 0.008, 0.0), 0.04, 0.008), 0.01);
    if (bw < d) { d = bw; id = 11.0; }
  }
  return d;
}
float mapCD(vec3 p) { float i; return mapC(p, i); }
vec3 normC(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.0006, 0.0004 * t);
  return normalize(e.xyy * mapCD(p + e.xyy) + e.yyx * mapCD(p + e.yyx) + e.yxy * mapCD(p + e.yxy) + e.xxx * mapCD(p + e.xxx) + vec3(0.0, 1e-7, 0.0));
}
float marchC(vec3 ro, vec3 rd, out float id) {
  float t = 0.02;
  for (int i = 0; i < 200; i++) {
    vec3 pp = ro + rd * t;
    float d = mapC(pp, id);
    if (abs(d) < 0.0004 * t + 0.0003) return t;
    // the rough altar stones are not a true distance: step carefully near them
    t += d * (max(abs(pp.x), abs(pp.z)) < 1.25 && pp.y < 2.0 ? 0.55 : (pp.z < -5.6 ? 0.6 : 0.85));
    if (t > 90.0) break;
  }
  id = 0.0; return -1.0;
}
float shadowC(vec3 p, vec3 l, float maxt, float k) {
  float r = 1.0, t = 0.006 + 0.03 * hash12(gl_FragCoord.xy + uJitter * 97.0);
  float ph = 1e10;
  for (int i = 0; i < 56; i++) {
    float h = mapCD(p + l * t);
    float y = h * h / (2.0 * ph); float dd = sqrt(max(h * h - y * y, 0.0));
    r = min(r, k * dd / max(1e-4, t - y));
    ph = h;
    t += clamp(h, 0.004, 0.5);
    if (r < 0.01 || t > maxt) break;
  }
  return sat(r);
}
float aoC(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.05 * float(i); o += (h - mapCD(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - o * 2.5);
}
// the people's shadows: does a ray toward the low light hit one of them?
float peopleShadow(vec3 p, vec3 l) {
  if (uShad < 0.5) return 1.0;
  float r = 1.0, t = 0.05;
  for (int i = 0; i < 64; i++) {
    vec3 q = p + l * t;
    float sw = sin(uTime * 1.3) * 0.5;
    float h = min(personSD(q, uP1, uPA.x, uPA.z, sw), personSD(q, uP2, uPA.y, uPA.z, -sw));
    r = min(r, 70.0 * h / t);
    t += clamp(h, 0.01, 0.4);
    if (r < 0.01 || t > 30.0) break;
  }
  return sat(r);
}

vec3 torchPos(int i) { float f = float(i); return vec3(i < 2 ? -5.75 : 5.75, 2.4, mod(f, 2.0) < 0.5 ? -4.5 : 2.0); }
float torchFlick(int i) { return 0.8 + 0.2 * vnoise(vec2(uTime * 6.0, float(i) * 5.0)); }
float fireFlick() { return 0.82 + 0.18 * vnoise(vec2(uTime * 7.0, 2.0)) + 0.08 * sin(uTime * 13.0); }
float lampFlick() { return 0.9 + 0.1 * vnoise(vec2(uTime * 9.0, 7.0)); }

vec3 lightC(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, float ao, bool sh) {
  vec3 col = vec3(0);
  float a2 = pow(max(rough, 0.05), 4.0);
  // altar fire
  if (uFire > 0.001) {
    vec3 L = FIRE_P - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float nl = sat(dot(n, L));
    float s = (sh && nl > 0.0) ? shadowC(p + n * 0.03, L, sqrt(d2) - 0.25, 6.0) * (max(abs(p.x), abs(p.z)) < 1.08 && p.y < 1.55 ? 0.0 : 1.0) : 1.0;
    vec3 c = vec3(1.0, 0.48, 0.17) * 6.0 * uFire * fireFlick() / (0.4 + d2);
    vec3 h = normalize(L + v); float nh = sat(dot(n, h)); float dd = nh * nh * (a2 - 1.0) + 1.0;
    col += c * nl * s * (alb / PI + 0.04 * a2 / (PI * dd * dd));
  }
  // the tall flames and the glowing smoke above the altar: warm light falling over its edge
  if (uFire > 0.001) {
    vec3 L = vec3(0.0, 2.5, -1.25) - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float nl = sat(dot(n, L));
    col += vec3(1.0, 0.5, 0.2) * 3.2 * uFire * fireFlick() * nl / (0.5 + d2) * alb / PI * mix(0.6, 1.0, ao);
  }
  // the clay lamp on the step
  {
    vec3 L = LAMP_P + vec3(0.0, 0.03, 0.0) - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float nl = sat(dot(n, L));
    float s = (sh && nl > 0.0 && d2 < 4.0) ? shadowC(p + n * 0.004, L, sqrt(d2) - 0.03, 30.0) : 1.0;
    vec3 c = vec3(1.0, 0.6, 0.3) * 0.32 * lampFlick() / (0.002 + d2);
    vec3 h = normalize(L + v); float nh = sat(dot(n, h)); float dd = nh * nh * (a2 - 1.0) + 1.0;
    col += c * nl * s * (alb / PI + 0.04 * a2 / (PI * dd * dd));
  }
  // moon / pale west
  {
    vec3 L = moonDir(); float nl = sat(dot(n, L));
    float s = (sh && nl > 0.0) ? shadowC(p + n * 0.02, L, p.z < -5.7 ? 1.5 : 25.0, 10.0) * peopleShadow(p + n * 0.02, L) : 1.0;
    col += moonCol() * nl * s * alb / PI * 4.0;
  }
  // gold shaft
  if (uGold > 0.001) {
    float inb = goldBeam(p);
    if (inb > 0.001) {
      float nl = sat(dot(n, GOLD_DIR));
      col += vec3(1.0, 0.72, 0.36) * 5.0 * uGold * inb * nl * alb / PI;
    }
  }
  // torches burning on the court walls
  for (int i = 0; i < 4; i++) {
    vec3 tp = torchPos(i);
    vec3 L = tp - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    col += vec3(1.0, 0.55, 0.22) * 14.0 * torchFlick(i) * sat(dot(n, L)) / (0.3 + d2) * alb / PI * ao;
  }
  // sky
  vec3 sky = mix(vec3(0.006, 0.008, 0.016), vec3(0.08, 0.1, 0.16), uBlue);
  col += sky * alb * ao * (0.5 + 0.5 * n.y);
  return col;
}
`.replace('vec3 lightC(', `// the gold shaft: a broad beam falling from high in the east onto the step
float goldBeam(vec3 p) {
  vec3 c = vec3(0.35, 0.3, -1.3);
  vec3 q = p - c;
  vec3 ax = q - GOLD_DIR * dot(q, GOLD_DIR);
  return smoothstep(0.75, 0.35, length(ax)) * step(-0.2, dot(q, GOLD_DIR));
}
vec3 lightC(`) + /* glsl */ `

// the altar smoke: a broad column rising from the fire, drifting a little east
vec3 altarSmoke(vec3 ro, vec3 rd, float depth, inout float trans) {
  vec3 acc = vec3(0);
  if (uSmoke < 0.001) return acc;
  // bound: a box round the column as the night wind leans it east
  vec3 bmin = vec3(-3.0, 1.6, -3.5), bmax = vec3(9.0, 12.0, 3.5);
  vec3 inv = 1.0 / rd;
  vec3 ta = (bmin - ro) * inv, tb = (bmax - ro) * inv;
  vec3 tmn = min(ta, tb), tmx = max(ta, tb);
  float t0 = max(max(tmn.x, tmn.y), max(tmn.z, 0.0)), t1 = min(min(tmx.x, tmx.y), min(tmx.z, depth));
  if (t1 <= t0) return acc;
  float y0 = 1.6, y1 = 12.0;
  const int N = 20;
  float dt = (t1 - t0) / float(N);
  float jit = hash12(gl_FragCoord.xy + fract(uTime * 13.0) * 91.0);
  for (int i = 0; i < N; i++) {
    vec3 q = ro + rd * (t0 + dt * (float(i) + jit));
    float hy = q.y - y0;
    if (hy < 0.0 || q.y > y1) continue;
    vec2 cen = vec2(0.05 * hy + 0.045 * hy * hy, 0.0) + vec2(sin(hy * 0.9 - uTime * 0.7), cos(hy * 0.7 - uTime * 0.5)) * 0.08 * hy;
    float rad = min(0.3 + 0.2 * hy, 2.2);
    float r = length(q.xz - cen) / rad;
    if (r > 1.3) continue;
    vec3 sp = vec3(q.x - cen.x, hy - uTime * 0.9, q.z) * vec3(1.6, 1.0, 1.6);
    sp += 0.6 * vec3(vnoise(sp * 0.8 + 1.0), 0.0, vnoise(sp * 0.8 + 5.0));
    float n = fbm(sp * 2.6, 4);
    float dens = smoothstep(0.45, 0.7, n + 0.32 * (1.0 - r) - 0.03 * hy) * smoothstep(1.2, 0.4, r) * exp(-hy * 0.18) * uSmoke * 2.0;
    if (dens < 0.001) continue;
    vec3 lit = vec3(1.0, 0.45, 0.15) * 2.2 * uFire * fireFlick() * exp(-hy * 0.7) * (0.3 + 0.9 * (1.0 - n)) + vec3(0.05, 0.052, 0.058) * (0.3 + 1.2 * n) * (1.0 + uBlue) + vec3(0.006, 0.007, 0.01);
    acc += trans * lit * dens * dt * 0.6;
    trans *= exp(-dens * dt * 0.7);
    if (trans < 0.02) break;
  }
  return acc;
}

// the incense: a thin thread rising straight from the bowl, opening a little high up
vec3 incenseSmoke(vec3 ro, vec3 rd, float depth, inout float trans) {
  vec3 acc = vec3(0);
  if (uIncense < 0.001) return acc;
  vec2 oc = ro.xz - INC_P.xz;
  float a = dot(rd.xz, rd.xz), b = dot(oc, rd.xz), c = dot(oc, oc) - 0.04;
  float disc = b * b - a * c;
  if (disc < 0.0) return acc;
  float sq = sqrt(disc);
  float t0 = max((-b - sq) / a, 0.0), t1 = min((-b + sq) / a, depth);
  if (t1 <= t0) return acc;
  const int N = 36;
  float dt = (t1 - t0) / float(N);
  float jit = hash12(gl_FragCoord.xy * 1.3 + fract(uTime * 11.0) * 37.0);
  float top = INC_P.y + 0.06 + 2.6 * uIncense;
  for (int i = 0; i < N; i++) {
    vec3 q = ro + rd * (t0 + dt * (float(i) + jit));
    float hy = q.y - INC_P.y - 0.06;
    if (hy < 0.0 || q.y > top) continue;
    float turb = smoothstep(0.5, 1.6, hy);
    vec2 cen = INC_P.xz + vec2(sin(hy * 4.4 - uTime * 1.6), cos(hy * 3.7 - uTime * 1.3)) * 0.06 * turb;
    float rad = min(0.006 + 0.012 * hy + 0.07 * turb, 0.12);
    vec2 dq = (q.xz - cen) / rad;
    dq += turb * 0.9 * vec2(vnoise(vec3(dq, hy * 5.0 - uTime * 1.2)) - 0.5, vnoise(vec3(dq + 7.0, hy * 5.0 - uTime * 1.2)) - 0.5);
    float n = fbm(vec3(dq * 1.4, hy * 7.0 - uTime * 1.6), 3);
    float r = length(dq);
    float sheet = exp(-r * r * 2.0) * smoothstep(0.2, 0.65, n + 0.35 * exp(-r * r));
    float dens = sheet * smoothstep(top, top - 0.6, q.y) * 22.0 / (1.0 + hy * 2.5);
    vec3 lit = vec3(1.0, 0.74, 0.4) * 4.0 * uGold * goldBeam(q) + vec3(1.0, 0.6, 0.3) * 0.004 / (0.02 + dot(q - LAMP_P, q - LAMP_P)) + vec3(0.03, 0.035, 0.05);
    acc += trans * lit * dens * dt;
    trans *= exp(-dens * dt * 0.5);
  }
  return acc * uIncense;
}

vec3 courtHills(vec3 rd) {
  // low hills on the horizon outside the gate, a band of darker land against the sky
  float az = atan(rd.x, -rd.z);
  float hh = 0.012 + 0.03 * fbm(vec2(az * 5.0, 1.0), 4);
  return vec3(hh, 0, 0);
}

// the altar fire: a volume of flame over the hearth, tongues torn upward by turbulence
vec3 altarFire(vec3 ro, vec3 rd, float depth) {
  vec3 bmin = vec3(-0.7, 1.62, -0.7), bmax = vec3(0.7, 2.75, 0.7);
  vec3 inv = 1.0 / rd;
  vec3 t0v = (bmin - ro) * inv, t1v = (bmax - ro) * inv;
  vec3 tmn = min(t0v, t1v), tmx = max(t0v, t1v);
  float t0 = max(max(tmn.x, tmn.y), max(tmn.z, 0.0)), t1 = min(min(tmx.x, tmx.y), min(tmx.z, depth));
  if (t1 <= t0) return vec3(0);
  const int N = 22;
  float dt = (t1 - t0) / float(N);
  float jit = hash12(gl_FragCoord.xy * 0.7 + fract(uTime * 17.0) * 53.0);
  vec3 acc = vec3(0);
  for (int i = 0; i < N; i++) {
    vec3 q = ro + rd * (t0 + dt * (float(i) + jit));
    float hy = (q.y - 1.62) / 1.1;
    vec3 w = vec3(q.x * 3.0, q.y * 1.4 - uTime * 2.4, q.z * 3.0);
    w.xz += 0.35 * vec2(vnoise(w * 0.9 + 3.0), vnoise(w * 0.9 + 7.0));
    float n = fbm(w, 4);
    float r = length(q.xz) / (0.62 * (1.0 - 0.55 * hy));
    float shape = smoothstep(1.0, 0.3, r) * smoothstep(1.0, 0.6, hy);
    float f = sat((n - 0.22 - 0.42 * hy) * 3.2) * shape;
    if (f <= 0.0) continue;
    vec3 c = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.62, 0.25), sat(f * 1.6));
    c = mix(c, vec3(1.0, 0.86, 0.6), sat(f * 2.0 - 1.0));
    acc += c * f * f * 70.0 * dt;
  }
  return acc * uFire * fireFlick();
}
vec3 court(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float id; float t = marchC(ro, rd, id);
  vec3 col; float depth = 120.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normC(p, t), v = -rd;
    depth = t;
    float ao = aoC(p, n);
    vec3 alb = vec3(0.5); float rough = 0.85; vec3 emit = vec3(0);
    if (id < 1.5) {
      // worn limestone flags, darker in the joints, polished where feet pass
      vec2 g = p.xz / vec2(1.1, 0.8); g.x += 0.5 * mod(floor(g.y), 2.0);
      vec2 gi = floor(g), gf = fract(g) - 0.5;
      float jt = min(0.5 - abs(gf.x), 0.5 - abs(gf.y));
      alb = vec3(0.42, 0.37, 0.3) * (0.75 + 0.35 * hash12(gi)) * (0.8 + 0.3 * fbm(p.xz * 6.0, 3)) * (0.9 + 0.2 * vnoise(p.xz * 140.0));
      alb *= 1.0 - 0.7 * smoothstep(0.025, 0.0, jt);
      rough = 0.7 - 0.25 * smoothstep(3.0, 0.0, abs(p.x));
    } else if (id < 2.5) {
      vec3 q = p - vec3(0.0, 0.8, 0.0); vec3 aq = abs(q);
      vec2 fcc = aq.x > aq.z ? vec2(q.z, q.y) : vec2(q.x, q.y);
      vec2 cs = cells(fcc * vec2(4.2, 5.4));
      alb = vec3(0.4, 0.35, 0.29) * (0.7 + 0.5 * cs.y) * (0.75 + 0.3 * fbm(p * 9.0, 3)) * (0.9 + 0.2 * vnoise(p * 120.0)) * (0.85 + 0.3 * vnoise(p * 35.0));
      alb *= 1.0 - 0.75 * smoothstep(0.08, 0.0, cs.x);
      // soot climbing the upper stones
      alb *= 1.0 - 0.6 * smoothstep(0.9, 1.75, p.y) * (0.6 + 0.4 * fbm(p * 4.0, 2));
      rough = 0.9;
    } else if (id < 3.5) {
      alb = vec3(0.45, 0.4, 0.33) * (0.8 + 0.25 * fbm(p * 12.0, 3)) * (0.9 + 0.2 * vnoise(p * 150.0));
      rough = 0.75;
    } else if (id < 4.5) {
      // ashlar courses
      vec2 w = abs(abs(p.x) - 6.5) < 0.65 ? p.zy : p.xy;
      vec2 g = w / vec2(1.25, 0.55); g.x += 0.5 * mod(floor(g.y), 2.0);
      vec2 gi = floor(g), gf = fract(g) - 0.5;
      float jt = min((0.5 - abs(gf.x)) * 1.25, (0.5 - abs(gf.y)) * 0.55);
      alb = vec3(0.4, 0.36, 0.3) * (0.7 + 0.4 * hash12(gi)) * (0.8 + 0.3 * fbm(p * 5.0, 3));
      alb *= 1.0 - 0.6 * smoothstep(0.02, 0.0, jt);
    } else if (id < 5.5) {
      // woven reed
      vec3 b = p - BASKET_P;
      float ang = atan(b.z, b.x);
      float weave = sin(ang * 60.0 + sign(sin(b.y * 160.0)) * 1.4) * sin(b.y * 160.0);
      alb = vec3(0.45, 0.32, 0.16) * (0.75 + 0.3 * weave);
      rough = 0.8;
    } else if (id < 6.5) {
      // loaves: a baked brown crust, paler where it split
      alb = vec3(0.55, 0.32, 0.13) * (0.8 + 0.3 * fbm(p * 60.0, 3));
      alb = mix(alb, vec3(0.75, 0.6, 0.4), smoothstep(0.6, 0.75, fbm(p * 30.0 + 2.0, 3)) * 0.6);
      rough = 0.65;
    } else if (id < 7.5) {
      // fired clay jar with a burnished slip
      alb = vec3(0.52, 0.27, 0.15) * (0.85 + 0.2 * fbm(p * 40.0, 3));
      rough = 0.45;
    } else if (id < 8.5) {
      alb = vec3(0.5, 0.3, 0.18) * (0.85 + 0.2 * fbm(p * 50.0, 3));
      rough = 0.55;
    } else if (id < 9.5) {
      // the road: pale dust, a darker verge; footprints pressed in the dust
      float onRoad = 1.0 - smoothstep(2.1, 3.3, abs(p.x + 0.3 * sin(max(-5.6 - p.z, 0.0) * 0.06)));
      alb = mix(vec3(0.2, 0.19, 0.15) * (0.7 + 0.5 * fbm(p.xz * 2.0, 3)), vec3(0.46, 0.41, 0.34) * (0.8 + 0.25 * fbm(p.xz * 9.0, 4)), onRoad);
      alb *= 0.85 + 0.25 * vnoise(p.xz * 40.0);
      rough = 0.95;
      emit = vec3(0);
      // the prints read darker inside (fresh-turned dust in shadow)
      alb *= 1.0 - 22.0 * max(footDepth(p.xz), 0.0);
      float rutd = smoothstep(0.16, 0.0, abs(abs(p.x + 0.3 * sin(max(-5.6 - p.z, 0.0) * 0.06) + 0.1) - 0.78));
      alb *= 1.0 - 0.15 * rutd;
    } else if (id < 10.5) {
      // embers in the hearth
      float h = fbm(vec3(p.xz * 8.0, uTime * 0.5), 3);
      alb = vec3(0.05);
      emit = vec3(1.0, 0.3, 0.06) * (0.6 + 2.5 * smoothstep(0.4, 0.8, h)) * uFire * fireFlick();
    } else {
      alb = vec3(0.55, 0.38, 0.18); rough = 0.4;
      // the coal in the incense bowl
      if (p.y > INC_P.y + 0.035) emit = vec3(1.0, 0.35, 0.08) * 1.5 * uIncense * (0.8 + 0.2 * vnoise(vec2(uTime * 3.0, 1.0)));
    }
    col = emit + lightC(p, n, v, alb, rough, ao, true) * mix(1.0, ao, 0.5);
  } else {
    col = mix(nightSky(rd), blueSky(rd, vec3(0.3, 0.0, -1.0)), uBlue);
    // hills against the sky
    float hh = courtHills(rd).x;
    if (rd.y < hh) col = mix(vec3(0.004, 0.005, 0.008), vec3(0.03, 0.04, 0.065), uBlue) * (0.8 + 0.4 * fbm(rd.xz * 30.0, 3));
  }
  // atmosphere: night haze lit faintly by the fire, the blue air outside
  float fogd = 1.0 - exp(-depth * mix(0.012, 0.02, uBlue));
  vec3 fogc = mix(vec3(0.006, 0.007, 0.012), vec3(0.06, 0.08, 0.13), uBlue);
  col = mix(col, fogc, fogd * (t > 0.0 ? 1.0 : 0.3));
  // in-scatter round the fire and the lamp
  col += glowAt(ro, rd, FIRE_P, depth, vec3(1.0, 0.45, 0.15) * uFire * 0.05, 0.25, 1.2);
  // the altar fire
  if (uFire > 0.001) { float tf = 1.0; col += altarFire(ro, rd, depth); }
  col += wickFlame(ro, rd, LAMP_P, 0.045, 3.3, depth) * 0.6;
  for (int i = 0; i < 4; i++) {
    vec3 tp = torchPos(i);
    col += wickFlame(ro, rd, tp - vec3(0.0, 0.15, 0.0), 0.4, float(i) * 4.4, depth) * 0.25 * torchFlick(i);
    col += glowAt(ro, rd, tp, depth, vec3(1.0, 0.5, 0.2) * 0.12 * torchFlick(i), 0.15, 0.9);
  }
  col += glowAt(ro, rd, LAMP_P + vec3(0.0, 0.02, 0.0), depth, vec3(1.0, 0.62, 0.3) * 0.5, 0.008, 0.06);
  // gold shaft in the air
  if (uGold > 0.001) {
    float acc = 0.0; float tm = min(depth, 6.0);
    float jg = hash12(gl_FragCoord.xy + 3.7 + fract(uTime * 5.0) * 19.0);
    for (int i = 0; i < 24; i++) { vec3 q = ro + rd * (tm * (float(i) + jg) / 24.0); acc += goldBeam(q) * (0.35 + 0.9 * fbm(q * 5.0 + vec3(0.0, -uTime * 0.25, 0.0), 3)) * smoothstep(0.3, 0.5, q.y); }
    col += vec3(1.0, 0.7, 0.35) * acc * tm / 24.0 * 0.45 * uGold;
    // dust motes turning in the beam
    for (int i = 0; i < 18; i++) {
      float f = float(i);
      vec3 m = vec3(0.35, 0.3, -1.3) + GOLD_DIR * (0.4 + 2.2 * hash11(f * 3.3)) + (vec3(hash11(f * 5.1), hash11(f * 7.7), hash11(f * 9.9)) - 0.5) * 0.7;
      m += vec3(sin(uTime * 0.4 + f), cos(uTime * 0.3 + f * 2.0), sin(uTime * 0.35 + f * 3.0)) * 0.05;
      col += glowAt(ro, rd, m, depth, vec3(1.0, 0.75, 0.4) * 0.04 * uGold * goldBeam(m), 0.0025, 0.01);
    }
  }
  float trans = 1.0;
  vec3 sm = altarSmoke(ro, rd, depth, trans);
  col = col * trans + sm;
  trans = 1.0;
  vec3 inc = incenseSmoke(ro, rd, depth, trans);
  col = col * trans + inc;
  // never hand the bloom a NaN (one bad pixel spreads into black blocks)
  if (!(abs(col.x + col.y + col.z) < 1e6)) col = vec3(0.0);
  return col;
}
`.replace('vec3 court(vec2 fc) {', `vec3 court(vec2 fc) {`);
