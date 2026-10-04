// Two fires across the water (s45-fires, s46-love), in the deep blue just before dawn. We stand on the
// near shore of a cove of the Sea of Galilee. Close by, on the shore stones, a campfire burns in its
// ring of stones: crossed logs, real flames, sparks, smoke lit from below, wet stones catching it, its
// reflection on the water. Across the cove, on a low dark headland, the other fire burns alone, a small
// warm point with its own reflection. In s46 a small boat with a lantern pushes off from our shore and
// crosses toward the far fire, its lantern trail glittering on the water; when it reaches the far side
// both fires brighten and the trail becomes one path of light joining them.
// Requires nothing before it (it includes the Galilee world and the boat).
import { BOAT_GLSL, BOAT_UNIFORMS } from '/song/lib/x-galilee-boat.js';

export const FIRE_A = [-0.9, 0.0, 6.3];        // the near fire (y is set from the ground in GLSL)
export const FIRE_B = [-24.0, 0.0, -71.5];     // the far fire, on the headland
export const PATH_A = [1.9, 0.0, 0.3];          // where the boat lies in the shallows by the fire and pushes off
export const PATH_B = [-21.5, 0.0, -64.5];     // where it touches the far shore
export const BOAT_YAW = Math.atan2(PATH_B[2] - PATH_A[2], PATH_B[0] - PATH_A[0]);

export const FIRES_UNIFORMS = {
  ...BOAT_UNIFORMS,
  uFA: FIRE_A, uFB: FIRE_B, uFAk: 1.0, uFBk: 1.0,
  uPathA: PATH_A, uPathB: PATH_B, uBoatK: -1.0, uJoin: 0.0,
  uBPos: [0, -50, 0], uBYaw: BOAT_YAW,
};

