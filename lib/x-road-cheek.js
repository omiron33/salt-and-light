// s41-cheek's world: a stone colonnade at the roadside in the cold before dawn. The open side (-x)
// gives on to the grey-blue sky; the back (+x) is dark, with a clay lamp burning on a bronze stand
// behind the nearest pillar. On a stone block on the cold side stands a bronze balance, its beam and
// pans swinging (uSwing = beam angle, uPan = pan sway). The camera turns round the pillar from the
// cold, shadowed side into the lamp's warm light. Pillar at the origin, floor at y = 0.
import { ROAD_GLSL, ROAD_UNIFORMS } from './x-road.js';

export const LAMP_P = [0.58, 1.3, -0.36];
export const SCALE_P = [-0.8, 0.92, 0.46];
export const CHEEK_UNIFORMS = { ...ROAD_UNIFORMS, uSwing: 0.0, uPan: 0.0, uWarm: 0.0 };

export const CHEEK_GLSL = ROAD_GLSL + /* glsl */ `
uniform float uSwing, uPan, uWarm;
const vec3 LAMP = vec3(${LAMP_P.join(', ')});
const vec3 SCB = vec3(${SCALE_P.join(', ')});
const vec3 COLD_DIR = normalize(vec3(-1.0, 0.45, -0.25));    // light from the open side and the sky
const float PR = 0.30;                                       // pillar radius
const float SPC = 2.7;                                       // spacing of the pillars along z

float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }

// a fluted column with a moulded base on a square plinth
float pillarSD(vec3 p) {
  float a = atan(p.z, p.x);
  float fl = 0.01 * (1.0 - pow(abs(cos(a * 10.0)), 3.0)) * smoothstep(0.35, 0.5, p.y);
  float shaft = sdCylY(p - vec3(0.0, 2.2, 0.0), PR - 0.004 * p.y + fl, 2.0);
  float base = sdTorus(p - vec3(0.0, 0.3, 0.0), vec2(PR + 0.01, 0.05));
  base = min(base, sdTorus(p - vec3(0.0, 0.22, 0.0), vec2(PR + 0.04, 0.05)));
  float plinth = sdBox(p - vec3(0.0, 0.09, 0.0), vec3(PR + 0.11, 0.09, PR + 0.11)) - 0.01;
  float d = min(shaft, min(base, plinth));
  // chipped and weathered
  d += 0.0025 * (vnoise(p * 11.0) - 0.5);
  return d;
}
float colonnadeSD(vec3 p) {
  vec3 q = p;
  float k = clamp(floor(q.z / SPC + 0.5), -4.0, 6.0);
  q.z -= k * SPC;
  float d = pillarSD(q);
  // architrave and roof
  d = min(d, sdBox(p - vec3(0.0, 4.35, 0.0), vec3(0.42, 0.18, 300.0)));
  d = min(d, sdBox(p - vec3(2.4, 4.6, 0.0), vec3(2.5, 0.08, 300.0)));
  // the back wall
  d = min(d, 4.6 - p.x);
  return d;
}

// ---- the balance ----
// beam pivot at SCB + (0, 0.46, 0); beam half length 0.24; pans hang 0.3 below the beam ends
vec3 beamEnd(float s) {
  vec3 piv = SCB + vec3(0.0, 0.48, 0.0);
  vec2 d = vec2(cos(uSwing), sin(uSwing)) * 0.24 * s;
  return piv + vec3(d.x * 0.8, d.y, d.x * 0.6);
}
vec3 panC(float s) {
  vec3 e = beamEnd(s);
  float sw = uPan * s;
  return e + vec3(0.6 * sin(sw) * 0.3, -0.3 * cos(sw), 0.8 * sin(sw) * 0.3 * -1.0 + 0.0);
}
float panSD(vec3 p, float s) {
  vec3 c = panC(s);
  vec3 q = p - c;
  // a shallow bronze bowl
  float sph = length(q - vec3(0.0, 0.11, 0.0)) - 0.13;
  float bowl = max(abs(sph) - 0.003, q.y - 0.035);
  bowl = max(bowl, -q.y - 0.02);
  // three cords from the rim to the beam end
  vec3 e = beamEnd(s);
  float cords = 1e3;
  for (int i = 0; i < 3; i++) {
    float a = float(i) * 2.094 + 0.4;
    vec3 r = c + vec3(cos(a) * 0.105, 0.03, sin(a) * 0.105);
    cords = min(cords, sdCapsule(p, r, e - vec3(0.0, 0.01, 0.0), 0.0018));
  }
  return min(bowl, cords);
}
float scalesSD(vec3 p, out int part) {
  part = 0;
  vec3 q = p - SCB;
  if (length(q - vec3(0.0, 0.25, 0.0)) > 0.75) return length(q - vec3(0.0, 0.25, 0.0)) - 0.7;
  // base and post
  float base = sdCylY(q - vec3(0.0, 0.015, 0.0), 0.085, 0.015) - 0.004;
  float post = sdCapsule(q, vec3(0.0, 0.02, 0.0), vec3(0.0, 0.47, 0.0), 0.011);
  float knob = length(q - vec3(0.0, 0.5, 0.0)) - 0.016;
  vec3 a = beamEnd(-1.0), b = beamEnd(1.0);
  float beam = sdCapsule(p, a, b, 0.008);
  float ends = min(length(p - a) - 0.012, length(p - b) - 0.012);
  float d = min(min(base, post), min(knob, min(beam, ends)));
  float pans = min(panSD(p, -1.0), panSD(p, 1.0));
  if (pans < d) { part = 1; d = pans; }
  return d;
}
// the stone block the scales stand on
float blockSD(vec3 p) { return sdBox(p - vec3(SCB.x, SCB.y * 0.5, SCB.z), vec3(0.32, SCB.y * 0.5 - 0.01, 0.26)) - 0.01; }
// the lamp stand: a bronze rod on a tripod with a clay lamp on the dish
float lampSD(vec3 p) {
  vec3 q = p - vec3(LAMP.x, 0.0, LAMP.z);
  float bnd = max(length(q.xz) - 0.25, max(-q.y, q.y - LAMP.y - 0.05));
  if (bnd > 0.05) return bnd;
  float rod = sdCapsule(q, vec3(0.0, 0.05, 0.0), vec3(0.0, LAMP.y - 0.06, 0.0), 0.012);
  float dish = sdCylY(q - vec3(0.0, LAMP.y - 0.06, 0.0), 0.09, 0.006) - 0.003;
  float feet = 1e3;
  for (int i = 0; i < 3; i++) { float a = float(i) * 2.094; feet = min(feet, sdCapsule(q, vec3(0.0, 0.12, 0.0), vec3(cos(a) * 0.18, 0.0, sin(a) * 0.18), 0.01)); }
  vec3 l = q - vec3(0.0, LAMP.y - 0.025, 0.0);
  float lamp = sdEllipsoid(l, vec3(0.075, 0.03, 0.055));
  lamp = smax(lamp, -(length(l - vec3(0.0, 0.03, -0.01)) - 0.022), 0.01);
  float nozzle = sdCapsule(l, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.012, 0.085), 0.018);
  return min(min(rod, dish), min(feet, min(lamp, nozzle)));
}
// whole scene: id 1 stone, 2 floor, 3 bronze scales, 4 block, 5 lamp stand
float mapC(vec3 p, out int id) {
  float d = p.y + 0.6 * smoothstep(-2.0, -3.0, p.x) + 0.15 * smoothstep(5.0, 25.0, -p.x) * fbm(p.xz * 0.05, 2) * 0.0; id = 2;
  if (p.x < -2.0) d *= 0.8;
  float c = colonnadeSD(p); if (c < d) { d = c; id = 1; }
  float b = blockSD(p); if (b < d) { d = b; id = 4; }
  int part; float s = scalesSD(p, part); if (s < d) { d = s; id = 3; }
  float l = lampSD(p); if (l < d) { d = l; id = 5; }
  return d;
}
float marchC(vec3 ro, vec3 rd, out int id) {
  float t = 0.02;
  for (int i = 0; i < 160; i++) {
    float d = mapC(ro + rd * t, id);
    if (abs(d) < 0.0003 * t + 0.0002) return t;
    t += d * 0.9;
    if (t > 150.0) break;
  }
  id = 0; return -1.0;
}
vec3 normC(vec3 p) {
  vec2 e = vec2(0.0008, 0.0); int i;
  return normalize(vec3(mapC(p + e.xyy, i) - mapC(p - e.xyy, i), mapC(p + e.yxy, i) - mapC(p - e.yxy, i), mapC(p + e.yyx, i) - mapC(p - e.yyx, i)));
}
float shadowC(vec3 ro, vec3 rd, float maxT, float k) {
  float res = 1.0, t = 0.05; int id;
  for (int i = 0; i < 28; i++) {
    float h = mapC(ro + rd * t, id);
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.25);
    if (res < 0.01 || t > maxT) break;
  }
  return sat(res);
}
float aoC(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0; int id;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i * i); o += w * (h - mapC(p + n * h, id)); w *= 0.7; }
  return sat(1.0 - o * 1.6);
}

float flick() { return 0.85 + 0.1 * vnoise(vec2(uTime * 7.0, 1.0)) + 0.05 * sin(uTime * 23.0); }
vec3 flameP() { return LAMP + vec3(0.0, 0.012, 0.085); }
vec3 lampCol() { return vec3(1.0, 0.56, 0.24) * 0.9 * flick(); }

// the open side: the pre-dawn sky and the land beyond the colonnade
vec3 openCol(vec3 rd) {
  // far hills on the horizon, and the dark land below them
  float az = atan(rd.z, rd.x);
  float hill = 0.012 + 0.03 * fbm(vec2(az * 2.5, 1.0), 4);
  vec3 sky = skyCol(vec3(rd.x, max(rd.y, 0.0) + 0.002, rd.z));
  if (rd.y > hill) return sky;
  vec3 land = mix(vec3(0.025, 0.028, 0.038), hazeCol(rd) * 0.5, exp(-max(hill - rd.y, 0.0) * 40.0) * 0.7);
  return land;
}
// what a metal surface reflects
vec3 envC(vec3 r, vec3 p) {
  vec3 c = mix(vec3(0.006, 0.006, 0.008), vec3(0.06, 0.075, 0.11) * 1.5, smoothstep(0.2, -0.8, r.x));   // cold open side
  vec3 L = flameP() - p; float dl = length(L);
  c += lampCol() * 0.6 * pow(sat(dot(r, L / dl)), 300.0) / (0.2 + dl);
  c += vec3(1.0, 0.5, 0.2) * 0.02 * sat(r.x) * uWarm;
  return c;
}

vec3 cheekLight(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, float metal, float ao) {
  vec3 col = vec3(0);
  vec3 f0 = mix(vec3(0.04), alb, metal);
  // cold sky light from the open side, with soft shadows
  float sc = length(p.xz) < PR + 0.16 && p.y > 0.4 ? 1.0 : shadowC(p + n * 0.012, COLD_DIR, 6.0, 6.0);
  vec3 cold = vec3(0.26, 0.33, 0.48) * (1.0 - 0.45 * uWarm);
  col += alb * (1.0 - metal) * cold * sat(dot(n, COLD_DIR)) * sc;
  col += cold * f0 * ggx(n, COLD_DIR, v, rough) * sc * 3.0;
  // fill from the sky, mostly from the open side
  col += alb * (1.0 - metal) * vec3(0.05, 0.064, 0.095) * (0.5 + 0.5 * sat(-n.x)) * (1.0 - 0.4 * uWarm) * ao;
  // the lamp
  vec3 L = flameP() + vec3(0.0, 0.02, 0.0) - p; float d2 = dot(L, L); L *= inversesqrt(d2);
  // the pillar is convex, so n.l is its own shadow; everything else is shadowed by marching
  float sl = length(p.xz) < PR + 0.16 && p.y > 0.4 ? 1.0 : shadowC(p + n * 0.012, L, sqrt(d2) - 0.03, 6.0);
  vec3 lc = lampCol() * 0.3 / (0.02 + d2);
  col += alb * (1.0 - metal) * lc * sat(dot(n, L)) * sl;
  col += lc * f0 * ggx(n, L, v, rough) * sl;
  col += alb * (1.0 - metal) * vec3(0.012, 0.014, 0.02) * ao;
  // the lamp's light bounced off the warm wall behind
  col += alb * (1.0 - metal) * vec3(0.05, 0.026, 0.012) * flick() * sat(n.x * 0.5 + 0.5) * ao * smoothstep(-2.0, 1.0, p.x);
  return col * mix(1.0, ao, 0.6);
}

// the flame (after the oil-lamp flames of the film): a teardrop standing up from the nozzle
vec3 flameDraw(vec3 ro, vec3 rd, float depth) {
  vec3 b = flameP();
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  vec3 col = vec3(0);
  if (t > 0.0 && t < depth + 0.01) {
    vec3 q = ro + rd * t - b;
    float hh = 0.038 * (0.9 + 0.2 * vnoise(vec2(uTime * 6.0, 2.0)));
    float y = q.y / hh;
    if (y > -0.4 && y < 1.5) {
      float sw = (vnoise(vec2(uTime * 1.9, 3.0)) - 0.5) * 0.5;
      vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.25 * y * y;
      float x = length(rr) / (hh * 0.24);
      float yy = clamp(y, 0.0, 1.0);
      float prof = pow(yy, 0.5) * pow(1.0 - yy, 0.75) * 1.9 + 0.08;
      float body = smoothstep(1.0, 0.55, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.15, 0.85, y);
      float core = smoothstep(0.55, 0.15, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.75, 0.35, y);
      col += (vec3(1.0, 0.55, 0.22) * body * 6.0 + vec3(1.0, 0.88, 0.66) * core * 20.0) * flick();
    }
  }
  // the glow it hangs in the air
  vec3 oc = b + vec3(0.0, 0.015, 0.0) - ro; float tc = dot(oc, rd);
  if (tc > 0.0 && tc < depth + 0.05) {
    float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
    col += vec3(1.0, 0.62, 0.3) * flick() * (0.25 * exp(-h / 0.012) + 0.03 * exp(-h / 0.08));
  }
  return col;
}

vec3 cheekScene(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; float t = marchC(ro, rd, id);
  vec3 col; float depth = 60.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normC(p), v = -rd;
    depth = t;
    float ao = aoC(p, n);
    vec3 alb; float rough = 0.8, metal = 0.0;
    if (id == 1 || id == 4) {
      alb = vec3(0.44, 0.41, 0.37) * (0.78 + 0.3 * fbm(p * 2.5, 4));
      alb *= 0.85 + 0.2 * fbm(p * 30.0, 2);
      if (p.x > 4.5) alb *= 0.15;                                           // the plastered back wall
      rough = 0.85;
    } else if (id == 2) {
      // stone flags
      vec2 g = p.xz * vec2(1.4, 1.0); vec2 f = abs(fract(g) - 0.5);
      float joint = smoothstep(0.485, 0.5, max(f.x, f.y));
      alb = vec3(0.30, 0.28, 0.25) * (0.7 + 0.4 * hash12(floor(g))) * (0.8 + 0.3 * fbm(p.xz * 6.0, 3));
      alb *= 1.0 - 0.6 * joint;
      rough = 0.6 + 0.3 * fbm(p.xz * 3.0, 2);
    } else if (id == 3 || id == 5) {
      // bronze, darkened, a green patina in the hollows, bright where hands have worn it
      float pat = smoothstep(0.45, 0.7, fbm(p * 60.0, 3));
      alb = mix(vec3(0.62, 0.42, 0.22), vec3(0.16, 0.24, 0.18), pat * 0.7);
      metal = 1.0 - pat * 0.6; rough = mix(0.28, 0.7, pat);
      if (id == 5 && p.y > LAMP.y - 0.06) { alb = vec3(0.38, 0.2, 0.12); metal = 0.0; rough = 0.7; }  // the clay lamp
    }
    col = cheekLight(p, n, v, alb, rough, metal, ao);
    if (metal > 0.0) {
      vec3 r = reflect(rd, n);
      vec3 F = alb + (1.0 - alb) * pow(1.0 - sat(dot(n, v)), 5.0);
      col += envC(r, p) * F * metal * (1.0 - rough * 0.6) * ao;
    }
    if (id == 2 && p.x < -2.0) { alb = vec3(0.12, 0.11, 0.08) * (0.7 + 0.5 * fbm(p.xz * 2.0, 3)); col = cheekLight(p, n, v, alb, 0.95, 0.0, ao); }
    // the open side: haze in the cold air beyond the pillars
    col = mix(col, vec3(0.05, 0.06, 0.085), 1.0 - exp(-max(t - 3.0, 0.0) * 0.05));
  } else {
    col = openCol(rd);
  }
  col += flameDraw(ro, rd, depth);
  // dust turning in the lamplight and in the cold light
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    vec3 mp = vec3(-1.4 + 2.8 * hash11(fi * 3.1), 0.4 + 1.8 * hash11(fi * 5.7), -1.4 + 2.8 * hash11(fi * 1.3));
    mp += vec3(sin(uTime * 0.23 + fi), sin(uTime * 0.17 + fi * 2.0) * 0.6 + uTime * 0.01, cos(uTime * 0.19 + fi * 1.7)) * 0.12;
    vec3 oc = mp - ro; float tc = dot(oc, rd);
    if (tc < 0.0 || tc > depth) continue;
    float h2 = dot(oc, oc) - tc * tc;
    float warm = smoothstep(1.5, 0.3, length(mp - LAMP));
    col += mix(vec3(0.5, 0.6, 0.8), vec3(1.0, 0.7, 0.4), warm) * 0.0000015 / (0.000002 + max(h2, 0.0)) * (0.3 + warm);
  }
  return any(isnan(col)) ? vec3(0.0) : col;
}
`;
