// The scroll world (s20-law, s21-fulfill, s22-mark): a Torah scroll open on a lectern in a dark stone
// synagogue. The lectern's top slopes gently away from the reader and is covered in dark wine velvet;
// the parchment lies open between its two wound rolls, each on a wooden roller with round plates and
// turned handles. An oil lamp burns on a bronze stand just beyond the lectern's far left corner, so the
// page is lit from above its top edge and the light falls away down the columns and across them.
// Behind: ashlar walls, stone columns and a few far lamps in their niches, out of focus in the dark.
//
// Lectern-local frame (everything about the scroll): x across the sheet (the writing's left-right),
// y the page's normal, z up the page (away from the reader). The page centre is the world origin.
// Ink comes from the canvas texture of lib/x-scroll-text.js: R = ink, G = the yod of s22.
// Uniforms (all functions of song time, set by the scenes):
//   uFocus, uAper        thin lens
//   uFill[5]             song time each column (right to left) fills with gold light (s21)
//   uGold                the whole page's gold swell 0..1, uYodGlow  the small mark's faint glow (s22)
//   uDust                the falling dust 0..1 (s22), uLamp lamp strength
import { TEX_X, TEX_Z, COL_PITCH, COL_W } from '/song/lib/x-scroll-text.js';
export { scrollCanvases } from '/song/lib/x-scroll-text.js';

export const TILT = 0.14;
const c = Math.cos(TILT), s = Math.sin(TILT);
// (lectern-local x: the reader looks along +z, so his right hand is -x; the writing starts at -x)
// lectern-local -> world (positions and directions)
export const toW = (p) => [p[0], c * p[1] + s * p[2], -s * p[1] + c * p[2]];
export const FLAME = [0.15, 0.26, 0.48];   // world position of the lamp flame's base

export const SCROLL_UNIFORMS = {
  uFocus: 0.4, uAper: 0.003,
  uFill: [1e4, 1e4, 1e4, 1e4, 1e4],
  uGold: 0, uYodGlow: 0, uDust: 0, uLamp: 1,
  uDetRect: [0, 0, 0, 0], uYod: [0, 0, 0],
  uMacro: 0, uTexDof: 0, uKeyPos: [0, 1, 0], uKeyK: 0,
};

