// s29's world: a supper table by lamplight. In front, a small turned wooden bowl heaped with coarse
// salt (the grains are the salt world's refracting crystals, ~3.5 mm each); behind it and to the
// right, a round flat loaf broken in two, its torn crumb facing the lamp. The clay lamp burns behind
// on the left, far enough back to be a soft bokeh flame; its light runs through the salt in sparks and
// lies warm on the bread's crust. Metres; the table top is y = 0. Focus is set by the scene.
import { VESSEL_GLSL } from '/song/lib/x-vessel.js';
import { SALT_GLSL } from '/song/lib/x-salt.js';

export const TABLE_UNIFORMS = { uFocus: 0.3, uAper: 0.004 };

export const TABLE_GLSL = SALT_GLSL + VESSEL_GLSL + /* glsl */ `
uniform float uFocus, uAper;
const float G = 0.0036;                       // one salt grain cell, metres
const float BS = 0.62;                        // the bowl's scale
const vec3 BOWLP = vec3(0.0);
const vec3 LAMPP = vec3(-0.25, 0.13, 0.2);     // on a little clay stand     // the clay lamp, behind left
vec3 flameP() { return lampWickTip(LAMPP) + vec3(0.002, 0.003, 0.0); }
vec3 flameC() { return vec3(1.0, 0.7, 0.42) * (0.88 + 0.12 * vnoise(vec2(uTime * 8.0, 2.0))); }
vec3 FLAMEGLOW() { return flameP() + vec3(0.0, 0.012, 0.0); }

// ---- the salt in the bowl (grain units) ----
float heapW(vec2 xz) {   // world height of the salt surface at xz (inside the bowl)
  float r = length(xz - BOWLP.xz) / (0.073);
  return 0.034 + 0.016 * (1.0 - r * r) + 0.002 * (fbm(xz * 60.0, 2) - 0.5);
}
float saltBedH(vec2 q) { return heapW(q * G) / G; }
float saltKeep(vec3 c, float layer) {
  vec2 xz = c.xz * G;
  float r = length(xz - BOWLP.xz);
  float inner = bowlInnerR(heapW(xz) / BS) * BS;
  return smoothstep(inner - 0.002, inner - 0.006, r) * (layer > 0.5 ? 0.9 : 1.0);
}
vec3 saltKeyDir(vec3 p, out vec3 col) {
  vec3 w = p * G; vec3 L = FLAMEGLOW() - w; float d2 = dot(L, L);
  col = flameC() * 0.3 / d2;
  return L * inversesqrt(d2);
}
vec3 saltLight(vec3 p, vec3 d) {
  vec3 w = p * G; vec3 L = FLAMEGLOW() - w; float dist = length(L); L /= dist;
  float a = acos(clamp(dot(d, L), -1.0, 1.0));
  float r = 0.016 / dist;     // the flame's angular size (with its glow)
  return flameC() * (smoothstep(r, r * 0.4, a) * 90.0 + exp(-a / (r * 4.0)) * 1.0);
}
vec3 saltEnv(vec3 p, vec3 d) {
  // the warm dark room; below, the bowl's wood and the other grains
  vec3 c = vec3(0.05, 0.035, 0.022) + flameC() * 0.15 * pow(sat(dot(d, normalize(FLAMEGLOW() - p * G))), 4.0);
  // the lamplit wall behind the lens bounces a soft warm fill onto the near faces
  c += vec3(0.16, 0.11, 0.07) * pow(sat(dot(d, normalize(vec3(0.3, 0.4, -1.0)))), 2.0);
  // below: more salt, lit through by the lamp
  if (d.y < 0.0) c = vec3(0.3, 0.24, 0.17) * (0.6 + 0.4 * sat(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-4), normalize(FLAMEGLOW().xz - p.xz * G).xyy * vec3(1, 0, 1))));
  return c;
}

// ---- the bread: a round flat loaf broken in two ----
// each half is the loaf (a flattened ellipsoid about its centre C) cut by a ragged tear through C;
// the tear faces turn toward each other and the lens
vec3 breadC(int k) { return k == 0 ? vec3(0.235, 0.0, 0.2) : vec3(0.125, 0.0, 0.165); }
float breadYaw(int k) { return k == 0 ? -2.3 : -2.7; }
float breadHalf(vec3 p, int k, out float cut) {
  vec3 q = p - breadC(k);
  q.xz = rot(breadYaw(k)) * q.xz;
  q.x += 0.012;    // the halves pulled a little apart
  float lumps = 0.003 * fbm(q.xz * 50.0 + float(k) * 3.0, 3);
  float loaf = sdEllipsoid(q - vec3(0.012, 0.016, 0.0), vec3(0.068, 0.027 + lumps, 0.068));
  loaf = max(loaf, -q.y);
  // the tear: ragged, torn across the crumb
  float tear = q.x - 0.006 * fbm(q.yz * 70.0 + float(k) * 5.0, 4) - 0.003 * sin(q.z * 90.0 + q.y * 40.0);
  cut = tear;
  return max(loaf, tear);
}
float breadSD(vec3 p, out int which, out float cut) {
  float c0, c1;
  float a = breadHalf(p, 0, c0), b = breadHalf(p, 1, c1);
  if (a < b) { which = 0; cut = c0; return a; }
  which = 1; cut = c1; return b;
}

float mapT(vec3 p, out int id) {
  float d = bowlSD(p / BS, BOWLP) * BS; id = 1;
  int w; float cut;
  float b = breadSD(p, w, cut);
  if (b < d) { d = b; id = 2; }
  float lp = min(lampSD(p, LAMPP), sdCapsule(p, vec3(LAMPP.x, 0.0, LAMPP.z), LAMPP - vec3(0.0, 0.004, 0.0), 0.022 - 0.06 * max(0.0, p.y - 0.11)));
  if (lp < d) { d = lp; id = 3; }
  float tb = p.y - tableH(p.xz);
  if (tb < d) { d = tb; id = 4; }
  float wall = 1.4 - p.z;
  if (wall < d) { d = wall; id = 5; }
  return d;
}
vec3 normT(vec3 p) {
  int i; const vec2 e = vec2(1.0, -1.0) * 0.0002;
  return normalize(e.xyy * mapT(p + e.xyy, i) + e.yyx * mapT(p + e.yyx, i) + e.yxy * mapT(p + e.yxy, i) + e.xxx * mapT(p + e.xxx, i));
}
float marchT(vec3 ro, vec3 rd, out int id) {
  float t = 0.01;
  for (int i = 0; i < 140; i++) {
    float d = mapT(ro + rd * t, id);
    if (d < 0.0001 + 0.0002 * t) return t;
    t += d * 0.9;
    if (t > 4.0) break;
  }
  id = -1; return -1.0;
}
float shadowT(vec3 p, vec3 L, float maxt) {
  // a jittered start and smooth penumbra estimate, so the shadow edge never bands
  float res = 1.0, t = 0.003 + 0.006 * hash13(p * 3000.0 + uJitter.xyx * 17.0); int id;
  float ph = 1e10;
  for (int i = 0; i < 32; i++) {
    float h = mapT(p + L * t, id);
    float y = h * h / (2.0 * ph);
    float d = sqrt(max(h * h - y * y, 0.0));
    res = min(res, 10.0 * d / max(t - y, 1e-4));
    ph = h;
    t += clamp(h, 0.002, 0.025);
    if (res < 0.01 || t > maxt) break;
  }
  return sat(res);
}

vec3 breadAlb(vec3 p, vec3 n, int k, float cut, out float rough) {
  vec3 q = p - breadC(k);
  q.xz = rot(breadYaw(k)) * q.xz;
  q.x += 0.012;
  float onCut = smoothstep(0.0012, -0.0004, abs(cut));
  // crust: deep gold-brown on top, paler near the base, small blisters, a dusting of flour
  float top = sat(n.y);
  float bl = fbm(q.xz * 420.0 + q.y * 200.0, 3);
  vec3 crust = mix(vec3(0.5, 0.3, 0.13), vec3(0.3, 0.15, 0.06), top * (0.6 + 0.4 * fbm(q.xz * 60.0, 2)));
  crust *= 0.85 + 0.3 * bl;
  crust = mix(crust, vec3(0.6, 0.45, 0.28), smoothstep(0.012, 0.0, q.y) * 0.5);
  float flour = smoothstep(0.58, 0.75, fbm(q.xz * 110.0 + 3.0, 4)) * top;
  crust = mix(crust, vec3(0.8, 0.76, 0.68), flour * 0.55);
  // crumb: open and creamy, with dark pores of every size
  vec2 cuv = vec2(q.z, q.y) * 420.0 + float(k) * 13.0;
  vec2 ve = voronoiEdge(cuv);
  vec2 ve2 = voronoiEdge(cuv * 2.7 + 5.0);
  float pore = step(0.5, hash11(ve.y * 31.0)) * smoothstep(0.22, 0.0, 0.5 - ve.x) ;
  vec3 crumb = vec3(0.78, 0.66, 0.47) * (0.85 + 0.25 * vnoise(cuv * 0.3));
  crumb *= 1.0 - 0.7 * step(0.55, hash11(ve.y * 31.0)) * smoothstep(0.1, 0.35, ve.x);
  crumb *= 1.0 - 0.5 * step(0.6, hash11(ve2.y * 17.0)) * smoothstep(0.1, 0.3, ve2.x);
  // the crust rim round the torn face
  float skin = -sdEllipsoid(q - vec3(0.012, 0.016, 0.0), vec3(0.068, 0.027, 0.068));
  crumb = mix(crumb, crust, smoothstep(0.004, 0.0015, skin));
  rough = mix(0.6, 0.95, onCut);
  return mix(crust, crumb, onCut);
}

vec3 shadeT(vec3 p, vec3 rd, int id) {
  vec3 n = normT(p), v = -rd;
  vec3 alb; float rough;
  if (id == 1) alb = bowlAlb(p / BS, BOWLP, rough);
  else if (id == 2) { int w; float cut; breadSD(p, w, cut); alb = breadAlb(p, n, w, cut, rough); }
  else if (id == 3) alb = clayAlb(p, smoothstep(0.05, 0.075, p.x - LAMPP.x) * 0.8, rough) * 0.6;
  else if (id == 4) alb = tableAlb(p, rough) * 1.2;
  else { alb = stoneAlb(p, vec3(0, 0, -1), rough) * 0.3; }
  vec3 Lf = FLAMEGLOW() - p; float df = length(Lf); Lf /= df;
  vec3 col = brdf(n, v, Lf, alb, rough, flameC() * 0.3 / (df * df + 0.0004) * shadowT(p + n * 0.001, Lf, df - 0.012));
  // a cool faint fill from the night window on the right, and the bounce off the table
  col += alb * vec3(0.012, 0.016, 0.026) * (0.5 + 0.5 * n.x);
  col += alb * flameC() * 0.06 * (0.5 - 0.5 * n.y);
  // the bread's crumb lets a little light in
  if (id == 2) col += alb * flameC() * 0.1 * sat(dot(-n, Lf) + 0.6);
  return col;
}

vec3 table(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, uFocus, uAper, ro, rd0);
  int id;
  float t = marchT(ro, rd, id);
  vec3 col = vec3(0.0);
  float depth = 4.0;
  if (t > 0.0) { col = shadeT(ro + rd * t, rd, id); depth = t; }
  // the salt heaped in the bowl: march the grain field in grain units, only near the bowl
  {
    // bounding: a slab over the bowl
    vec3 bc = vec3(BOWLP.x, 0.04, BOWLP.z);
    vec3 oc = ro - bc; float bb = dot(oc, rd); float cc = dot(oc, oc) - 0.085 * 0.085;
    float disc = bb * bb - cc;
    if (disc > 0.0) {
      float t0 = max(-bb - sqrt(disc), 0.0), t1 = min(-bb + sqrt(disc), depth);
      if (t1 > t0) {
        vec3 cell;
        float ts = saltMarch(ro / G, rd, t0 / G, t1 / G, cell);
        // the bed of finer salt under the grains
        float tb = -1.0;
        {
          float tt = t0;
          for (int i = 0; i < 90; i++) {
            vec3 q = ro + rd * tt;
            float h = q.y - heapW(q.xz) + 0.002;
            if (h < 0.0002) { tb = tt; break; }
            tt += max(h * 0.6, 0.0008);
            if (tt > t1) break;
          }
          if (tb > 0.0) {
            vec3 q = ro + rd * tb;
            float r = length(q.xz - BOWLP.xz);
            if (r > bowlInnerR(heapW(q.xz) / BS) * BS - 0.002) tb = -1.0;
          }
        }
        if (ts > 0.0 && (tb < 0.0 || ts * G < tb)) {
          float oc2;
          col = saltShade(ro / G + rd * ts, rd, cell, oc2);
          depth = ts * G;
        } else if (tb > 0.0) {
          vec3 q = ro + rd * tb;
          vec2 e = vec2(0.002, 0.0);
          vec3 n = normalize(vec3(heapW(q.xz - e.xy) - heapW(q.xz + e.xy), 2.0 * e.x, heapW(q.xz - e.yx) - heapW(q.xz + e.yx)));
          col = saltBed(q / G, rd, n, 0.8) * 3.5;
          depth = tb;
        }
      }
    }
  }
  // the lamp's flame and the glow round it
  col += flameAt(ro, rd, flameP(), 0.028, 1.0, 3.0, depth);
  {
    vec3 og = FLAMEGLOW() - ro; float tg = dot(og, rd);
    if (tg > 0.0 && tg < depth + 0.02) {
      float hg = sqrt(max(dot(og, og) - tg * tg, 0.0));
      col += flameC() * (0.1 * exp(-hg / 0.006) + 0.03 * exp(-hg / 0.05));
    }
  }
  return col;
}
`;
