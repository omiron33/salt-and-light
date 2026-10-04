// s42-cloak's world: on the road world (x-road.js), close and low on the left verge before dawn. A
// heavy woven wool cloak (undyed, oat-brown with dark woven bands) lies crumpled over a few
// fieldstones by the road, its exposed hem stirring in the wind; a second cloak, deep madder red
// with its own bands, comes down over it (uLay: 0 above and out of frame .. 1 lying) and settles.
//
// The cloth is built so it can never pass through anything: every surface rests on the one below.
//   ground g  ->  the stones (real ellipsoids, sunk in the dust)  ->  rest envelope E (a smooth
//   drape over the ground and stones: a tent over each stone that always clears it)  ->  cloak 1
//   (its mid-surface = E + gap + its half thickness + folds and lifts that only ever add height)
//   ->  cloak 2's bed (smooth max of E and the top of cloak 1, falling off over cloak 1's hem)  ->
//   cloak 2 (the same rule; while it falls, a smooth max of the airborne sheet and its resting
//   shape, so where it meets cloak 1 it conforms and the rest is still coming down).
// Each cloth is a thick shell with a rounded, rolled hem (a bead thicker than the cloth), so the
// edges read as heavy wool, not cut paper.
import { ROAD_GLSL, ROAD_UNIFORMS } from './x-road.js';

export const CLOAK_Z = 3.0;
export const CLOAK_UNIFORMS = { ...ROAD_UNIFORMS, uLay: 0.0, uGust: 0.0 };

