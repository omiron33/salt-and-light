// s43-mile's world: on the road world (x-road.js), a Roman milestone stands on the left verge, a worn
// limestone column on a square plinth with its carved miles; far ahead, small against the band of the
// coming dawn, the second. Sandal prints in the dust walk past the first and on. Low mist lies in
// the hollows and drifts.
import { ROAD_GLSL, ROAD_UNIFORMS } from './x-road.js';

export const MS1 = [-3.65, 0, 7.0];       // x offset from the road centre, -, z
export const MS2Z = 64.0;
export const MILE_UNIFORMS = { ...ROAD_UNIFORMS };

export const MILE_GLSL = '#define MILE 1\n' + ROAD_GLSL + /* glsl */ `
vec3 msPos(int i) {
  float z = i == 0 ? ${MS1[2].toFixed(2)} : ${MS2Z.toFixed(2)};
  float x = roadX(z) + ${MS1[0].toFixed(2)};
  return vec3(x, undul(vec2(roadX(z), z), 4) - 0.02, z);
}
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
// the face of the inscription: toward the road and the camera (angle about the column's axis)
const float FACE = 0.3;
float msSD(vec3 p, int i) {
  vec3 q = p - msPos(i);
  if (i == 1) q.xz = rot(0.4) * q.xz;
  float bnd = length(q - vec3(0.0, 1.0, 0.0)) - 1.6;
  if (bnd > 0.3) return bnd;
  q.xy = rot(0.03) * q.xy; q.zy = rot(-0.02) * q.zy;          // an old lean
  // a squared base block, its edges broken
  float base = sdBox(q - vec3(0.0, 0.22, 0.0), vec3(0.44, 0.22, 0.44)) - 0.03;
  base += 0.035 * smoothstep(0.35, 0.8, fbm(q * 5.0 + 3.0, 3)) * smoothstep(-0.05, 0.0, sdBox(q - vec3(0.0, 0.22, 0.0), vec3(0.4, 0.18, 0.4)));
  // the column: a slightly tapering drum, a moulded collar near the foot
  float r = 0.3 - 0.018 * smoothstep(0.45, 1.95, q.y);
  float col = sdCylY(q - vec3(0.0, 1.17, 0.0), r, 0.76) - 0.012;
  col = min(col, sdCylY(q - vec3(0.0, 0.48, 0.0), r + 0.03, 0.04) - 0.01);
  // weathering: pits all over, deep chips out of the edges, a broken crown
  col += 0.008 * (fbm(q * 14.0, 3) - 0.5);
  float chip = smoothstep(0.62, 0.8, fbm(q * 4.0 + 11.0, 3));
  col += 0.05 * chip;
  // a worn, rounded crown
  col = max(col, length(vec2(length(q.xz), max(q.y - 1.7, 0.0))) - 0.31);
  float d = min(base, col);
  // a piece broken off one side of the crown
  d = max(d, q.y - 1.95 - 0.05 * (fbm(q.xz * 6.0, 3) - 0.5) + 0.2 * smoothstep(0.08, 0.3, q.x - 0.6 * q.z));
  return d;
}
// a low dry-stone field wall beyond the verge, and loose fieldstones in the grass
const float WALLX = -6.2;
float fieldWall(vec3 p) {
  float rx = p.x - roadX(p.z) - WALLX;
  if (abs(rx) > 1.5 || p.z < -15.0 || p.z > 90.0) return max(abs(rx) - 1.0, 0.5);
  float base = undul(vec2(roadX(p.z) + WALLX, p.z), 3);
  float hgt = 0.72 - 0.25 * smoothstep(0.55, 0.8, vnoise(vec2(p.z * 0.15, 3.0)));   // tumbled in places
  vec3 q = vec3(rx, p.y - base, p.z);
  float w = 0.32 - 0.07 * (q.y / hgt);
  float d = max(abs(q.x) - w, max(q.y - hgt, -q.y - 0.2));
  // its stones: courses of rough rounded blocks
  float row = floor(q.y / 0.17);
  float zz = q.z / (0.32 + 0.1 * hash11(row)) + hash11(row * 7.0) * 5.0;
  vec2 c = vec2(fract(zz) - 0.5, fract(q.y / 0.17) - 0.5);
  d += 0.012 * (1.0 - smoothstep(0.5, 0.3, max(abs(c.x), abs(c.y)))) + 0.01 * (vnoise(p.yz * 9.0 + p.xy * 5.0) - 0.5);
  return d;
}
float fieldStones(vec3 p) {
  float rx = p.x - roadX(p.z);
  if (rx > -3.25 || rx < -5.9 || p.z < -10.0 || p.z > 60.0) return 0.6;
  float i = floor(p.z / 1.1);
  float d = 1e3;
  for (int k = -1; k <= 1; k++) {
    float j = i + float(k);
    if (hash11(j * 3.3) < 0.35) continue;
    if (abs(j * 1.1 - 7.0) < 1.2) continue;          // clear of the milestone
    vec2 c = vec2(roadX(j * 1.1) - 3.5 - 2.2 * hash11(j * 5.1), j * 1.1 + 0.5 * hash11(j * 2.2));
    vec3 s3 = vec3(0.12 + 0.18 * hash11(j * 7.7), 0.07 + 0.08 * hash11(j * 4.4), 0.1 + 0.15 * hash11(j * 9.9));
    vec3 q = p - vec3(c.x, undul(c, 3) - s3.y * 0.15, c.y);
    q.xz = rot(j) * q.xz;
    d = min(d, sdEllipsoid(q, s3) + 0.02 * (vnoise(q * 25.0) - 0.5));
  }
  return d;
}
float msAll(vec3 p, out int which) {
  float a = msSD(p, 0), b = msSD(p, 1);
  which = a < b ? 0 : 1;
  float d = min(a, b);
  float w = fieldWall(p); if (w < d) { d = w; which = 2; }
  float f = fieldStones(p); if (f < d) { d = f; which = 3; }
  return d;
}
float marchMS(vec3 ro, vec3 rd, float tmax, out int which) {
  float t = 0.02; which = 0;
  for (int i = 0; i < 160; i++) {
    float d = msAll(ro + rd * t, which);
    if (d < 0.0004 * t + 0.0003) return t;
    t += d * 0.9;
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 msNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0); int w;
  return normalize(vec3(msAll(p + e.xyy, w) - msAll(p - e.xyy, w), msAll(p + e.yxy, w) - msAll(p - e.yxy, w), msAll(p + e.yyx, w) - msAll(p - e.yyx, w)));
}
float msShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.03; int w;
  for (int i = 0; i < 36; i++) {
    float h = msAll(ro + rd * t, w);
    res = min(res, 3.0 * h / t);
    t += clamp(h, 0.03, 0.4);
    if (res < 0.02 || t > 12.0) break;
  }
  return sat(res);
}

// ---- the inscription: a little stroke font of Roman capitals ----
float sg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
#define S(ax, ay, bx, by) d = min(d, sg(p, vec2(ax, ay), vec2(bx, by)))
// glyph distance in a cell 0..0.7 wide, 0..1 high
float glyph(int c, vec2 p) {
  float d = 1e3;
  if (c == 1) { S(0.35, 0.0, 0.35, 1.0); }                                                    // I
  else if (c == 2) { S(0.06, 0.0, 0.1, 1.0); S(0.1, 1.0, 0.35, 0.15); S(0.35, 0.15, 0.6, 1.0); S(0.6, 1.0, 0.64, 0.0); } // M
  else if (c == 3) { S(0.12, 0.0, 0.12, 1.0); S(0.12, 1.0, 0.45, 1.0); S(0.45, 1.0, 0.6, 0.83); S(0.6, 0.83, 0.45, 0.55); S(0.45, 0.55, 0.12, 0.55); } // P
  else if (c == 4) { S(0.62, 0.86, 0.4, 1.0); S(0.4, 1.0, 0.12, 0.78); S(0.12, 0.78, 0.12, 0.22); S(0.12, 0.22, 0.4, 0.0); S(0.4, 0.0, 0.62, 0.14); } // C
  else if (c == 5) { S(0.04, 0.0, 0.35, 1.0); S(0.35, 1.0, 0.66, 0.0); S(0.17, 0.38, 0.53, 0.38); } // A
  else if (c == 6) { S(0.12, 0.0, 0.12, 1.0); S(0.12, 1.0, 0.58, 1.0); S(0.12, 0.52, 0.5, 0.52); S(0.12, 0.0, 0.6, 0.0); } // E
  else if (c == 7) { S(0.6, 0.86, 0.38, 1.0); S(0.38, 1.0, 0.13, 0.8); S(0.13, 0.8, 0.58, 0.24); S(0.58, 0.24, 0.32, 0.0); S(0.32, 0.0, 0.08, 0.13); } // S
  else if (c == 8) { S(0.12, 0.0, 0.12, 1.0); S(0.12, 1.0, 0.4, 1.0); S(0.4, 1.0, 0.62, 0.72); S(0.62, 0.72, 0.62, 0.28); S(0.62, 0.28, 0.4, 0.0); S(0.4, 0.0, 0.12, 0.0); } // D
  else if (c == 9) { S(0.05, 1.0, 0.35, 0.0); S(0.35, 0.0, 0.65, 1.0); }                       // V
  else if (c == 10) { S(0.12, 0.0, 0.12, 1.0); S(0.12, 1.0, 0.6, 1.0); S(0.12, 0.52, 0.48, 0.52); } // F
  else if (c == 11) { S(0.62, 0.86, 0.4, 1.0); S(0.4, 1.0, 0.12, 0.78); S(0.12, 0.78, 0.12, 0.22); S(0.12, 0.22, 0.4, 0.0); S(0.4, 0.0, 0.62, 0.12); S(0.62, 0.12, 0.62, 0.45); S(0.62, 0.45, 0.42, 0.45); } // G
  else if (c == 12) { d = length(p - vec2(0.35, 0.5)) - 0.03; }                              // interpunct
  return d;
}
// I1 M2 P3 C4 A5 E6 S7 D8 V9 F10 G11 ·12, 0 space
const int R0[8] = int[8](1, 2, 3, 0, 4, 5, 6, 7);
const int R1[10] = int[10](8, 1, 9, 1, 0, 10, 0, 5, 9, 11);
const int R2[6] = int[6](2, 0, 3, 0, 1, 1);
int rowChar(int row, int k) {
  if (row == 0) return k < 8 ? R0[k] : 0;
  if (row == 1) return k < 10 ? R1[k] : 0;
  return k < 6 ? R2[k] : 0;
}
// distance (metres) to the nearest carved stroke on the face; huge where there is none
float inscD(vec3 q) {
  float a = atan(q.x, -q.z) - FACE;
  a = mod(a + PI, 2.0 * PI) - PI;
  float u = -a * 0.29;                   // arc length round the drum, left to right as seen
  float d = 1e3;
  for (int row = 0; row < 3; row++) {
    float hgt = row == 2 ? 0.1 : 0.068;
    float y0 = row == 0 ? 1.55 : (row == 1 ? 1.42 : 1.24);
    int n = row == 0 ? 8 : (row == 1 ? 10 : 6);
    float cw = hgt * (row == 2 ? 0.95 : 0.82);
    float w = float(n) * cw;
    vec2 lp = vec2((u + w * 0.5) / cw, (q.y - y0) / hgt);
    if (lp.y < -0.3 || lp.y > 1.3 || lp.x < -0.3 || lp.x > float(n) + 0.3) continue;
    int k = int(floor(lp.x));
    for (int j = -1; j <= 1; j++) {
      int kk = k + j;
      if (kk < 0 || kk >= n) continue;
      int c = rowChar(row, kk);
      if (c == 0) continue;
      vec2 gp = vec2((lp.x - float(kk)) * 0.82 + 0.03, lp.y);
      d = min(d, glyph(c, gp) * hgt);
    }
  }
  return d;
}

vec3 shadeMS(vec3 p, vec3 rd, int which) {
  vec3 n = msNormal(p), v = -rd;
  if (which >= 2) {
    // field stones: grey limestone, lichened, dark in the gaps
    vec3 alb = vec3(0.21, 0.2, 0.185) * (0.6 + 0.6 * fbm(p * 7.0, 3));
    alb = mix(alb, vec3(0.17, 0.2, 0.14), smoothstep(0.6, 0.72, fbm(p * 5.0 + 9.0, 3)) * 0.7);
    float ao = which == 2 ? sat(0.65 + 3.0 * fieldWall(p + n * 0.05)) * (0.75 + 0.25 * smoothstep(0.0, 0.5, p.y - undul(p.xz, 3))) : 0.85;
    vec3 col = alb * skyLight(n) * 1.3 * ao;
    col += alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR)) * 0.55 * ao;
    col += alb * vec3(0.05, 0.065, 0.1) * sat(dot(n, normalize(vec3(0.5, 0.35, -1.0))));
    return col;
  }
  vec3 q = p - msPos(which);
  if (which == 1) q.xz = rot(0.4) * q.xz;
  q.xy = rot(0.03) * q.xy; q.zy = rot(-0.02) * q.zy;
  // pale limestone, weathered grey, darker in the pits, stained at the foot
  vec3 alb = vec3(0.30, 0.28, 0.245) * (0.7 + 0.4 * fbm(q * 5.0, 4));
  alb *= 0.85 + 0.25 * fbm(q * 30.0, 2);
  alb = mix(alb, vec3(0.2, 0.19, 0.17), smoothstep(0.5, 0.8, fbm(q * vec3(3.0, 0.8, 3.0) + 4.0, 3)) * 0.5);   // rain streaks
  alb *= 1.0 - 0.3 * smoothstep(0.5, 0.0, q.y);
  // lichen: grey-green crusts and a few yellow-orange rosettes
  float lg = smoothstep(0.58, 0.72, fbm(q * 4.0 + 9.0, 4));
  alb = mix(alb, vec3(0.2, 0.23, 0.17), lg * 0.8);
  float ly = smoothstep(0.7, 0.8, fbm(q * 9.0 + 2.0, 3)) * smoothstep(0.4, 1.0, q.y);
  alb = mix(alb, vec3(0.55, 0.38, 0.12), ly * 0.8);
  float occ = 1.0;
  if (which == 0) {
    float d0 = inscD(q);
    if (d0 < 0.03) {
      // V-cut letters: the groove's walls tilt the normal; the bottom of the cut is in shadow
      float gw = 0.0085;
      float cut = smoothstep(gw, gw * 0.4, d0);
      float wear = 0.55 + 0.45 * smoothstep(0.3, 0.6, fbm(q * 18.0, 3));
      vec2 e = vec2(0.0015, 0.0);
      vec3 qa = q + vec3(e.x, 0.0, 0.0), qb = q + vec3(0.0, e.x, 0.0), qc = q + vec3(0.0, 0.0, e.x);
      vec3 g = vec3(inscD(qa) - d0, inscD(qb) - d0, inscD(qc) - d0) / e.x;
      g -= n * dot(g, n);
      n = normalize(n - g * 1.6 * cut * wear * sign(gw - d0));
      occ = 1.0 - 0.5 * smoothstep(gw * 0.7, 0.0, d0) * wear;
    }
  }
  vec3 sh3 = vec3(msShadow(p + n * 0.02, GLOW_DIR));
  vec3 col = alb * skyLight(n) * occ * 1.3;
  // the cold western sky behind the camera, a broad soft fill that rounds the drum
  col += alb * vec3(0.05, 0.065, 0.1) * sat(dot(n, normalize(vec3(0.5, 0.35, -1.0)))) * occ;
  col += alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR)) * (0.55 + 0.25 * uDawn) * sh3 * occ;
  col += vec3(0.9, 0.55, 0.32) * pow(1.0 - sat(dot(n, v)), 3.0) * sat(dot(n, GLOW_DIR) + 0.2) * 0.12 * sh3;
  float ao = sat(0.55 + 0.45 * smoothstep(0.0, 0.5, q.y));
  return col * ao;
}

// mist lying in the hollows: a thin layer whose top drifts
float mistDens(vec3 p) {
  float top = 0.6 + 0.5 * fbm(p.xz * 0.05 + vec2(uTime * 0.05, uTime * 0.02), 3);
  float y = p.y - terrH(p.xz, 2) * 0.0 - undul(p.xz, 2);
  return smoothstep(top, 0.0, y) * (0.5 + 0.8 * fbm(p.xz * 0.12 + vec2(uTime * 0.08, 0.0), 3));
}

vec3 mileScene(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float tT = marchTerr(ro, rd, 3000.0);
  int which; float tM = marchMS(ro, rd, tT > 0.0 ? tT : 200.0, which);
  vec3 col; float depth;
  if (tM > 0.0) {
    depth = tM; vec3 p = ro + rd * tM;
    col = shadeMS(p, rd, which);
  } else if (tT > 0.0) {
    depth = tT; vec3 p = ro + rd * tT;
    float vis = (tT < 40.0 && length(p.xz - msPos(0).xz) < 9.0) ? msShadow(p + vec3(0.0, 0.02, 0.0), GLOW_DIR) : 1.0;
    col = shadeLand(p, rd, tT, vis);
  } else {
    depth = 1e4; col = skyCol(rd);
  }
  if (depth < 1e4) col = applyHaze(col, rd, depth, 0.0005);
  // low mist: a few samples through the first 60 m
  float acc = 0.0;
  float tm = min(depth, 90.0);
  for (int i = 0; i < 6; i++) {
    float s = (float(i) + hash12(fc + uJitter * 50.0)) / 6.0;
    float tt = tm * s * s;
    acc += mistDens(ro + rd * tt) * (tm / 6.0) * 2.0 * s;
  }
  float mf = 1.0 - exp(-acc * 0.012);
  col = mix(col, hazeCol(rd) * 1.15 + vec3(0.02, 0.025, 0.03), mf);
  // dust motes hanging in the air, catching the dawn light (near the lens, soft)
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec3 mp = vec3(hash11(fi * 3.1) * 8.0 - 5.0, 0.3 + 1.8 * hash11(fi * 5.7), 2.0 + 10.0 * hash11(fi * 1.3));
    mp += vec3(sin(uTime * 0.3 + fi) * 0.25 + uTime * 0.08, sin(uTime * 0.21 + fi * 2.0) * 0.15, cos(uTime * 0.17 + fi) * 0.2);
    mp.x = mod(mp.x + 6.0, 12.0) - 6.0 + roadX(mp.z);
    vec3 oc = mp - ro; float tc = dot(oc, rd);
    if (tc < 0.0 || tc > depth) continue;
    float h2 = dot(oc, oc) - tc * tc;
    float r = 0.003 + abs(tc - uFocus) * uAper * 0.5;
    col += vec3(1.0, 0.7, 0.45) * 0.00002 / (r * r + h2) * r * r * 40.0 * 0.04;
  }
  return col;
}
`;
