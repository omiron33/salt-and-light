// s11's world: an extreme macro of salt on a dark walnut table in lamplight. A low drift of clear
// cubic grains (each about a millimetre; units here are grain cells) runs across the frame; the oil
// lamp burns behind and to the right, far out of focus, a soft amber disc in the dark. Its light
// comes through the grains: every face that lines up throws a small hard glint, split into prismatic
// fringes by the refraction, and the glints walk over the drift as the lens glides. Dust motes drift
// through the light close to the lens.
import { SALT_GLSL } from '/song/lib/x-salt.js';

export const MACRO_UNIFORMS = { uFocus: 9.0, uAper: 0.22, uLampK: 1.0 };

export const MACRO_GLSL = SALT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uLampK;
const vec3 LAMP_DIR = normalize(vec3(0.5, 0.2, 1.0));
const vec3 LAMP_COL = vec3(1.0, 0.72, 0.45);
const vec3 COOL_DIR = normalize(vec3(-0.6, 0.8, -0.2));

float heapH(vec2 q) {
  // a low mound of salt poured on the table, its foot spreading toward the lens, a few strays
  vec2 d = q - vec2(2.0, 16.0);
  float r2 = dot(d * vec2(0.55, 1.0), d * vec2(0.55, 1.0));
  float h = 4.5 * exp(-r2 / 90.0) + 0.5 * exp(-r2 / 200.0);
  h += 0.8 * (fbm(q * 0.15, 2) - 0.5) * smoothstep(0.1, 0.8, h);
  return max(h - 0.12, 0.0);
}
float saltBedH(vec2 q) { return heapH(q); }
float saltKeep(vec3 c, float layer) {
  float base = heapH(c.xz);
  // strays on the wood where the drift thins out
  float k = mix(0.04, 0.95, smoothstep(0.02, 0.35, base));
  return layer > 0.5 ? k * 0.85 * smoothstep(0.3, 0.8, base) : k;
}
vec3 saltKeyDir(vec3 p, out vec3 col) { col = LAMP_COL * 3.2 * uLampK; return LAMP_DIR; }
// the flame seen from the grain: a small upright teardrop with a halo
vec3 saltLight(vec3 p, vec3 d) {
  vec3 u = normalize(cross(vec3(0, 1, 0), LAMP_DIR)), v = cross(LAMP_DIR, u);
  float z = dot(d, LAMP_DIR);
  if (z <= 0.0) return vec3(0);
  vec2 a = vec2(dot(d, u), dot(d, v)) / z;
  float fl = 0.88 + 0.12 * vnoise(vec2(uTime * 7.0, 2.0));
  vec2 q = (a - vec2(0.0, 0.015)) / vec2(0.024, 0.06);
  float core = smoothstep(1.0, 0.6, length(q));
  float halo = exp(-length(a) / 0.05);
  return LAMP_COL * (core * 500.0 + halo * 3.0) * fl * uLampK;
}
// the dark room: warm dark above; below, the walnut in the lamp's pool with its glossy streak
vec3 saltEnv(vec3 p, vec3 d) {
  float up = d.y;
  vec3 c = mix(vec3(0.010, 0.010, 0.016), vec3(0.016, 0.02, 0.04), sat(up));
  c += LAMP_COL * 0.5 * pow(sat(dot(d, LAMP_DIR)), 8.0) * uLampK;
  // a faint cold night from a window high on the left: silver on the upper faces
  c += vec3(0.03, 0.04, 0.07) * pow(sat(dot(d, COOL_DIR)), 2.0);
  // warm bounce from the lit wall behind the lens
  c += LAMP_COL * 0.05 * pow(sat(dot(d, normalize(vec3(-0.2, 0.5, -1.0)))), 2.0) * uLampK;
  vec3 r = reflect(d, vec3(0, 1, 0));
  float sheen = pow(sat(dot(r, LAMP_DIR)), 40.0);
  vec3 below = vec3(0.07, 0.035, 0.018) * 0.4 * uLampK + LAMP_COL * (sheen * 0.8 + 0.05 * pow(sat(dot(r, LAMP_DIR)), 4.0)) * uLampK;
  return mix(c, below, smoothstep(0.1, -0.3, up));
}

// the table: dark oiled walnut, open grain, with a soft sheen toward the lamp
vec3 woodShade(vec3 p, vec3 rd) {
  vec2 q = p.xz;
  float ring = fbm(vec2(q.x * 0.03, q.y * 0.6) + vec2(0.0, 3.0), 4);
  float fib = fbm(vec2(q.x * 0.05, q.y * 3.0), 3);
  float pores = smoothstep(0.75, 0.9, vnoise(vec2(q.x * 0.6, q.y * 9.0)));
  vec3 alb = mix(vec3(0.07, 0.035, 0.018), vec3(0.16, 0.08, 0.04), smoothstep(0.3, 0.7, ring * 0.7 + fib * 0.5));
  alb *= 1.0 - 0.5 * pores;
  vec3 n = normalize(vec3((fib - 0.5) * 0.05, 1.0, (vnoise(q * vec2(0.2, 4.0)) - 0.5) * 0.08));
  // shadow of the drift: march toward the lamp over the heap
  float sh = 1.0;
  for (int i = 1; i < 6; i++) { vec3 s = p + LAMP_DIR * float(i) * 0.9; sh = min(sh, sat(1.0 - (heapH(s.xz) - s.y) * 1.5)); }
  vec3 kc = LAMP_COL * 3.2 * uLampK;
  vec3 col = alb * kc * sat(dot(n, LAMP_DIR)) * sh / PI * 1.3;
  vec3 h = normalize(LAMP_DIR - rd);
  col += kc * pow(sat(dot(n, h)), 60.0) * 0.08 * sh;
  col += alb * vec3(0.03, 0.02, 0.012);
  // the lamp's reflection in the oil finish, soft
  col += saltLight(p, reflect(rd, n)) * 0.004 * sh;
  return col;
}