const f = (x) => x.toFixed(4);
export const SCROLL_GLSL = /* glsl */ `
uniform sampler2D uInk, uDetail;
uniform float uFocus, uAper, uGold, uYodGlow, uDust, uLamp, uMacro, uTexDof;
uniform float uFill[5];
uniform vec4 uDetRect;
uniform vec3 uYod;            // the yod's centre in lectern-local coordinates
uniform vec3 uKeyPos; uniform float uKeyK;   // a second, near lamp off frame (s22), world position and strength

const float TC = ${f(c)}, TS = ${f(s)};
vec3 toL(vec3 p) { return vec3(p.x, TC * p.y - TS * p.z, TS * p.y + TC * p.z); }
vec3 toWd(vec3 p) { return vec3(p.x, TC * p.y + TS * p.z, -TS * p.y + TC * p.z); }
const float TEXX = ${f(TEX_X)}, TEXZ = ${f(TEX_Z)}, CP = ${f(COL_PITCH)}, CW = ${f(COL_W)};
const vec3 FL = vec3(${FLAME.map(f).join(', ')});
const float RR = 0.062;           // radius of the wound parchment
const float RD = 0.082;           // radius of the roller plates (the rolls rest on them)
const float RX = 0.352;           // roll axis |x|
const float SZ = 0.262;           // sheet half height
const float FLOOR = -1.02;

// ---------------- geometry ----------------
float sdCylZ(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xy), p.z)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

// the open sheet's height above the velvet: a little cockled, rising into each roll
float sheetH(vec2 q) {
  float ax = abs(q.x);
  float rise = smoothstep(0.255, 0.352, ax); rise = rise * rise * (RD - RR + RR * 0.55);
  float cock = 0.0011 * vnoise(q * vec2(9.0, 6.0) + 3.0) + 0.0004 * sin(q.x * 70.0 + 2.0 * sin(q.y * 9.0));
  return 0.0014 + cock + rise;
}

// material ids: 1 sheet, 2 wound roll, 3 wood, 4 velvet, 5 clay, 6 bronze, 7 stone column
float mapL(vec3 q, out int id) {
  // the velvet-covered top of the lectern (local)
  float d = sdBox(q - vec3(0.0, -0.035, 0.0), vec3(0.54, 0.03, 0.39)) - 0.006;
  id = 4;
  // the sheet (a thin heightfield slab, only over the open span)
  if (abs(q.x) < 0.37 && abs(q.z) < SZ + 0.01) {
    float hs = sheetH(q.xz);
    // solid from the velvet up to the skin (a heightfield: step it gently)
    float sd = max((q.y - hs) * 0.7, -q.y - 0.004);
    sd = max(sd, max(abs(q.z) - SZ, abs(q.x) - 0.36));
    if (sd < d) { d = sd; id = 1; }
  }
  // two rolls: wound parchment, plates, rollers, handles
  vec3 r = vec3(abs(q.x) - RX, q.y - RD, q.z);
  float bound = sdBox(r, vec3(0.1, 0.1, 0.5));
  if (bound < d) {
    float roll = sdCylZ(r, RR + 0.0008 * sin(atan(r.y, r.x) * 3.0 + q.z * 4.0), SZ);
    if (roll < d) { d = roll; id = 2; }
    vec3 pz = vec3(r.xy, abs(r.z) - SZ - 0.011);
    float plate = sdCylZ(pz, RD - 0.004, 0.007) - 0.003;
    float pole = sdCylZ(r, 0.013, 0.43);
    vec3 hz = vec3(r.xy, abs(r.z) - 0.38);
    float knob = sdEllipsoid(hz, vec3(0.021, 0.021, 0.045));
    float ring = sdCylZ(vec3(r.xy, abs(r.z) - 0.33), 0.019, 0.006) - 0.002;
    float wood = min(min(plate, pole), min(knob, ring));
    if (wood < d) { d = wood; id = 3; }
  }
  return d;
}
// world objects: the lamp on its bronze stand, the stone columns
float mapW(vec3 p, out int id) {
  id = 0;
  float d = 1e9;
  // lamp stand
  vec3 b = p - vec3(FL.x + 0.06, 0.0, FL.z);
  if (length(b.xz) < 0.2 && p.y < FL.y + 0.05) {
    float top = FL.y - 0.040;
    float pole = sdCylY(b - vec3(0.0, (FLOOR + top) * 0.5, 0.0), 0.011, (top - FLOOR) * 0.5);
    float dish = sdCylY(b - vec3(0.0, top, 0.0), 0.075, 0.005) - 0.003;
    float foot = sdCylY(b - vec3(0.0, FLOOR + 0.02, 0.0), 0.13, 0.02) - 0.005;
    float knot = sdEllipsoid(b - vec3(0.0, top - 0.45, 0.0), vec3(0.03, 0.04, 0.03));
    float br = min(min(pole, dish), min(foot, knot));
    if (br < d) { d = br; id = 6; }
    // the clay lamp: round body, filling hole, nozzle toward the flame
    vec3 l = p - vec3(FL.x + 0.05, FL.y - 0.014, FL.z);
    float body = sdEllipsoid(l, vec3(0.048, 0.022, 0.042));
    body = max(body, -sdEllipsoid(l - vec3(0.0, 0.022, 0.0), vec3(0.012, 0.01, 0.012)));
    float noz = sdCapsule(p, vec3(FL.x + 0.03, FL.y - 0.010, FL.z), vec3(FL.x + 0.002, FL.y - 0.002, FL.z), 0.010);
    float clay = smin(body, noz, 0.012);
    if (clay < d) { d = clay; id = 5; }
  }
  // stone columns of the hall
  vec2 cc = vec2(sign(p.x) * 1.75, clamp(floor((p.z + 1.2) / 1.8 + 0.5), 0.0, 2.0) * 1.8 - 1.2);
  float col = length(p.xz - cc) - 0.24 - 0.004 * vnoise(p * 12.0);
  if (col < d) { d = col; id = 7; }
  return d;
}
float mapS(vec3 p, out int id) {
  int i1; float d1 = mapL(toL(p), i1);
  int i2; float d2 = mapW(p, i2);
  if (d2 < d1) { id = i2; return d2; }
  id = i1; return d1;
}
float mapD(vec3 p) { int i; return mapS(p, i); }
// for shadows: everything but the thin sheet (its millimetre cockle would only shadow itself)
float mapSh(vec3 p) {
  vec3 q = toL(p);
  // the velvet (sunk a little, so the page never shades itself on it) and the rolls
  float d = sdBox(q - vec3(0.0, -0.045, 0.0), vec3(0.54, 0.03, 0.39));
  d = min(d, sdCylZ(vec3(abs(q.x) - RX, q.y - RD, q.z), RD, 0.45));
  int j; return min(d, mapW(p, j));
}
vec3 normS(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) + k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
}
float marchS(vec3 ro, vec3 rd, float tmax, out int id) {
  float t = 0.0;
  for (int i = 0; i < 180; i++) {
    float d = mapS(ro + rd * t, id);
    if (abs(d) < 0.00006 + 0.0004 * t) return t;
    t += d * 0.85;
    if (t > tmax) break;
  }
  id = 0; return -1.0;
}
float shadowS(vec3 p, vec3 L, float tmax) {
  float res = 1.0, t = 0.004;
  for (int i = 0; i < 40; i++) {
    float d = mapSh(p + L * t);
    // penumbra of a small flame (radius ~1.2 cm) seen from tmax away
    res = min(res, d * (tmax + 0.03) / (0.012 * t));
    t += clamp(d, 0.003, 0.06);
    if (res < 0.01 || t > tmax) break;
  }
  return sat(res);
}

// the room: analytic walls, floor and ceiling. Returns distance; n the normal.
float roomHit(vec3 ro, vec3 rd, out vec3 n) {
  float t = 1e9;
  vec3 lo = vec3(-3.4, FLOOR, -3.2), hi = vec3(3.4, 3.6, 3.8);
  for (int a = 0; a < 3; a++) {
    float dv = rd[a];
    if (abs(dv) < 1e-6) continue;
    float pl = dv > 0.0 ? hi[a] : lo[a];
    float tt = (pl - ro[a]) / dv;
    if (tt > 0.0 && tt < t) { t = tt; n = vec3(0); n[a] = -sign(dv); }
  }
  return t;
}

// ---------------- the lamp ----------------
float flick() { return 0.86 + 0.1 * vnoise(vec2(uTime * 7.3, 1.0)) + 0.05 * vnoise(vec2(uTime * 17.0, 4.0)); }
vec3 lampCol() { return vec3(1.0, 0.56, 0.24) * uLamp * flick(); }
vec3 flamePt() { return FL + vec3(0.001 * sin(uTime * 3.1), 0.014, 0.0); }

// one flame drawn where the ray passes its axis (an oil-lamp flame: a tall teardrop that leans and licks)
vec3 flameAt(vec3 ro, vec3 rd, vec3 b, float h, float depth, float blur) {
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = h * (0.88 + 0.24 * vnoise(vec2(uTime * 6.0, 1.0)));
  float y = q.y / hh;
  if (y < -0.4 || y > 1.6) return vec3(0);
  float sw = (vnoise(vec2(uTime * 2.1, 3.0)) - 0.5) * 0.7 + 0.25 * (vnoise(vec2(uTime * 9.0, 5.0)) - 0.5);
  vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.3 * y * y;
  float x = length(rr) / (hh * 0.21 + blur);
  float bk = (hh * 0.21) / (hh * 0.21 + blur);
  y = mix(y, 0.45 + (y - 0.45) * bk, 0.5);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.45) * pow(1.0 - yy, 0.8) * 1.9 + 0.07;
  float body = smoothstep(1.0, 0.5, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.2, 0.85, y);
  float core = smoothstep(0.55, 0.12, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.75, 0.3, y);
  float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.25, 0.0, y) * smoothstep(-0.25, 0.0, y);
  return (vec3(1.0, 0.5, 0.18) * body * 6.0 + vec3(1.0, 0.86, 0.62) * core * 20.0 + vec3(0.15, 0.3, 1.0) * root * 1.4) * uLamp * bk;
}

// far lamps in wall niches (positions in the room), and their glow on the stone
const int NL = 7;
vec3 nicheLamp(int i) {
  float fi = float(i);
  if (i < 3) return vec3(-3.3, 0.9 + 0.5 * hash11(fi * 3.3), -1.6 + fi * 1.9);
  if (i < 6) return vec3(-1.9 + (fi - 3.0) * 1.9, 1.0 + 0.4 * hash11(fi * 5.1), 3.7);
  return vec3(3.3, 1.1, 0.4);
}
float nicheK(int i) { return (0.55 + 0.45 * hash11(float(i) * 7.7)) * (0.9 + 0.1 * vnoise(vec2(uTime * 5.0, float(i) * 9.0))); }

// ---------------- the ink ----------------
// main ink texture or, round the yod, the detailed copy
vec2 inkUV(vec2 xz) { return vec2((TEXX - xz.x) / (2.0 * TEXX), (xz.y + TEXZ) / (2.0 * TEXZ)); }
vec2 inkAt(vec2 uv, float bias) {
  vec2 a = texture(uInk, uv, bias).rg;
  vec2 dq = (uv - uDetRect.xy) / (uDetRect.zw - uDetRect.xy);
  if (uMacro > 0.0 && all(greaterThan(dq, vec2(0.0))) && all(lessThan(dq, vec2(1.0)))) {
    vec2 e = smoothstep(vec2(0.0), vec2(0.12), dq) * smoothstep(vec2(1.0), vec2(0.88), dq);
    a = mix(a, texture(uDetail, dq, bias).rg, e.x * e.y);
  }
  return a;
}
// the same with an explicit level of detail (main texture level; the detail copy is 8x finer)
float gTexLod = -100.0;
vec2 inkAtL(vec2 uv, float lod) {
  vec2 a = textureLod(uInk, uv, max(lod, 0.0)).rg;
  vec2 dq = (uv - uDetRect.xy) / (uDetRect.zw - uDetRect.xy);
  if (uMacro > 0.0 && all(greaterThan(dq, vec2(0.0))) && all(lessThan(dq, vec2(1.0)))) {
    vec2 e = smoothstep(vec2(0.0), vec2(0.12), dq) * smoothstep(vec2(1.0), vec2(0.88), dq);
    a = mix(a, textureLod(uDetail, dq, max(lod + 3.0, 0.0)).rg, e.x * e.y);
  }
  return a;
}
vec2 inkSmp(vec2 uv, float bias) { return gTexLod > -50.0 ? inkAtL(uv, gTexLod + max(bias, 0.0)) : inkAt(uv, bias); }
// how far column k (0 = rightmost) has filled with gold at local z (top first)
float goldOf(vec2 xz) {
  float k = floor((xz.x + 2.0 * CP) / CP + 0.5);
  if (k < 0.0 || k > 4.0) return 0.0;
  float t0 = k < 0.5 ? uFill[0] : k < 1.5 ? uFill[1] : k < 2.5 ? uFill[2] : k < 3.5 ? uFill[3] : uFill[4];
  float x = uTime - t0;
  // the light rises out of the letters from the top of the column down, quickly
  float front = x * 1.3 - (SZ - xz.y) * 1.6;
  return sat(front * 3.0);
}

// ---------------- shading ----------------
vec3 parchAlb(vec2 q) {
  float n1 = fbm(q * 7.0, 4), n2 = fbm(q * 40.0 + 7.0, 3);
  vec3 a = vec3(0.80, 0.68, 0.50) * (0.82 + 0.25 * n1);
  a = mix(a, vec3(0.66, 0.52, 0.36), smoothstep(0.4, 0.9, fbm(q * 2.3 + 11.0, 4)) * 0.35);   // old stains, soft
  a *= 0.93 + 0.1 * n2;
  // follicle pores and fibres, seen close
  if (uMacro > 0.0) {
    float por = smoothstep(0.6, 0.85, fbm(q * 1900.0, 3)) * smoothstep(0.35, 0.7, fbm(q * 420.0 + 3.0, 2));
    a *= 1.0 - 0.1 * por;
    vec2 qr = mat2(0.94, -0.34, 0.34, 0.94) * q;
    a *= 1.0 - 0.06 * smoothstep(0.5, 0.85, fbm(qr * vec2(2600.0, 520.0) + 9.0, 3));   // fibres
  }
  return a;
}

vec3 lightLamp(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, float spec, bool shadow, out vec3 sp) {
  vec3 L = flamePt() + vec3(0.0, 0.012, 0.0) - p;
  float d2 = dot(L, L); L *= inversesqrt(d2);
  float nl = sat(dot(n, L));
  float sh = (shadow && nl > 0.0) ? shadowS(p + n * 0.0015, L, sqrt(d2) - 0.03) : 1.0;
  vec3 lc = lampCol() * 1.2 / (0.002 + d2) * sh;
  vec3 h = normalize(L + v); float nh = sat(dot(n, h));
  float a = max(0.04, rough * rough), a2 = a * a;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float F = spec + (1.0 - spec) * pow(1.0 - sat(dot(h, v)), 5.0);
  sp = lc * nl * a2 / (PI * dd * dd) * F * 0.25 * spec / 0.04;
  vec3 dif = lc * nl * alb / PI;
  if (uKeyK > 0.0) {
    vec3 K = uKeyPos - p; float k2 = dot(K, K); K *= inversesqrt(k2);
    float kl = sat(dot(n, K));
    vec3 kc = vec3(1.0, 0.58, 0.26) * flick() * uKeyK / (0.0005 + k2);
    vec3 hk = normalize(K + v); float nk = sat(dot(n, hk));
    float dk = nk * nk * (a2 - 1.0) + 1.0;
    sp += kc * kl * a2 / (PI * dk * dk) * 0.25 * spec / 0.04;
    dif += kc * kl * alb / PI;
  }
  return dif;
}
// cool moonlight from a high window, and a dim room ambient
const vec3 MOON = normalize(vec3(0.55, 0.8, -0.35));
vec3 ambient(vec3 n, vec3 alb) {
  return alb * (vec3(0.03, 0.04, 0.065) * (0.4 + 0.6 * sat(dot(n, MOON))) + vec3(0.03, 0.017, 0.008));
}

vec3 stoneAlb(vec3 p, vec3 n) {
  // ashlar: blocks with mortar joints
  vec2 uv = abs(n.x) > 0.5 ? p.zy : abs(n.z) > 0.5 ? p.xy : p.xz;
  vec2 bs = vec2(0.62, 0.34);
  float row = floor(uv.y / bs.y);
  vec2 g = vec2(uv.x / bs.x + 0.5 * mod(row, 2.0), uv.y / bs.y);
  vec2 fq = fract(g), id = floor(g);
  float joint = smoothstep(0.0, 0.025, min(min(fq.x, 1.0 - fq.x) * bs.x, min(fq.y, 1.0 - fq.y) * bs.y) * 3.0);
  float tone = 0.8 + 0.35 * hash12(id) ;
  vec3 a = vec3(0.42, 0.37, 0.31) * tone * (0.75 + 0.4 * fbm(uv * 6.0, 4));
  return a * mix(0.45, 1.0, joint);
}

// the gold light of the filled letters, read from a blurred ink level (light spreading round them)
float goldGlow(vec2 xz) {
  if (abs(xz.x) > 0.36 || abs(xz.y) > SZ) return 0.0;
  vec2 uv = inkUV(xz);
  float g = 0.0;
  g += texture(uInk, uv, 4.0).r * 0.6 + texture(uInk, uv, 6.5).r * 0.8;
  return g * goldOf(xz);
}

vec3 scroll(vec2 fc) {
  vec3 ro; vec3 rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 upv = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, upv)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  vec3 rd = normalize(fp - ro);

  vec3 rn; float troom = roomHit(ro, rd, rn);
  int id;
  float t = marchS(ro, rd, min(troom, 6.0), id);
  vec3 col; float depth;
  vec3 gold = vec3(1.0, 0.68, 0.26);
  float goldTot = uGold;
  if (t > 0.0 && id == 1) {
    // refine the hit on the skin exactly (secant on its height function)
    float ta = t - 0.004, tb = t + 0.004;
    vec3 qa = toL(ro + rd * ta), qb = toL(ro + rd * tb);
    float fa = qa.y - sheetH(qa.xz), fb = qb.y - sheetH(qb.xz);
    for (int k = 0; k < 6; k++) {
      float tm = ta + (tb - ta) * fa / (fa - fb + 1e-9);
      vec3 qm = toL(ro + rd * tm); float fm = qm.y - sheetH(qm.xz);
      if (fm * fa > 0.0) { ta = tm; fa = fm; } else { tb = tm; fb = fm; }
    }
    if (fa * fb <= 0.0) t = ta + (tb - ta) * fa / (fa - fb + 1e-9);
  }
  if (t > 0.0) {
    depth = t;
    vec3 p = ro + rd * t, v = -rd;
    vec3 n = normS(p, 0.00004 + 0.0002 * t);
    vec3 alb; float rough = 0.6, spec = 0.04; vec3 emit = vec3(0);
    bool shad = true;
    float edgeFade = 1.0;
    if (id == 1) {
      vec3 q = toL(p);
      // the skin's own normal, from its height function (smoother than the field's gradient)
      { float e = 0.0006; float h0 = sheetH(q.xz);
        vec3 ns = normalize(vec3(-(sheetH(q.xz + vec2(e, 0.0)) - h0) / e, 1.0, -(sheetH(q.xz + vec2(0.0, e)) - h0) / e));
        if (abs(q.z) < SZ - 0.0005 && q.y > 0.0) n = toWd(ns); }
      alb = parchAlb(q.xz);
      vec2 uv = inkUV(q.xz);
      // scored ruling lines (sirtut) the letters hang from
      // ink: sample (with fibres feathering the edges when seen close)
      vec2 wob = (vec2(vnoise(q.xz * 9000.0), vnoise(q.xz * 9000.0 + 5.0)) - 0.5) * 0.00010 * uMacro;
      // depth of field drawn into the writing itself (a smooth blur by mip level), for the macro
      float bl = -0.3;
      if (uTexDof > 0.0) {
        float coc = uTexDof * abs(t - uFocus) / uFocus;
        float pxw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
        bl = log2(max(coc / pxw, 0.75));
        wob *= sat(1.5 - bl);
        float cosi = max(abs(dot(n, rd)), 0.15);
        gTexLod = log2(max(coc, pxw / sqrt(cosi)) / (2.0 * TEXX / ${f(6144)}));
        bl = 0.0;
      }
      vec2 ik = inkSmp(uv + wob / (2.0 * vec2(TEXX, TEXZ)), bl);
      float ink = smoothstep(0.25, 0.75, ik.r);
      // the ink sits a little proud of the skin: bump from its gradient
      vec2 e = vec2(0.6 / ${f(6144)}, 0.0);
      e *= uMacro > 0.0 ? 0.125 : 1.0;
      float ix = inkSmp(uv + e.xy, 0.0).r - inkSmp(uv - e.xy, 0.0).r;
      float iz = inkSmp(uv + e.yx * 1.0, 0.0).r - inkSmp(uv - e.yx, 0.0).r;
      vec3 nl = toL(n + p) - toL(p);
      nl = normalize(nl + vec3(-ix, 0.0, -iz) * 0.35);
      if (uMacro > 0.0) {
        vec2 qq = q.xz * 500.0;
        float h0 = fbm(qq, 3), hx = fbm(qq + vec2(0.05, 0.0), 3), hz = fbm(qq + vec2(0.0, 0.05), 3);
        nl = normalize(nl + vec3(-(hx - h0), 0.0, -(hz - h0)) * 0.3);
      }
      n = toWd(nl);
      vec3 inkC = vec3(0.025, 0.02, 0.018) * (0.8 + 0.4 * vnoise(q.xz * 3000.0));
      alb = mix(alb, inkC, ink);
      if (uTexDof > 0.0) {
        // the page's far edge, blurred by the lens: let it melt into the velvet beyond
        float coc = uTexDof * abs(t - uFocus) / uFocus;
        alb = mix(vec3(0.075, 0.012, 0.02), alb, smoothstep(-coc, coc, SZ - q.z));
      }
      rough = mix(0.62, 0.42, ink); spec = mix(0.03, 0.035, ink);
      // gold from within the letters (s21) and the small mark's glow (s22)
      float g = goldOf(q.xz);
      float gk = ink * g;
      // a rich gold body with a hotter core where the stroke is thickest
      float core = smoothstep(0.85, 1.0, inkAt(uv, 1.2).r);
      emit += (vec3(1.0, 0.5, 0.12) * 1.5 + vec3(1.0, 0.8, 0.45) * 1.6 * core) * gk * (0.85 + 0.3 * vnoise(q.xz * 60.0 + uTime * 0.6)) * (0.8 + 0.4 * uGold);
      alb *= 1.0 - 0.6 * gk;
      emit += vec3(1.0, 0.6, 0.22) * 0.5 * goldGlow(q.xz) * alb;          // the parchment lit by the letters
      // the small mark: still ink, but lit faintly from within (the glow sits inside its edges)
      float yc = exp(-dot(q.xz - uYod.xz, q.xz - uYod.xz) / (0.0014 * 0.0014));
      // a warm light inside the stroke, brightest at its heart (blurred mask), the edges still ink
      float yheart = inkSmp(uv, 2.5).g;
      float ymask = smoothstep(0.3, 0.8, ik.g);
      emit += (vec3(1.0, 0.4, 0.08) * 0.55 + vec3(1.0, 0.68, 0.32) * 0.55 * smoothstep(0.6, 0.95, yheart)) * ymask * yheart * yheart * uYodGlow * (0.92 + 0.08 * sin(uTime * 1.7));
      // halo of the yod spilling a little on the skin
      if (uYodGlow > 0.0) { float dy = length(q.xz - uYod.xz); emit += alb * vec3(1.0, 0.6, 0.26) * uYodGlow * (0.5 * exp(-dy / 0.0012) + 0.15 * exp(-dy / 0.004)) * (1.0 - ink); }
      // settled dust specks (s22)
      if (uDust > 0.0) {
        for (int i = 0; i < 40; i++) {
          float fi = float(i);
          float land = ${f(0)} + fi * 0.13 + hash11(fi * 3.1) * 0.6;
          vec2 sp2 = uYod.xz + (hash22(vec2(fi, 7.0)) - 0.5) * vec2(0.03, 0.02);
          if (length(sp2 - uYod.xz) < 0.0026) continue;           // nothing settles on the mark
          float k = smoothstep(0.0, 0.3, uDust * 7.0 - land);
          float ds = length(q.xz - sp2);
          alb = mix(alb, vec3(0.55, 0.5, 0.44), k * smoothstep(0.00012 + 0.00008 * hash11(fi), 0.0, ds) * 0.8);
        }
      }
    } else if (id == 2) {
      // the back of the wound parchment, darker and suede-like, with the layers' edges at the ends
      vec3 q = toL(p);
      alb = vec3(0.6, 0.48, 0.33) * (0.75 + 0.3 * fbm(q.yz * vec2(30.0, 8.0), 3));
      rough = 0.75;
    } else if (id == 3) {
      // dark polished olive wood with grain
      vec3 q = toL(p);
      float gr = fbm(vec2(q.z * 12.0, length(vec2(abs(q.x) - RX, q.y - RD)) * 260.0), 3);
      alb = vec3(0.24, 0.12, 0.05) * (0.6 + 0.6 * gr);
      rough = 0.32; spec = 0.05;
    } else if (id == 4) {
      // wine velvet: soft sheen at grazing angles
      vec3 q = toL(p);
      alb = vec3(0.075, 0.012, 0.02) * (0.85 + 0.25 * fbm(q.xz * 30.0, 3));
      // a gold embroidered band near the edge
      float edge = min(0.54 - abs(q.x), 0.39 - abs(q.z));
      float band = smoothstep(0.028, 0.03, edge) * smoothstep(0.048, 0.046, edge);
      alb = mix(alb, vec3(0.55, 0.38, 0.12), band * (0.6 + 0.4 * step(0.5, fract(q.x * 120.0 + q.z * 120.0))));
      rough = mix(0.9, 0.35, band); spec = mix(0.03, 0.4, band);
      float sheen = pow(1.0 - sat(dot(n, v)), 3.0);
      emit += vec3(0.5, 0.12, 0.12) * sheen * 0.1 * lampCol() * 0.11 / (0.002 + dot(flamePt() - p, flamePt() - p)) * 0.2;
      if (uTexDof > 0.0) {
        float coc = uTexDof * abs(t - uFocus) / uFocus;
        edgeFade = smoothstep(-coc, coc, 0.39 - q.z - 0.004) * smoothstep(-coc, coc, 0.54 - abs(q.x));
      }
    } else if (id == 5) {
      alb = vec3(0.26, 0.13, 0.07) * (0.7 + 0.5 * fbm(p.xz * 90.0 + p.y * 40.0, 4)); rough = 0.9;
      // the nozzle glows from the flame sitting on it
      emit += vec3(1.0, 0.45, 0.15) * 0.5 * exp(-length(p - FL - vec3(0.0, 0.008, 0.0)) / 0.006) * uLamp;
      shad = false; alb *= 0.12;   // (the flame sits right on it: keep its own light in proportion)
    } else if (id == 6) {
      alb = vec3(0.5, 0.33, 0.16) * (0.6 + 0.3 * fbm(p.xy * 50.0, 3)); rough = 0.35; spec = 0.6; alb *= 0.4;
    } else {
      alb = stoneAlb(p, n) * 0.8; rough = 0.9;
    }
    vec3 spc;
    col = emit + lightLamp(p, n, v, alb, rough, spec, shad && t < 3.0, spc) + spc + ambient(n, alb);
    col *= edgeFade;
    // the page's gold lighting what stands round it
    if (goldTot > 0.0 && id != 1) {
      vec3 gl = vec3(0.0, 0.03, 0.0) - p; float g2 = dot(gl, gl); gl *= inversesqrt(g2);
      col += alb * gold * goldTot * sat(dot(n, gl) * 0.7 + 0.3) * 0.03 / (0.01 + g2);
    }
  } else {
    // the stone room
    depth = troom;
    vec3 p = ro + rd * troom;
    vec3 n = rn;
    vec3 alb = stoneAlb(p, n);
    if (p.y > 3.5) alb *= 0.3;
    if (p.y < FLOOR + 0.001) alb = alb * 0.7;
    vec3 sp;
    col = lightLamp(p, n, -rd, alb, 0.9, 0.04, false, sp) + ambient(n, alb) * 1.2;
    for (int i = 0; i < NL; i++) {
      vec3 lp = nicheLamp(i); vec3 L = lp - p; float d2 = dot(L, L);
      col += alb * vec3(1.0, 0.55, 0.22) * nicheK(i) * 0.05 / (0.02 + d2) * sat(dot(n, normalize(L)) * 0.8 + 0.2);
    }
    col += alb * gold * goldTot * 0.08 / (0.5 + dot(p, p));
  }

  // far niche lamps (seen out of focus) and the main flame
  for (int i = 0; i < NL; i++) {
    vec3 lp = nicheLamp(i); vec3 oc = lp - ro; float tc = dot(oc, rd0);
    if (tc <= 0.0 || tc > depth + 0.1) continue;
    float h = length(oc - rd0 * tc);
    float coc = uAper * abs(tc - uFocus) / max(uFocus, 0.02) + 0.003 * tc;
    float k = nicheK(i);
    col += vec3(1.0, 0.6, 0.28) * k * 0.06 * (0.003 * 0.003) / (coc * coc) * smoothstep(coc, coc * 0.85, h) * (tc * tc) / max(tc * tc, 1.0);
  }
  // the flame through the pinhole ray, widened by the lens blur at its distance (smooth bokeh)
  {
    float tf = dot(flamePt() - uCamPos, rd0);
    float blur = uAper * abs(tf - uFocus) / max(uFocus, 0.01);
    col += flameAt(uCamPos, rd0, flamePt() - vec3(0.0, 0.004, 0.0), 0.034, depth + 0.05, blur);
  }
  // the glow a lens sees round the flame, and the lamp's light hanging in the air
  {
    vec3 c = flamePt() + vec3(0.0, 0.012, 0.0); vec3 oc = c - ro; float tc = dot(oc, rd);
    float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-7));
    if (tc > 0.0 && tc < depth + 0.05) col += lampCol() * (0.35 * exp(-h / 0.006) + 0.04 * exp(-h / 0.03) + 0.008 * exp(-h / 0.12));
    float g = (atan((min(depth, 8.0) - tc) / h) + atan(tc / h)) / h;
    col += lampCol() * g * 0.0009;
  }
  // gold light hanging in the air just above the page (s21): sample the glow a little above the sheet
  if (goldTot > 0.0 || uFill[0] < 1e3) {
    vec3 rl = toL(ro), dl = toL(ro + rd) - rl;
    for (int k = 0; k < 3; k++) {
      float hgt = 0.004 + 0.014 * float(k);
      float tt = (hgt - rl.y) / dl.y;
      if (tt > 0.0 && tt < depth) {
        vec3 q = rl + dl * tt;
        col += vec3(1.0, 0.55, 0.18) * goldGlow(q.xz) * 0.07 / (1.0 + float(k));
      }
    }
  }
  // dust drifting down through the lamplight (s22): soft discs, sized by their blur
  if (uDust > 0.0) {
    vec3 Y = toWd(uYod);
    for (int i = 0; i < 110; i++) {
      float fi = float(i);
      vec3 hh = hash33(vec3(fi, 1.7, 9.1));
      float bright = 0.4 + 1.2 * hash11(fi * 8.9) * hash11(fi * 2.2);
      float fall = 0.0018 + 0.0025 * hh.y;               // metres a second: slow, as dust falls in still air
      float ph = fract(hh.x + uTime * fall / 0.0185);
      vec3 pp = Y + toWd(vec3((hh.z - 0.5) * 0.036, 0.017 - ph * 0.0185, 0.002 + hash11(fi * 4.3) * 0.05));
      pp.x += 0.003 * sin(uTime * (0.6 + hh.y) + fi);
      pp.z += 0.003 * cos(uTime * (0.5 + hh.x) + fi * 1.3);
      vec3 oc = pp - uCamPos; float tc = dot(oc, rd0);
      if (tc <= 0.0 || tc > depth) continue;
      float h = length(oc - rd0 * tc);
      float coc = max(max(uAper, uTexDof) * abs(tc - uFocus) / uFocus, 0.00004 + 0.00003 * hh.z);
      float rp = 0.00012 + 0.00016 * hh.x;
      float a = smoothstep(coc, coc * 0.55, h) * min((rp * rp) / (coc * coc), 2.0);
      vec3 L = flamePt() - pp, K = uKeyPos - pp;
      float lit = uLamp * 0.11 / dot(L, L) + uKeyK / (0.0005 + dot(K, K));
      col += vec3(1.0, 0.72, 0.45) * a * lit * 2.2 * bright * uDust * smoothstep(0.0, 0.15, ph) * smoothstep(1.0, 0.85, ph);
    }
  }
  return col;
}
`;