export const CLOAK_GLSL = ROAD_GLSL + /* glsl */ `
uniform float uLay, uGust;
vec3 cloakC() { float z = ${CLOAK_Z.toFixed(2)}; return vec3(roadX(z) + RW + 1.05, 0.0, z); }

// ---------------- the stones ----------------
// offset from the cloaks' centre (x, z) and half sizes (x, y, z); a few under the cloth, a few at
// its hems, a few loose round about
const int NST = 12;
const vec2 STO[12] = vec2[12](
  vec2(-0.30, 0.10), vec2(0.28, -0.12), vec2(0.02, 0.32), vec2(0.52, 0.22),
  vec2(-0.80, -0.20), vec2(0.66, -0.47), vec2(-0.12, -0.66),
  vec2(-1.15, 0.45), vec2(1.05, 0.55), vec2(-0.58, -1.02), vec2(1.20, -0.35), vec2(0.30, 1.10));
const vec3 STS[12] = vec3[12](
  vec3(0.16, 0.065, 0.12), vec3(0.12, 0.05, 0.10), vec3(0.10, 0.045, 0.09), vec3(0.09, 0.04, 0.08),
  vec3(0.12, 0.06, 0.10), vec3(0.10, 0.05, 0.08), vec3(0.10, 0.035, 0.075),
  vec3(0.11, 0.06, 0.09), vec3(0.13, 0.07, 0.10), vec3(0.07, 0.04, 0.06), vec3(0.09, 0.05, 0.07), vec3(0.14, 0.08, 0.11));
const float ST_SINK = 0.35;     // the ellipsoid's centre sits this many half-heights above the ground
const float ST_NOISE = 0.016;   // surface roughness amplitude of the stones

// the stones' rest envelope above the local ground: a soft tent over each that clears the stone
float stoneEnv(vec2 xz) {
  vec2 c = cloakC().xz;
  float e = 0.0;
  for (int i = 0; i < NST; i++) {
    vec2 q = rot(float(i) * 1.7 + 0.3) * (xz - c - STO[i]);
    vec3 s = STS[i];
    float x = dot(q / s.xz, q / s.xz);
    // the stone's top above the ground is s.y * (ST_SINK + sqrt(1 - x)) inside its rim (x < 1);
    // this tent is above that everywhere inside the rim (equal at the centre, falling more slowly),
    // then drapes down to the ground just beyond the rim, as heavy cloth does
    float tent = ((1.0 + ST_SINK) * s.y + ST_NOISE) * exp(-x / 2.7) * (1.0 - smoothstep(1.0, 3.6, x));
    float t2 = tent * tent; e += t2 * t2;
  }
  // a 4-norm: never below the highest tent, and where two stones are close the cloth bridges them
  return sqrt(sqrt(e));
}
// distance to the stones (y measured from the local ground, so they sit in it)
float stonesSD(vec3 p, float g) {
  vec2 c = cloakC().xz;
  float d = 1e3; int k = 0;
  for (int i = 0; i < NST; i++) {
    vec3 s = STS[i];
    vec2 q2 = rot(float(i) * 1.7 + 0.3) * (p.xz - c - STO[i]);
    vec3 q = vec3(q2.x, p.y - g - ST_SINK * s.y, q2.y);
    float di = sdEllipsoid(q, s);
    if (di < d) { d = di; k = i; }
  }
  if (d < 0.05) {
    vec3 s = STS[k];
    vec2 q2 = rot(float(k) * 1.7 + 0.3) * (p.xz - c - STO[k]);
    vec3 q = vec3(q2.x, p.y - g - ST_SINK * s.y, q2.y);
    d += ST_NOISE * ((fbm(q * 16.0 + float(k) * 7.0, 3) - 0.5) * 1.0 + (fbm(q * 5.0 + float(k) * 3.0, 2) - 0.5) * 0.6) - 0.002;
  }
  return d;
}

// ---------------- the cloth ----------------
const vec2 HS1 = vec2(0.72, 0.52);
const vec2 HS2 = vec2(0.64, 0.47);
const float GAP = 0.0025;       // the air between a cloth and what it rests on
const float TH = 0.0028;        // half thickness of the woven wool
const float HEM = 0.0042;       // the rolled hem is this much thicker (half)
float thick(float f) { return TH + HEM * smoothstep(-0.04, -0.008, f); }

// footprint of a cloak in its own frame (negative inside; roughly a distance)
float foot(vec2 q, vec2 hs, float seed) {
  q += 0.1 * (vec2(fbm(q * 1.1 + seed * 3.0, 2), fbm(q * 1.1 - seed * 2.0 + 9.0, 2)) - 0.5);
  vec2 d = abs(q) - hs;
  float r = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.06;
  return r + 0.06 * (fbm(q * 2.0 + seed, 3) - 0.5);
}
// the folds of a lying cloak: soft rounded ridges where it was dropped, small crumples, a doubled
// edge. Never negative, so the cloth only ever lifts off its bed.
float folds(vec2 q, float seed) {
  vec2 w = q + 0.3 * vec2(fbm(q * 1.2 + seed, 3), fbm(q * 1.2 - seed + 4.0, 3));
  float f = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i) * 1.37 + seed;
    vec2 dir = vec2(cos(fi * 2.1), sin(fi * 2.1));
    float x = dot(w, dir) - (hash11(fi * 3.3) - 0.5) * 0.8;
    float along = dot(w, vec2(-dir.y, dir.x));
    float len = smoothstep(0.55, 0.1, abs(along - (hash11(fi * 5.1) - 0.5) * 0.4));
    // a heavy cloth folds round, not to a crease
    f += (0.028 + 0.036 * hash11(fi * 7.7)) * exp(-x * x * 55.0) * len;
  }
  f += 0.014 * pow(1.0 - abs(2.0 * fbm(w * 2.4 + seed, 3) - 1.0), 4.0);
  float fx = dot(q, vec2(0.95, 0.3)) + 0.25 + 0.05 * sin(q.y * 3.0 + seed);
  f += 0.008 * smoothstep(0.0, -0.06, fx) + 0.012 * exp(-fx * fx * 500.0);
  f += 0.03 * fbm(w * 1.4 + seed, 3);                                        // the cloth bunched in broad lumps
  return f;
}
// along-the-hem coordinate (for the waves of a hem lying on the ground)
float alongHem(vec2 q, vec2 hs) { return atan(q.y / hs.y, q.x / hs.x) * 9.0; }

struct Cloth { float g, h1, f1, k1, h2, f2, k2; vec2 q1, q2; };

float layFall() { return 1.0 - smoothstep(0.0, 0.45, uLay); }
vec2 q2Of(vec2 xz) {
  vec3 c = cloakC(); float fall = layFall();
  return rot(-0.2 + 0.06 * fall) * (xz - c.xz - vec2(-0.12, -0.2) - vec2(0.04, -0.08) * fall);
}

Cloth cloth(vec2 xz) {
  Cloth C;
  vec3 c = cloakC();
  C.g = terrH(xz, 4);
  float e = C.g + stoneEnv(xz);
  float t = uTime;
  // cloak 2's footprint first (it holds cloak 1's hem down where it covers it)
  float lay = uLay;
  float fall = layFall();
  C.q2 = q2Of(xz);
  C.f2 = lay > 0.0 ? foot(C.q2, HS2 * (1.0 + 0.06 * fall), 7.0) : 1.0;
  float cover = lay > 0.0 ? smoothstep(0.06, -0.04, C.f2) * smoothstep(0.35, 0.7, lay) : 0.0;

  // cloak 1
  C.q1 = rot(0.35) * (xz - c.xz);
  C.f1 = foot(C.q1, HS1, 1.0);
  C.k1 = thick(C.f1);
  float body1 = smoothstep(0.0, -0.22, C.f1);
  float edge1 = smoothstep(-0.3, 0.0, C.f1);
  float w = 0.6 + 0.4 * sin(t * 1.3) * sin(t * 0.71 + 1.0);
  float wave1 = 0.008 * edge1 * pow(0.5 + 0.5 * sin(alongHem(C.q1, HS1) + 1.3), 2.0);   // a hem lying in waves
  float corner = smoothstep(0.55, 1.0, dot(normalize(C.q1), normalize(vec2(-1.0, 0.7))));
  float lift1 = edge1 * edge1 * (0.006 * (0.5 + 0.5 * sin(t * 3.1 + C.q1.x * 6.0)) * w
              + corner * (0.03 + 0.09 * uGust) * (0.5 + 0.5 * sin(t * 1.9 + C.q1.y * 4.0)) * w);
  float ripple1 = 0.004 * (0.5 + 0.5 * sin(dot(C.q1, vec2(6.0, 3.0)) - t * 2.4)) * (0.4 + 0.6 * w) * body1;
  C.h1 = e + GAP + C.k1 + folds(C.q1, 1.0) * body1 + wave1 + (lift1 + ripple1) * (1.0 - cover);

  // cloak 2
  C.k2 = thick(C.f2);
  C.h2 = -1e3;
  if (lay > 0.0) {
    // its bed: the ground and stones, and the top of cloak 1 falling away over its hem
    float top1 = C.h1 + C.k1 - 1.1 * max(C.f1 - C.k1, 0.0);
    float bed = smax(e, top1, 0.03);
    float settle = smoothstep(0.15, 0.5, lay);
    float body2 = smoothstep(0.0, -0.2, C.f2);
    float edge2 = smoothstep(-0.3, 0.0, C.f2);
    float w2 = 0.5 + 0.5 * sin(t * 1.1 + 2.0);
    float wave2 = 0.009 * edge2 * pow(0.5 + 0.5 * sin(alongHem(C.q2, HS2) * 1.1 + 4.0), 2.0);
    float corner2 = smoothstep(0.5, 1.0, dot(normalize(C.q2), normalize(vec2(-0.9, -0.6))));
    float lift2 = edge2 * edge2 * (0.005 * (0.5 + 0.5 * sin(t * 3.7 + C.q2.y * 7.0)) * w2 + corner2 * 0.11 * uGust * (0.6 + 0.4 * sin(t * 2.3)));
    float rest = bed + GAP + C.k2 + (0.75 * folds(C.q2, 7.0) * body2 + wave2) * settle + lift2 * settle;
    // dropped from above: it falls fast, the middle leading and the hems trailing up and rippling;
    // the middle meets cloak 1 first and conforms to it while the hems are still coming down
    float l = sat(lay / 0.45);
    float drop = 1.7 * (1.0 - l) * (1.0 - l) - 0.5 * l;
    vec2 r = C.q2 / HS2; float r2 = min(dot(r, r), 1.8);
    float air = C.g + drop + 0.2 * r2 * (1.0 - 0.6 * l) + 0.04 * sin(length(r) * 7.0 - t * 14.0) * r2 * (1.0 - l)
              + 0.03 * sin(C.q2.x * 6.0 + t * 9.0) * r2 * (1.0 - l);
    C.h2 = smax(rest, air, 0.06);
  }
  return C;
}
float shellSD(vec3 p, float h, float f, float k) {
  return (length(vec2(max(f, 0.0), p.y - h)) - k) * 0.42;
}

// the scene near the cloaks. mode 0: for marching (with the ground and safe bounds round the
// cloth); 1: the things lying on the land (occluders for the land); 2: those and the ground
float sceneSD(vec3 p, int mode, out int id, out vec2 q) {
  vec3 c = cloakC();
  float g = terrH(p.xz, 4);
  float dg = mode == 1 ? 1e3 : (p.y - g) * 0.9;
  bool bounds = mode == 0;
  float ds = stonesSD(p, g);
  float d = dg; id = 0; q = p.xz;
  if (ds < d) { d = ds; id = 3; }
  vec2 o = p.xz - c.xz;
  float ceil = 0.42 + (uLay > 0.0 && uLay < 0.46 ? 2.2 : 0.0);
  // a cheap bound on the horizontal distance to either cloth (their outlines without the noise)
  vec2 qa = rot(0.35) * o, da = abs(qa) - HS1;
  float fb = length(max(da, 0.0)) + min(max(da.x, da.y), 0.0) - 0.06;
  if (uLay > 0.0) { vec2 db = abs(q2Of(p.xz)) - HS2 * 1.07; fb = min(fb, length(max(db, 0.0)) + min(max(db.x, db.y), 0.0) - 0.06); }
  fb -= 0.12;
  if (fb > 0.0) {
    if (bounds) d = min(d, max(fb, 0.002));
  } else if (p.y - g < ceil + 0.05) {
    Cloth C = cloth(p.xz);
    float d1 = shellSD(p, C.h1, C.f1, C.k1);
    if (d1 < d) { d = d1; id = 1; q = C.q1; }
    if (uLay > 0.0) {
      float d2 = shellSD(p, C.h2, C.f2, C.k2) * (uLay < 0.46 ? 0.8 : 1.0);   // steeper while it falls
      if (d2 < d) { d = d2; id = 2; q = C.q2; }
    }
  } else if (bounds) d = min(d, p.y - g - ceil);
  return d;
}
float sceneD(vec3 p, int mode) { int i; vec2 q; return sceneSD(p, mode, i, q); }

float marchNear(vec3 ro, vec3 rd, out int id, out vec2 q, out float tEnd) {
  vec3 c = cloakC();
  vec3 bmin = c + vec3(-1.8, -0.4, -1.8), bmax = c + vec3(1.8, 1.8, 1.8);
  vec3 i0 = (bmin - ro) / rd, i1 = (bmax - ro) / rd;
  vec3 lo = min(i0, i1), hi = max(i0, i1);
  float tn = max(max(lo.x, lo.y), lo.z), tf = min(min(hi.x, hi.y), hi.z);
  tEnd = tf;
  if (tf < max(tn, 0.0)) { tEnd = -1.0; return -1.0; }
  float t = max(tn, 0.01);
  for (int i = 0; i < 260; i++) {
    float d = sceneSD(ro + rd * t, 0, id, q);
    if (d < 0.00025 * t) return t;
    t += max(d, 0.0003 * t);
    if (t > tf) break;
  }
  return -1.0;
}
vec3 nearNormal(vec3 p, float t) {
  float e = 0.0006 + 0.0003 * t;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * sceneD(p + k.xyy * e, 0) + k.yyx * sceneD(p + k.yyx * e, 0) +
                   k.yxy * sceneD(p + k.yxy * e, 0) + k.xxx * sceneD(p + k.xxx * e, 0));
}
// occlusion from the things lying on the land (mode 1) or from everything (mode 0)
float nearAO(vec3 p, vec3 n, int mode) {
  float occ = 0.0, w = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.006 + 0.022 * float(i * i) / 5.0;
    occ += (h - sceneD(p + n * h, mode)) * w;
    w *= 0.62;
  }
  return sat(1.0 - 2.2 * occ);
}
// soft shadow toward the low glow of the east (a broad source: soft)
float glowShadow(vec3 p, vec3 n) {
  vec3 l = normalize(GLOW_DIR + vec3(0.0, 0.18, 0.0));
  float res = 1.0, t = 0.01;
  for (int i = 0; i < 18; i++) {
    float h = sceneD(p + n * 0.003 + l * t, 1);
    res = min(res, 3.0 * h / t);
    t += clamp(h, 0.015, 0.12);
    if (res < 0.02 || t > 1.4) break;
  }
  return smoothstep(0.0, 1.0, res);
}

// ---------------- the wool ----------------
// heavy homespun wool in a 2/2 twill: diagonal ribs about 6 mm apart, uneven yarn, woven bands
// near the ends, a darker rolled hem with its stitching. pf: the pixel's size on the cloth.
vec3 wool(vec2 q, int id, float f, float pf, out float bump) {
  vec2 hs = id == 1 ? HS1 : HS2;
  float seen = smoothstep(0.012, 0.004, pf);
  vec2 wq = q * 160.0;
  float twill = sin((wq.x + wq.y) * 3.14159 + 1.2 * sin(wq.y * 0.5)) * 0.5 + 0.5;
  float warp = sin(wq.x * 6.2832) * 0.5 + 0.5, weft = sin(wq.y * 6.2832) * 0.5 + 0.5;
  float slub = vnoise(q * vec2(4.0, 140.0)) * 0.6 + vnoise(q * vec2(140.0, 4.0)) * 0.4;     // thick and thin yarn
  bump = mix(0.5, twill * 0.6 + warp * weft * 0.4, seen) * 0.7 + slub * 0.3;
  vec3 base = id == 1 ? vec3(0.21, 0.155, 0.10) : vec3(0.27, 0.05, 0.042);
  vec3 band = id == 1 ? vec3(0.11, 0.08, 0.06) : vec3(0.07, 0.04, 0.05);
  float u = abs(q.x) / hs.x;
  float b = smoothstep(0.012, 0.0, abs(u - 0.74) - 0.03) + smoothstep(0.012, 0.0, abs(u - 0.86) - 0.012);
  if (id == 2) b += smoothstep(0.01, 0.0, abs(abs(q.y) / hs.y - 0.8) - 0.02) * 0.8;
  vec3 c = mix(base, band, sat(b));
  c *= 0.86 + 0.22 * slub + 0.12 * (bump - 0.5) * seen;
  c *= 0.82 + 0.32 * fbm(q * 3.0 + float(id) * 5.0, 4);                    // wear, sun-fading and dust
  // the rolled hem: a darker, denser band with a line of stitches just inside it
  float hem = smoothstep(-0.032, -0.022, f);
  c *= 1.0 - 0.28 * hem;
  float st = smoothstep(0.003, 0.0, abs(f + 0.036)) * step(0.45, fract(alongHem(q, hs) * 9.0)) * seen;
  c = mix(c, c * 0.55, st);
  return c;
}

vec3 shadeCloth(vec3 p, vec3 rd, int id, vec2 q, float t) {
  vec3 n = nearNormal(p, t), v = -rd;
  Cloth C = cloth(p.xz);
  float f = id == 1 ? C.f1 : C.f2;
  float pf = t * 0.00068;
  float bump;
  vec3 alb = wool(q, id, f, pf, bump);
  // the weave in the light: tilt the normal along the twill's diagonal
  vec3 tq = normalize(vec3(1.0, 0.0, 1.0));
  n = normalize(n + (bump - 0.5) * 0.18 * smoothstep(0.012, 0.004, pf) * (tq - n * dot(n, tq)));
  float ao = nearAO(p, n, 2);
  float sh = glowShadow(p, n);
  vec3 col = alb * skyLight(n) * ao * 1.6;
  // wool scatters: a soft wrapped diffuse from the warm east
  col += alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR) * 0.6 + 0.4) * (0.4 + 0.2 * uDawn) * ao * mix(0.35, 1.0, sh);
  // light through the thin wool where a hem is lifted against the dawn
  col += alb * vec3(1.0, 0.6, 0.35) * pow(sat(dot(rd, GLOW_DIR)), 6.0) * sat(-dot(n, GLOW_DIR) + 0.3) * 0.2 * sh;
  // the nap: a soft sheen at grazing angles (fibres standing off the cloth), warm against the dawn
  float nv = sat(dot(n, v));
  float fz = pow(1.0 - nv, 4.0);
  vec3 sheenC = id == 1 ? vec3(0.55, 0.47, 0.38) : vec3(0.65, 0.3, 0.25);
  col += sheenC * (vec3(0.06, 0.07, 0.10) + vec3(0.42, 0.28, 0.18) * pow(sat(dot(rd, GLOW_DIR) * 0.5 + 0.5), 3.0) * sh) * fz * (0.6 + 0.6 * bump) * ao * 0.9;
  col += sheenC * vec3(0.5, 0.33, 0.22) * pow(sat(dot(reflect(rd, n), GLOW_DIR)), 3.0) * 0.03 * sh * ao;
  return col;
}
vec3 shadeStone(vec3 p, vec3 rd, float t) {
  vec3 n = nearNormal(p, t), v = -rd;
  vec3 alb = vec3(0.34, 0.30, 0.24) * (0.6 + 0.6 * fbm(p * 30.0, 3)) * (0.8 + 0.3 * vnoise(p.xz * 9.0));
  alb = mix(alb, vec3(0.12, 0.13, 0.09), smoothstep(0.55, 0.7, fbm(p * 12.0, 2)) * 0.6);   // lichen
  float g = terrH(p.xz, 4);
  alb = mix(alb * 0.6, alb, smoothstep(0.0, 0.025, p.y - g));                             // earth at the foot
  float ao = nearAO(p, n, 2);
  float sh = glowShadow(p, n);
  vec3 col = alb * skyLight(n) * ao + alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR)) * 0.45 * sh * ao;
  col += vec3(0.6, 0.4, 0.28) * ggx(n, GLOW_DIR, v, 0.5) * 0.04 * sh;
  return col;
}

vec3 cloakScene(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; vec2 q; float tEnd;
  float tN = marchNear(ro, rd, id, q, tEnd);
  vec3 col; float depth;
  if (tN > 0.0) {
    depth = tN; vec3 p = ro + rd * tN;
    if (id == 1 || id == 2) col = shadeCloth(p, rd, id, q, tN);
    else if (id == 3) col = shadeStone(p, rd, tN);
    else {
      col = shadeLand(p, rd, tN, 1.0);
      // contact shadows: the sky shut out under hems and round stones, the glow's soft shadow
      vec3 n = terrNormal(p, tN);
      float ao = nearAO(p + n * 0.001, n, 1);
      float sh = glowShadow(p, n);
      col *= ao * mix(0.7, 1.0, sh);
    }
  } else {
    float tT = marchTerr(ro, rd, 3000.0);
    if (tT > 0.0) { depth = tT; col = shadeLand(ro + rd * tT, rd, tT, 1.0); }
    else { depth = 1e4; col = skyCol(rd); }
  }
  if (depth < 1e4) col = applyHaze(col, rd, depth, 0.0005);
  // drifting dust and mist low over the road behind
  float acc = 0.0;
  for (int i = 0; i < 5; i++) {
    float s = (float(i) + hash12(fc + uJitter * 50.0)) / 5.0;
    float tt = min(depth, 80.0) * s;
    vec3 pp = ro + rd * tt;
    float top = 0.5 + 0.4 * fbm(pp.xz * 0.06 + vec2(uTime * 0.06, 0.0), 3);
    acc += smoothstep(top, 0.0, pp.y - undul(pp.xz, 2)) * fbm(pp.xz * 0.15 + vec2(uTime * 0.1, uTime * 0.03), 2) * min(depth, 80.0) / 5.0;
  }
  col = mix(col, hazeCol(rd) * 1.1, 1.0 - exp(-acc * 0.02));
  return col;
}
`;