vec3 macro(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, uFocus, uAper, ro, rd0);
  vec3 col; float depth = 200.0;
  // table plane
  float tp = rd.y < 0.0 ? -ro.y / rd.y : 1e4;
  // the bed of fine salt under the big grains
  float tb = -1.0;
  {
    float tt = 0.5;
    for (int i = 0; i < 64; i++) {
      vec3 q = ro + rd * tt;
      float h = q.y - heapH(q.xz);
      if (h < 0.004 * tt) { tb = tt; break; }
      tt += max(h * 0.7, 0.01);
      if (tt > 60.0) break;
    }
    if (tb > 0.0 && (ro + rd * tb).y < 0.02) tb = -1.0;
  }
  float tlim = tb > 0.0 ? tb : min(tp, 60.0);
  vec3 cell;
  float t = saltMarch(ro, rd, 0.5, tlim, cell);
  if (t < 0.0 && tb > 0.0) {
    vec3 q = ro + rd * tb;
    vec2 e = vec2(0.05, 0.0);
    vec3 n = normalize(vec3(heapH(q.xz - e.xy) - heapH(q.xz + e.xy), 2.0 * e.x, heapH(q.xz - e.yx) - heapH(q.xz + e.yx)));
    // shade under the big grains lying on it
    float occ = 0.35 + 0.65 * vnoise(q.xz * 1.3);
    col = saltBed(q, rd, n, occ);
    depth = tb;
  } else if (t > 0.0) {
    float oc;
    col = saltShade(ro + rd * t, rd, cell, oc);
    depth = t;
  } else if (tp < 200.0) {
    col = woodShade(ro + rd * tp, rd);
    depth = tp;
  } else col = saltEnv(ro, rd);
  // far off: the lamp itself as a large soft disc, and a few warm discs of the room
  float fadeFar = exp(-max(depth - 25.0, 0.0) * 0.04);
  col *= fadeFar;
  vec3 bg = vec3(0);
  {
    vec3 L = normalize(LAMP_DIR + vec3(0.0, 0.05, 0.0));
    float a = acos(clamp(dot(rd0, L), -1.0, 1.0));
    float fl = 0.9 + 0.1 * vnoise(vec2(uTime * 5.0, 9.0));
    bg += LAMP_COL * (smoothstep(0.15, 0.142, a) * 0.9 * (0.85 + 0.15 * smoothstep(0.0, 0.15, a)) + exp(-a / 0.12) * 0.25) * fl * uLampK;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec3 dd = normalize(vec3(-0.9 + 0.5 * hash11(fi * 3.1) + 1.4 * fi / 6.0, 0.15 + 0.25 * hash11(fi * 7.3), 1.0));
      float aa = acos(clamp(dot(rd0, dd), -1.0, 1.0));
      float r = 0.05 + 0.03 * hash11(fi * 5.5);
      bg += LAMP_COL * smoothstep(r, r * 0.92, aa) * 0.03 * (0.5 + hash11(fi * 1.7)) * uLampK;
    }
  }
  col += bg * (1.0 - fadeFar * (t > 0.0 || tb > 0.0 || tp < 200.0 ? 1.0 : 0.0));
  // dust motes turning in the lamplight near the lens: soft discs, out of focus
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 3.0, 7.0));
    vec3 mp = vec3(-6.0 + 12.0 * h.x, 1.0 + 6.0 * h.y, -3.0 + 7.0 * h.z);
    mp += vec3(sin(uTime * 0.21 + fi), 0.4 * sin(uTime * 0.17 + fi * 2.0) + 0.15 * uTime, cos(uTime * 0.19 + fi * 1.3)) * 0.8;
    mp.y = mod(mp.y, 7.0) + 0.5;
    vec3 oc = mp - uCamPos; float tc = dot(oc, rd0);
    if (tc < 0.3 || tc > depth) continue;
    float hh = length(oc - rd0 * tc);
    float coc = 0.02 + uAper * abs(tc - uFocus) / max(tc, 0.1);
    float k = smoothstep(coc, coc * 0.8, hh) * 0.0025 / (coc * coc + 0.0004) * 0.03;
    col += LAMP_COL * k * (0.6 + 0.4 * sin(uTime * 2.0 + fi * 5.0)) * uLampK;
  }
  return col;
}
`;
