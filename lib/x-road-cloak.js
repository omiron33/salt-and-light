// s42-cloak's world: on the road world (x-road.js), close and low on the left verge before dawn. A
// woven wool cloak (undyed, oat-brown with dark woven bands) lies crumpled over the stones by the
// road, its loose edge lifting and settling in the wind; a second cloak, deep madder red with its
// own bands, comes down over it (uLay: 0 above and out of frame .. 1 lying) and settles. Both are
// thin shells over the ground, so they drape the stones. The road runs on behind toward the dawn.
import { ROAD_GLSL, ROAD_UNIFORMS } from './x-road.js';

export const CLOAK_Z = 3.0;
export const CLOAK_UNIFORMS = { ...ROAD_UNIFORMS, uLay: 0.0, uGust: 0.0 };

export const CLOAK_GLSL = ROAD_GLSL + /* glsl */ `
uniform float uLay, uGust;
// the cloaks' local frame: centred on the left verge
vec3 cloakC() { float z = ${CLOAK_Z.toFixed(2)}; return vec3(roadX(z) + RW + 1.05, 0.0, z); }

// a few stones on the verge under the cloth
float stones(vec2 q) {
  float h = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = (vec2(hash11(fi * 3.7), hash11(fi * 9.1)) - 0.5) * vec2(1.8, 1.6);
    float r = 0.1 + 0.12 * hash11(fi * 5.3);
    float d = length((q - c) / vec2(1.0, 0.8 + 0.4 * hash11(fi)));
    h = max(h, r * 0.55 * exp(-2.2 * (d / r) * (d / r)));
  }
  return h;
}
float groundL(vec2 xz) { vec3 c = cloakC(); return terrH(xz, 4) + 0.25 * stones(xz - c.xz); }

// footprint of a cloak: a rounded, irregular rectangle in its own frame (negative inside)
float foot(vec2 q, vec2 hs, float seed) {
  vec2 d = abs(q) - hs;
  float r = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.05;
  return r + 0.07 * (fbm(q * 2.2 + seed, 3) - 0.5);
}
// the folds of a lying cloak: soft ridges, a few big folds where it was dropped
float folds(vec2 q, float seed, float amp) {
  vec2 w = q + 0.3 * vec2(fbm(q * 1.2 + seed, 3), fbm(q * 1.2 - seed + 4.0, 3));
  float f = 0.0;
  // a few soft creases, where the cloth was dropped and folded on itself
  for (int i = 0; i < 4; i++) {
    float fi = float(i) + seed;
    vec2 dir = vec2(cos(fi * 2.1), sin(fi * 2.1));
    float x = dot(w, dir) - (hash11(fi * 3.3) - 0.5) * 0.8;
    float along = dot(w, vec2(-dir.y, dir.x));
    float len = smoothstep(0.55, 0.1, abs(along - (hash11(fi * 5.1) - 0.5) * 0.4));
    f += (0.035 + 0.03 * hash11(fi * 7.7)) * exp(-x * x * 90.0) * len;
  }
  f += 0.02 * pow(1.0 - abs(2.0 * fbm(w * 2.6 + seed, 3) - 1.0), 5.0);     // small crumples
  // folded over once along one side: a doubled layer with a rolled edge
  float fx = dot(q, vec2(0.95, 0.3)) + 0.25 + 0.05 * sin(q.y * 3.0 + seed);
  f += 0.012 * smoothstep(0.0, -0.06, fx) + 0.02 * exp(-fx * fx * 600.0);
  f += 0.012 * fbm(w * 0.9 + seed, 2);                                        // broad lumps
  return f * amp;
}

// cloak 1: oat wool, lying, its far-left corner lifting in the wind
const vec2 HS1 = vec2(0.72, 0.52);
float h1(vec2 xz, out float inside, out vec2 q) {
  vec3 c = cloakC();
  q = rot(0.35) * (xz - c.xz);
  inside = foot(q, HS1, 1.0);
  float g = groundL(xz);
  float w = 0.6 + 0.4 * sin(uTime * 1.3) * sin(uTime * 0.71 + 1.0);
  float edge = smoothstep(-0.35, 0.0, inside);                 // near the hem
  float corner = smoothstep(0.5, 1.0, dot(normalize(q), normalize(vec2(-1.0, 0.7))));
  float lift = edge * (0.012 * sin(uTime * 3.1 + q.x * 6.0) * w + corner * (0.05 + 0.08 * uGust) * (0.5 + 0.5 * sin(uTime * 1.9 + q.y * 4.0)) * w);
  float ripple = 0.006 * sin(dot(q, vec2(6.0, 3.0)) - uTime * 2.4) * (0.4 + 0.6 * w);
  float body = smoothstep(0.0, -0.18, inside);               // the hem comes down to the ground
  return g + 0.006 + folds(q, 1.0, 1.0) * body + lift + ripple * body;
}
// cloak 2: madder red, laid over the first (falls from above, billows, settles)
const vec2 HS2 = vec2(0.66, 0.48);
float h2(vec2 xz, out float inside, out vec2 q) {
  vec3 c = cloakC();
  float lay = uLay;
  float fall = 1.0 - smoothstep(0.0, 0.62, lay);
  q = rot(-0.2 + 0.25 * fall) * (xz - c.xz - vec2(-0.12, -0.18) - vec2(0.1, 0.25) * fall);
  inside = foot(q, HS2 * (1.0 + 0.08 * fall), 7.0);
  float i1; vec2 q1;
  float under = max(h1(xz, i1, q1) * step(i1, 0.0) + groundL(xz) * step(0.0, i1), groundL(xz));
  float settle = smoothstep(0.5, 1.0, lay);
  // held out flat above, the hems hanging; it sinks and the middle meets the first cloak first
  float r2 = dot(q / HS2, q / HS2);
  float droop = -0.22 * (1.0 - settle) * r2 * smoothstep(0.0, 0.3, lay);
  float wave = (1.0 - settle) * 0.025 * sin(q.x * 5.0 - uTime * 6.0) * smoothstep(0.2, 1.0, r2);
  float drop = 0.9 * fall * fall;
  float body = smoothstep(0.0, -0.18, inside);
  float rest = folds(q, 7.0, 1.0) * body * settle;
  float w = 0.5 + 0.5 * sin(uTime * 1.1 + 2.0);
  float hem = (1.0 - body) * 0.012 * sin(uTime * 3.7 + q.y * 7.0) * w * settle;
  return under + 0.004 + 0.008 * body + rest + max(drop + droop, 0.0) + wave + hem;
}
// loose fieldstones on the verge round the cloaks
float looseSD(vec3 p) {
  vec3 c = cloakC();
  float d = 1e3;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a = fi * 2.4 + 0.7, r = 0.75 + 0.55 * hash11(fi * 4.1);
    vec2 xz = c.xz + vec2(cos(a), sin(a)) * r * vec2(1.25, 1.0);
    vec3 s = vec3(0.07 + 0.1 * hash11(fi * 2.2), 0.03 + 0.03 * hash11(fi * 6.6), 0.06 + 0.09 * hash11(fi * 8.8));
    vec3 q = p - vec3(xz.x, terrH(xz, 3) + s.y * 0.35, xz.y);
    q.xz = rot(fi) * q.xz;
    d = min(d, sdEllipsoid(q, s) + 0.02 * (fbm(q * 18.0 + fi, 3) - 0.5));
  }
  return d;
}
// signed distance to the two cloth shells (lipschitz-safe-ish); id 1 or 2, q the cloth coordinates
float clothSD(vec3 p, out int id, out vec2 q) {
  float in1, in2; vec2 q1, q2;
  float d1 = 1e3, d2 = 1e3;
  float y1 = h1(p.xz, in1, q1);
  d1 = max(abs(p.y - y1 + 0.006) - 0.008, in1) * 0.45;
  if (uLay > 0.0) {
    float y2 = h2(p.xz, in2, q2);
    d2 = max(abs(p.y - y2 + 0.004) - 0.005, in2) * 0.4;
  }
  float d3 = looseSD(p);
  if (d3 < min(d1, d2)) { id = 3; q = p.xz; return d3; }
  if (d2 < d1) { id = 2; q = q2; return d2; }
  id = 1; q = q1; return d1;
}
float marchCloth(vec3 ro, vec3 rd, float tmax, out int id, out vec2 q) {
  // only near the verge: start where the ray enters a box round the cloaks
  vec3 c = cloakC();
  vec3 bmin = c + vec3(-1.8, -0.3, -1.8), bmax = c + vec3(1.8, 1.2, 1.8);
  vec3 i0 = (bmin - ro) / rd, i1 = (bmax - ro) / rd;
  vec3 lo = min(i0, i1), hi = max(i0, i1);
  float tn = max(max(lo.x, lo.y), lo.z), tf = min(min(hi.x, hi.y), hi.z);
  if (tf < max(tn, 0.0)) return -1.0;
  float t = max(tn, 0.01);
  tf = min(tf, tmax);
  for (int i = 0; i < 140; i++) {
    float d = clothSD(ro + rd * t, id, q);
    if (d < 0.0004 * t) return t;
    t += max(d, 0.0015);
    if (t > tf) break;
  }
  return -1.0;
}
vec3 clothNormal(vec3 p) {
  vec2 e = vec2(0.0025, 0.0); int i; vec2 q;
  return normalize(vec3(clothSD(p + e.xyy, i, q) - clothSD(p - e.xyy, i, q), clothSD(p + e.yxy, i, q) - clothSD(p - e.yxy, i, q), clothSD(p + e.yyx, i, q) - clothSD(p - e.yyx, i, q)));
}
// woven wool: a fine twill, a few woven bands near the hems, the nap
vec3 wool(vec2 q, int id, out float bump) {
  vec2 hs = id == 1 ? HS1 : HS2;
  float tw = vnoise(rot(0.6) * q * vec2(300.0, 40.0)) - 0.5;                  // the diagonal of the weave
  float yarn = vnoise(q * vec2(6.0, 90.0)) * 0.5 + vnoise(q * vec2(90.0, 6.0)) * 0.5;     // uneven yarn
  bump = tw * 0.5 + yarn * 0.5;
  vec3 base = id == 1 ? vec3(0.17, 0.135, 0.095) : vec3(0.18, 0.04, 0.038);
  vec3 band = id == 1 ? vec3(0.09, 0.07, 0.055) : vec3(0.06, 0.04, 0.05);
  // bands across, near each end
  float u = abs(q.x) / hs.x;
  float b = smoothstep(0.012, 0.0, abs(u - 0.74) - 0.03) + smoothstep(0.012, 0.0, abs(u - 0.86) - 0.012);
  if (id == 2) b += smoothstep(0.01, 0.0, abs(abs(q.y) / hs.y - 0.8) - 0.02) * 0.8;
  vec3 c = mix(base, band, sat(b));
  c *= 0.9 + 0.14 * yarn + 0.06 * tw;
  c *= 0.75 + 0.45 * fbm(q * 4.0, 4);                                          // wear and dust
  return c;
}
vec3 shadeCloth(vec3 p, vec3 rd, int id, vec2 q, float t) {
  vec3 n = clothNormal(p), v = -rd;
  if (id == 3) {
    vec3 alb = vec3(0.24, 0.22, 0.19) * (0.7 + 0.5 * fbm(p * 30.0, 3));
    alb = mix(alb, vec3(0.12, 0.13, 0.09), smoothstep(0.55, 0.7, fbm(p * 12.0, 2)) * 0.6);
    float ao = sat(0.5 + 6.0 * (p.y - terrH(p.xz, 3)));
    vec3 col = alb * skyLight(n) * ao + alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR)) * 0.45;
    col += vec3(0.6, 0.4, 0.28) * ggx(n, GLOW_DIR, v, 0.5) * 0.04;
    return col;
  }
  float bump;
  vec3 alb = wool(q, id, bump);
  // ambient occlusion from the folds: compare with the cloth a little above
  int ii; vec2 qq;
  float occ = 0.0;
  for (int k = 1; k <= 3; k++) { float hh = 0.025 * float(k); occ += (hh - clothSD(p + n * hh, ii, qq) / 0.45) / hh; }
  float ao = sat(1.0 - occ * 0.18);
  // the first cloak lies in the shadow of the second where it is covered
  if (id == 1 && uLay > 0.0) { float in2; vec2 q2; float y2 = h2(p.xz, in2, q2); ao *= mix(1.0, 0.55, smoothstep(0.05, -0.1, in2) * smoothstep(0.25, 0.0, y2 - p.y)); }
  vec3 col = alb * skyLight(n) * ao * 1.3;
  col += alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR) * 0.8 + 0.2) * (0.4 + 0.2 * uDawn) * ao;
  // light passing through the thin wool at the lifted hems, against the dawn
  col += alb * vec3(1.0, 0.6, 0.35) * pow(sat(dot(rd, GLOW_DIR)), 6.0) * sat(-dot(n, GLOW_DIR) + 0.3) * 0.25;
  // the nap: soft sheen at grazing angles, warm where it is backlit by the dawn
  float fr = pow(1.0 - sat(dot(n, v)), 3.0);
  col += (vec3(0.07, 0.08, 0.11) + vec3(0.6, 0.38, 0.24) * pow(sat(dot(rd, GLOW_DIR)), 2.0)) * fr * (0.5 + 0.5 * bump) * 0.35 * ao;
  return col;
}

vec3 cloakScene(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float tT = marchTerr(ro, rd, 3000.0);
  int id; vec2 q;
  float tC = marchCloth(ro, rd, tT > 0.0 ? tT : 50.0, id, q);
  vec3 col; float depth;
  if (tC > 0.0) {
    depth = tC; col = shadeCloth(ro + rd * tC, rd, id, q, tC);
  } else if (tT > 0.0) {
    depth = tT; vec3 p = ro + rd * tT;
    // stones near the cloaks are part of the land, shaded with it
    vec3 c = cloakC();
    float st = stones(p.xz - c.xz);
    if (st > 0.001) {
      // the stones are marched as part of the land below; light them like the kerb
      col = shadeLand(p, rd, tT, 1.0);
    } else col = shadeLand(p, rd, tT, 1.0);
    // contact shadow beneath the cloth's lifted edges
    float i1; vec2 q1; float y1 = h1(p.xz, i1, q1);
    col *= mix(1.0, 0.6, smoothstep(0.12, -0.02, i1));
  } else {
    depth = 1e4; col = skyCol(rd);
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