export const FIRES_GLSL = BOAT_GLSL + /* glsl */ `
uniform vec3 uFA, uFB, uPathA, uPathB;
uniform float uFAk, uFBk, uBoatK, uJoin;

// the headland across the cove: a low dark spit running out from the left
float spitH(vec2 p) {
  float ridge = 4.5 * exp(-pow((p.y + 74.0) / 16.0, 2.0)) * smoothstep(-8.0, -40.0, p.x);
  ridge *= 0.8 + 0.4 * fbm(p * 0.05, 3);
  return ridge + 1.2 * fbm(p * 0.3, 2) * step(0.3, ridge) - 1.4;
}
float groundF(vec2 p) { return max(landH(p, 3), spitH(p)); }

vec3 fireA() { return vec3(uFA.x, groundF(uFA.xz) + 0.06, uFA.z); }
vec3 fireB() { return vec3(uFB.x, groundF(uFB.xz) + 0.1, uFB.z); }

// ---- near objects: shore stones, the ring of stones, the logs ----
float stoneF(vec3 p) {
  vec2 cell = floor(p.xz / 0.45);
  vec2 h = hash22(cell + 11.0);
  vec2 c = (cell + 0.25 + 0.5 * h) * 0.45;
  float s = c.y - shoreZ(c.x);
  if (s < -1.4 || s > 3.0 || abs(c.x) > 9.0 || hash12(cell * 1.9) < 0.25) return 0.3;
  if (length(c - uFA.xz) < 0.75) return 0.3;
  float r = 0.06 + 0.14 * hash12(cell * 2.3);
  vec3 q = p - vec3(c.x, landH(c, 2) + r * 0.2, c.y);
  q.xz = rot2(hash12(cell) * 6.28) * q.xz;
  float d = sdEllipsoid(q, vec3(r * 1.3, r * 0.65, r));
  if (d < 0.03) d += 0.008 * (fbm(p * 22.0, 2) - 0.5);
  return d;
}
float ringF(vec3 p) {
  vec3 q = p - vec3(uFA.x, landH(uFA.xz, 2), uFA.z);
  float a = atan(q.z, q.x);
  float k = floor(a / 6.2831853 * 9.0 + 0.5);
  float ak = k / 9.0 * 6.2831853;
  vec3 c = vec3(cos(ak) * 0.48, 0.05, sin(ak) * 0.48);
  float r = 0.09 + 0.03 * hash11(k + 3.0);
  return sdEllipsoid(q - c, vec3(r * 1.2, r * 0.8, r)) + 0.006 * (fbm(p * 25.0, 2) - 0.5);
}
float logsF(vec3 p) {
  vec3 q = p - vec3(uFA.x, landH(uFA.xz, 2), uFA.z);
  float d = 1e9;
  for (int i = 0; i < 4; i++) {
    float a = float(i) * 1.7 + 0.4;
    vec3 dir = vec3(cos(a), 0.0, sin(a));
    d = min(d, sdCapsule(q, dir * 0.36 + vec3(0.0, 0.04, 0.0), -dir * 0.05 + vec3(0.0, 0.17, 0.0), 0.045 - 0.008 * float(i & 1)));
  }
  return d;
}
// id: 1 ground, 2 stone, 3 ring stone, 4 log
float mapF(vec3 p, out int id) {
  float d = (p.y - groundF(p.xz)) * 0.7; id = 1;
  if (length(p.xz - uFA.xz) < 12.0) {
    float s = stoneF(p); if (s < d) { d = s; id = 2; }
    if (length(p.xz - uFA.xz) < 0.8) {
      float r = ringF(p); if (r < d) { d = r; id = 3; }
      float l = logsF(p); if (l < d) { d = l; id = 4; }
    }
  }
  return d;
}
float mapFD(vec3 p) { int i; return mapF(p, i); }
float marchF(vec3 ro, vec3 rd, float tmax, out int id) {
  float t = 0.02;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float d = mapF(p, id);
    if (d < 0.0005 * t + 0.0002) return t;
    t += max(d, 0.002 * t);
    if (t > tmax) break;
  }
  id = 0; return -1.0;
}
vec3 normF(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.0008, 0.0008 * t);
  return normalize(e.xyy * mapFD(p + e.xyy) + e.yyx * mapFD(p + e.yyx) + e.yxy * mapFD(p + e.yxy) + e.xxx * mapFD(p + e.xxx));
}
float shadowF(vec3 ro, vec3 rd, float tmax) {
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 18; i++) {
    float h = mapFD(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.02, 0.3);
    if (res < 0.02 || t > tmax) break;
  }
  return sat(res);
}
float fireFlick(float seed) { return 0.8 + 0.2 * vnoise(vec2(uTime * 9.0, seed)) + 0.1 * sin(uTime * 23.0 + seed); }
vec3 fireCol() { return vec3(1.0, 0.5, 0.18); }
vec3 lightA() { return fireCol() * 0.55 * uFAk * fireFlick(1.0); }
vec3 lightB() { return fireCol() * 1.2 * uFBk * fireFlick(7.0); }

vec3 shadeF(vec3 p, vec3 rd, float t, int id) {
  vec3 n = normF(p, t), v = -rd;
  float wet = smoothstep(0.7, -0.1, p.z - shoreZ(p.x));
  float g = fbm(p * 11.0, 3);
  vec3 alb = mix(vec3(0.04, 0.038, 0.035), vec3(0.12, 0.105, 0.09), g);
  float rough = 0.8;
  vec3 emit = vec3(0);
  if (id == 1) { alb *= 0.8; rough = mix(0.85, 0.3, wet); }
  else if (id == 2) { rough = mix(0.7, 0.12, wet); }
  else if (id == 3) { alb = mix(vec3(0.03), vec3(0.09, 0.08, 0.07), g); alb = mix(alb, vec3(0.01), smoothstep(0.3, 0.0, length(p.xz - uFA.xz) - 0.38) * 0.7); rough = 0.8; }
  else {
    // charred wood with live embers in its cracks, hottest near the heart of the fire
    float crack = smoothstep(0.55, 0.75, fbm(p * vec3(60.0, 60.0, 60.0), 3));
    float heart = exp(-length(p - fireA()) / 0.18);
    alb = vec3(0.025, 0.02, 0.018);
    emit = vec3(1.0, 0.32, 0.06) * crack * heart * 3.0 * uFAk * fireFlick(3.0) + vec3(1.0, 0.25, 0.04) * heart * 0.25;
    rough = 0.9;
  }
  alb *= 1.0 - 0.4 * wet;
  vec3 col = emit;
  // the near fire
  vec3 fa = fireA() + vec3(0.0, 0.25, 0.0);
  vec3 L = fa - p; float d2 = dot(L, L); vec3 Ld = L * inversesqrt(d2);
  float sh = id == 4 ? 1.0 : shadowF(p + n * 0.01, Ld, sqrt(d2) - 0.3);
  col += alb / PI * lightA() * sat(dot(n, Ld)) / (d2 + 0.05) * (0.15 + 0.85 * sh);
  col += pointSpec(p, n, v, max(rough, 0.25), fa, lightA()) * sh * 0.5;
  // the far fire (on its own headland)
  vec3 fb = fireB() + vec3(0.0, 0.3, 0.0);
  vec3 Lb = fb - p; float db = dot(Lb, Lb);
  col += alb / PI * lightB() * sat(dot(n, Lb * inversesqrt(db))) / (db + 0.05);
  // the lantern
  vec3 Ll = uLant - p; float dl = dot(Ll, Ll);
  col += alb / PI * uLantCol * sat(dot(n, Ll * inversesqrt(dl))) / (dl + 0.05);
  // the pre-dawn sky
  vec3 amb = skyBase(normalize(n + vec3(0.0, 0.8, 0.0))) * (0.5 + 0.5 * n.y);
  col += alb * amb * 2.2;
  col += skyBase(reflect(rd, n)) * fresnelW(n, v) * (1.0 - rough) * 0.6;
  return col;
}

// the flames of a campfire: a cluster of tongues licking up off the logs
vec3 campFlames(vec3 ro, vec3 rd, vec3 c, float sz, float k, float seed, float depth) {
  vec3 acc = vec3(0);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float a = fi * 2.4 + seed;
    vec2 off = vec2(cos(a), sin(a)) * (0.05 + 0.1 * hash11(fi + seed)) * sz * (fi == 0.0 ? 0.0 : 1.0);
    float hh = sz * (0.46 - 0.035 * fi) * (0.7 + 0.6 * vnoise(vec2(uTime * 3.5, fi * 1.3 + seed)));
    acc += flameAt(ro, rd, c + vec3(off.x, 0.0, off.y), hh, k, seed + fi * 3.7, depth) * (0.16 - 0.012 * fi);
  }
  return acc;
}
// sparks rising off the near fire
vec3 fireSparks(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0);
  vec3 base = fireA() + vec3(0.0, 0.2, 0.0);
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float per = 1.1 + 0.9 * hash11(fi * 1.3);
    float ph = uTime / per + hash11(fi * 7.7);
    float age = fract(ph) * per;
    float cyc = floor(ph);
    vec3 h = hash33(vec3(fi, cyc, 3.0));
    vec3 sp = base + vec3((h.x - 0.5) * 0.25 + 0.15 * sin(age * 3.0 + fi) * age, age * (0.9 + 0.8 * h.y), (h.z - 0.5) * 0.25 + 0.12 * age * age);
    vec3 oc = sp - ro; float tc = dot(oc, rd);
    if (tc <= 0.0 || tc > depth) continue;
    float h2 = max(dot(oc, oc) - tc * tc, 0.0);
    float pr = pxAng() * tc * 1.2;
    float life = sat(1.0 - age / per);
    acc += vec3(1.0, 0.5, 0.15) * life * life * exp(-h2 / (pr * pr)) * 3.0 * uFAk;
  }
  return acc;
}
// smoke above the near fire, lit warm from below
vec4 fireSmoke(vec3 ro, vec3 rd, float depth) {
  vec3 c = fireA();
  vec3 acc = vec3(0); float tr = 1.0;
  // march only where the ray passes the column
  vec2 oc = ro.xz - c.xz; float b = dot(oc, rd.xz), cc = dot(oc, oc) - 1.2 * 1.2, a = dot(rd.xz, rd.xz);
  float disc = b * b - a * cc;
  if (disc < 0.0) return vec4(0, 0, 0, 1);
  float t0 = max((-b - sqrt(disc)) / a, 0.0), t1 = min((-b + sqrt(disc)) / a, depth);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  float dt = (t1 - t0) / 14.0;
  float j = hash12(gl_FragCoord.xy + fract(uTime * 7.0) * 37.0);
  for (int i = 0; i < 14; i++) {
    vec3 p = ro + rd * (t0 + (float(i) + j) * dt);
    float y = p.y - c.y;
    if (y < 0.25 || y > 3.5) continue;
    vec2 axis = c.xz + vec2(0.18, 0.1) * y * y * 0.25 + vec2(0.06 * sin(y * 2.0 - uTime * 1.3), 0.0);
    float r = 0.12 + 0.22 * y;
    float dd = length(p.xz - axis) / r;
    float n = fbm(vec3(p.x * 3.0, y * 2.0 - uTime * 0.9, p.z * 3.0), 3);
    float dens = smoothstep(1.0, 0.2, dd) * smoothstep(0.35, 0.75, n) * exp(-y * 0.7) * 0.9;
    if (dens <= 0.0) continue;
    vec3 lit = lightA() * 0.25 * exp(-y * 1.3) + skyBase(vec3(0, 1, 0)) * 1.5;
    float al = 1.0 - exp(-dens * dt * 3.0);
    acc += tr * al * lit * 0.6;
    tr *= 1.0 - al;
  }
  return vec4(acc, tr);
}

// all the lights in the scene along a ray (used directly and in the water's mirror)
vec3 fireLights(vec3 ro, vec3 rd, float depth, bool direct) {
  vec3 c = vec3(0);
  vec3 fa = fireA(), fb = fireB();
  c += campFlames(ro, rd, fa + vec3(0.0, 0.05, 0.0), 1.0, uFAk, 1.0, depth);
  c += glowAt(ro, rd, fa + vec3(0.0, 0.25, 0.0), depth, lightA() * 0.006, 0.003, 0.05);
  c += campFlames(ro, rd, fb, 2.2, uFBk, 9.0, depth) * 2.0;
  c += glowAt(ro, rd, fb + vec3(0.0, 0.3, 0.0), depth, lightB() * 0.012, 0.0007, 0.006);
  if (uBoatK >= 0.0) {
    c += flameAt(ro, rd, uLant - vec3(0.0, 0.05, 0.0), 0.085, 1.0, 5.0, depth) * 0.6;
    c += glowAt(ro, rd, uLant, depth, vec3(1.0, 0.6, 0.3) * length(uLantCol) * 0.02, 0.0015, 0.02);
  }
  if (direct) c += fireSparks(ro, rd, depth);
  return c;
}

// the lantern's trail on the water: glints along the boat's wake that linger, and on the join become
// one path of light from shore to shore
float trailOnWater(vec3 p, vec3 n) {
  if (uBoatK < 0.0) return 0.0;
  vec2 a = uPathA.xz, b = mix(uPathA.xz, uPathB.xz, sat(uBoatK));
  vec2 ab = b - a; float l2 = max(dot(ab, ab), 1e-4);
  float h = sat(dot(p.xz - a, ab) / l2);
  float dist = length(p.xz - a - ab * h);
  float behind = (1.0 - h) * sqrt(l2);                      // metres behind the boat
  float keep = mix(exp(-behind / 18.0), 1.0, uJoin);
  float w = 0.25 + 0.006 * behind;
  float glint = smoothstep(0.55, 0.95, vnoise(p.xz * vec2(3.0, 9.0) + vec2(uTime * 0.6, 0.0)) * (0.6 + 0.6 * n.x * 40.0 + 0.5));
  return exp(-dist * dist / (w * w)) * keep * (0.25 + glint);
}

vec3 firesShot(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  int id; float tn = marchF(ro, rd, min(tw, 160.0), id);
  int bid; float tb = uBoatK >= 0.0 ? marchBoat(ro, rd, min(tw, tn > 0.0 ? tn : 1e9), bid) : -1.0;
  vec3 col; float depth;
  if (tb > 0.0) { col = shadeBoat(ro + rd * tb, rd, bid); depth = tb; }
  else if (tn > 0.0) { col = shadeF(ro + rd * tn, rd, tn, id); depth = tn; }
  else {
    float tl = rd.y < 0.2 ? marchLand(ro, rd, 160.0, min(tw, 30000.0)) : -1.0;
    if (tl > 0.0) { col = landShade(ro + rd * tl, rd, tl); depth = tl; }
    else if (tw < 1e8) {
      vec3 p = ro + rd * tw; depth = tw;
      vec3 n = waterNormal(p.xz, tw), v = -rd;
      vec3 r = reflect(rd, n); r.y = abs(r.y);
      float F = fresnelW(n, v);
      vec3 refl; float trr;
      int rid; float tr = marchF(p + vec3(0.0, 0.004, 0.0), r, 120.0, rid);
      int rb; float trb = uBoatK >= 0.0 ? marchBoat(p + vec3(0.0, 0.01, 0.0), r, tr > 0.0 ? tr : 200.0, rb) : -1.0;
      if (trb > 0.0) { refl = shadeBoat(p + r * trb, r, rb); trr = trb; }
      else if (tr > 0.0) { refl = shadeF(p + r * tr, r, tr, rid); trr = tr; }
      else {
        float tl2 = r.y < 0.12 ? marchLand(p, r, 120.0, 30000.0) : -1.0;
        refl = tl2 > 0.0 ? landShade(p + r * tl2, r, tl2) : skyFull(r);
        trr = 1e4;
      }
      refl += fireLights(p, r, trr, false);
      col = mix(vec3(0.0004, 0.0006, 0.0009), refl, sat(F * 1.3 + 0.08));
      // glitter of the fires and the lantern on the ripples
      col += pointSpec(p, n, v, 0.12, fireA() + vec3(0.0, 0.3, 0.0), lightA()) * 0.5;
      col += pointSpec(p, n, v, 0.06, fireB() + vec3(0.0, 0.35, 0.0), lightB()) * 0.8;
      if (uBoatK >= 0.0) col += pointSpec(p, n, v, 0.1, uLant, uLantCol) * 0.9;
      col += vec3(1.0, 0.62, 0.3) * trailOnWater(p, n) * (0.05 + 0.1 * uJoin) * (0.6 + 0.4 * uFBk);
      float fog = 1.0 - exp(-tw * 0.00012);
      col = mix(col, skyBase(normalize(vec3(rd.x, 0.02, rd.z))) * 0.85, fog);
    } else { col = skyFull(rd); depth = 1e5; }
  }
  vec4 sm = fireSmoke(ro, rd, depth);
  col = col * sm.a + sm.rgb;
  col += fireLights(ro, rd, depth, true);
  col += airGlow(ro, rd, depth, fireA() + vec3(0.0, 0.3, 0.0), lightA(), 0.00001);
  col += airGlow(ro, rd, depth, fireB() + vec3(0.0, 0.3, 0.0), lightB(), 0.00001);
  float trans = 1.0;
  vec3 m = mistLayers(ro, rd, depth, trans);
  return col * trans + m;
}
`;
