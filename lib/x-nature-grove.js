// s07's world: "Those who make peace will be called God's children." An old olive grove at night, the
// moon high ahead of us beyond a clearing. At the foot of an ancient gnarled olive, a sword has been laid
// down: a worn iron blade with a bronze guard and pommel, resting across one of the tree's roots in
// the dry grass (swords into ploughshares). Silver olive leaves drift down out of the crowns and settle
// on the blade. On "God's children" the camera lifts toward the clearing and the moon comes clear, its
// light breaking through the crowns in soft shafts. No people and no human shadows anywhere.
// Units are metres; ground near y = 0; we look along +z (screen right is -x).
// uMoonK: moonlight strength (thin cloud .. clear); uShaft: how much the air in the grove glows.
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const GROVE_UNIFORMS = { ...NATURE_UNIFORMS, uMoonK: 0.7, uShaft: 0.5 };
export const CLEAR = [-1.6, 13.0];
// the sword: guard centre and blade tip (world), as the scene file needs them for the camera
export const SWORD_GUARD = [0.10, 0.072, 0.80];
export const SWORD_TIP = [-0.16, 0.013, 1.45];

const v3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(', ')})`;

export const GROVE_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uMoonK, uShaft;
const vec3 MOON = normalize(vec3(-0.35, 0.72, 1.0));
const vec3 MOONC = vec3(0.62, 0.71, 0.92);
const vec2 CLEAR = vec2(${CLEAR[0].toFixed(2)}, ${CLEAR[1].toFixed(2)});
const vec3 HERO = vec3(1.75, 0.0, 0.3);
const vec3 SG = ${v3(SWORD_GUARD)};
const vec3 ST = ${v3(SWORD_TIP)};
const float LB = 0.70;
const float CELL = 6.5;
const float CANH = 3.1;

vec3 rotAx(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }

float groundH(vec2 xz) {
  float far = smoothstep(2.5, 9.0, length(xz - vec2(0.0, 1.2)));
  return far * 0.5 * (fbm(xz * 0.07, 3) - 0.5) + 0.012 * (fbm(xz * 3.0, 2) - 0.5);
}

// ---------------------------------------------------------------- the sword
void swordBasis(out vec3 U, out vec3 V, out vec3 W) {
  U = normalize(ST - SG);
  V = normalize(cross(vec3(0.0, 1.0, 0.0), U));
  W = cross(U, V);
  float r = 0.13;                                     // rolled a little onto one edge over the root
  vec3 V2 = V * cos(r) + W * sin(r); W = cross(U, V2); V = V2;
}
float bladeHW(float u) {
  float s = sat(u / LB);
  return max(mix(0.026, 0.019, s) * pow(sat((LB - u) / 0.13), 0.6), 1e-4);
}
float bladeHT(float u) { return mix(0.0036, 0.0024, sat(u / LB)); }
float swordSD(vec3 p, out int mid) {
  mid = 3;
  float bd = sdCapsule(p, SG - normalize(ST - SG) * 0.19, ST, 0.11);
  if (bd > 0.02) return bd;
  vec3 U, V, W; swordBasis(U, V, W);
  vec3 q = p - SG;
  float u = dot(q, U), v = dot(q, V), w = dot(q, W);
  // the blade: a lens section, thinning to honed edges, a shallow fuller down its first part, to a point
  float hw = bladeHW(u), ht = bladeHT(u);
  float av = abs(v), aw = abs(w);
  float e = sat(av / hw);
  float th = ht * (1.0 - e * e) + 0.0002;
  th -= 0.001 * smoothstep(0.0075, 0.0035, av) * smoothstep(0.66 * LB, 0.5 * LB, u) * smoothstep(0.0, 0.04, u);
  float d = max(max(aw - th, av - hw) * 0.7, max(-u, u - LB));
  // the guard: a bronze bar, quillons curving a little toward the blade, knobbed ends
  float gu = u + 0.010 - 0.012 * (v / 0.09) * (v / 0.09);
  float gd = sdBox(vec3(gu, v, w), vec3(0.0065, 0.086, 0.0075)) - 0.0035;
  gd = min(gd, length(vec3(gu - 0.003, abs(v) - 0.092, w)) - 0.0105);
  if (gd < d) { d = gd; mid = 4; }
  // the grip: cord wound in a tight helix
  float ga = atan(w, v);
  float gr = sdCapsule(vec3(u, v, w), vec3(-0.122, 0.0, 0.0), vec3(-0.022, 0.0, 0.0), 0.0122);
  gr -= 0.0009 * (0.5 + 0.5 * sin(u * 1050.0 + ga));
  if (gr < d) { d = gr; mid = 5; }
  // bronze ferrules either end of the grip, and a wheel pommel with a boss
  float rr = length(vec2(v, w));
  float fe = min(length(vec2(rr - 0.0128, u + 0.023)) - 0.003, length(vec2(rr - 0.0128, u + 0.122)) - 0.003);
  vec3 pq = vec3(u + 0.148, v, w);
  float po = smin(sdEllipsoid(pq, vec3(0.021, 0.027, 0.013)), length(pq * vec3(1.0, 1.0, 0.8)) - 0.0105, 0.004);
  po = min(po, fe);
  if (po < d) { d = po; mid = 4; }
  return d;
}
// a point on the blade's upper face (u along, v across) and its up axis
vec3 bladeTop(float u, float v, out vec3 W) {
  vec3 U, V; swordBasis(U, V, W);
  float e = sat(abs(v) / bladeHW(u));
  return SG + U * u + V * v + W * (bladeHT(u) + 0.0016);
}

// ---------------------------------------------------------------- the old olive and its roots
float rootR(int ri, int k);
// the roots: six segments each, wandering, swelling and thinning, arching in and out of the soil
vec3 rootP(int ri, int k) {
  float fk = float(k);
  if (ri == 0) {
    // the root the sword rests on: from the foot of the tree, under the guard, then down into the soil
    vec2 a = HERO.xz, g = SG.xz + normalize(ST.xz - SG.xz) * 0.03;
    vec2 dir = normalize(g - a), pr = vec2(-dir.y, dir.x);
    float L = length(g - a);
    float u = k <= 5 ? 0.3 + fk / 5.0 * (L - 0.3) : L + 0.3;
    float lat = k == 5 ? 0.0 : 0.09 * sin(fk * 1.9 + 1.3);
    vec2 xz = a + dir * u + pr * lat;
    float r = rootR(0, k);
    float y = k == 5 ? 0.013 : k == 6 ? -0.06 : r * (0.15 * sin(fk * 2.3 + 0.5) - 0.25);
    return vec3(xz.x, y, xz.y);
  }
  float fr = float(ri);
  float a0 = atan(SG.z - HERO.z, SG.x - HERO.x);
  // two roots snake through the grass round the sword (one behind it, one nearer us), the rest away
  float a = a0 + (ri == 1 ? -0.42 : ri == 2 ? 0.36 : ri == 3 ? 1.6 : ri == 4 ? -1.75 : 3.0) + 0.15 * (hash11(fr * 3.1) - 0.5);
  float L = ri <= 2 ? 2.5 + 0.3 * hash11(fr * 7.7) : 1.1 + 1.0 * hash11(fr * 7.7);
  float s = fk / 6.0;
  float wob = 0.28 * sin(fk * 1.6 + fr * 2.3) * s + 0.1 * sin(fk * 3.7 + fr) * s;
  vec2 dir = vec2(cos(a + wob), sin(a + wob));
  vec2 xz = HERO.xz + dir * (0.3 + s * L);
  float r = rootR(ri, k);
  float y = r * (0.18 * sin(fk * 2.1 + fr * 1.7) - 0.3) - (k == 6 ? 0.05 : 0.0);
  return vec3(xz.x, y, xz.y);
}
float rootR(int ri, int k) {
  float fk = float(k), s = fk / 6.0;
  if (ri == 0) return k == 5 ? 0.05 : mix(0.16, 0.045, s) * (1.0 + 0.22 * sin(fk * 3.1 + 0.4));
  float fr = float(ri);
  return mix(0.19, 0.04, pow(s, 0.8)) * (0.85 + 0.3 * hash11(fr)) * (1.0 + 0.25 * sin(fk * 2.7 + fr * 1.3));
}
// bark relief: twisting fissures and burls (metres, added to a distance)
float barkRelief(vec3 q, float scale) {
  float ang = atan(q.z, q.x);
  vec2 bc = vec2(ang * 3.0 + q.y * 1.4, q.y * 1.1) * vec2(2.2, 1.0) * scale;
  float f = vnoise(bc * vec2(1.0, 3.0)) * 0.6 + vnoise(bc * vec2(2.3, 6.0) + 5.0) * 0.4;
  float ridge = 1.0 - abs(2.0 * f - 1.0);
  return 0.014 * smoothstep(0.35, 0.9, ridge) / scale + 0.008 * (vnoise(q * 14.0) - 0.5);
}
vec2 gRootDir = vec2(1.0, 0.0);
float heroSD(vec3 p, out float part) {
  part = 0.0;
  vec3 q = p - HERO;
  float d = 1e9;
  // the roots, half sunk in the ground
  float rbound = max(length(q.xz) - 3.7, q.y - 0.5);
  if (rbound > 0.0) d = min(d, rbound + 0.05);
  else {
    vec2 rdir = vec2(1.0, 0.0); float rb = 1e9;
    for (int ri = 0; ri < 6; ri++) {
      vec3 A = rootP(ri, 0), Z = rootP(ri, 6), Mi = rootP(ri, 3);
      float bnd = min(sdCapsule(p, A, Mi, 0.6), sdCapsule(p, Mi, Z, 0.6));
      if (bnd > 0.05) { d = min(d, bnd + 0.05); continue; }
      for (int k = 1; k < 7; k++) {
        vec3 B = rootP(ri, k);
        float sd = sdRoundCone(p, A, B, rootR(ri, k - 1), rootR(ri, k));
        if (sd < rb) { rb = sd; rdir = normalize(B.xz - A.xz); }
        d = smin(d, sd, 0.05);
        A = B;
      }
    }
    // gnarls and knuckles, and shallow grooves along each root (the fine fissures are in the shading)
    vec2 rp = vec2(dot(p.xz, rdir), dot(p.xz, vec2(-rdir.y, rdir.x)));
    float fg = vnoise(vec2(rp.x * 3.0 + p.y * 2.0, (rp.y + p.y * 0.7) * 14.0));
    d += 0.035 * (fbm(p * 4.0, 3) - 0.5) + 0.006 * smoothstep(0.45, 0.85, 1.0 - abs(2.0 * fg - 1.0));
    gRootDir = rdir;
  }
  // the trunk: a swollen foot and three thick twisting stems
  float bound = length(q - vec3(0.0, 1.8, 0.0)) - 3.0;
  if (bound < 0.3) {
    float tr = sdRoundCone(q, vec3(0.0, -0.2, 0.0), vec3(0.05, 0.75, 0.0), 0.66, 0.42);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a = 2.0 + fi * 2.2;
      vec3 mid = vec3(cos(a) * 0.28, 1.5, sin(a) * 0.28);
      vec3 top = vec3(cos(a + 0.7) * 1.0, 3.2, sin(a + 0.7) * 1.0);
      float tw = 0.03 * sin(q.y * 4.0 + fi * 2.0 + atan(q.z - mid.z, q.x - mid.x) * 2.0);
      tr = smin(tr, sdRoundCone(q, vec3(0.0, 0.5, 0.0), mid, 0.36, 0.25) + tw, 0.18);
      tr = smin(tr, sdRoundCone(q, mid, top, 0.25, 0.11) + tw, 0.12);
    }
    // a hollow split down the front of the old trunk
    tr = smax(tr, -sdEllipsoid(q - vec3(-0.35, 0.9, -0.35), vec3(0.18, 0.7, 0.18)), 0.06);
    tr += barkRelief(q, 1.0);
    d = smin(d, tr, 0.18);
  }
  // the crown overhead, leaning away from the sword so the moon reaches it
  vec3 cq = q - vec3(0.7, 3.9, 0.6);
  float cb = length(cq * vec3(1.0, 1.6, 1.0)) - 2.6;
  if (cb < 0.6) {
    float cr = cb + 0.7 * (fbm(cq * 1.3 + vec3(uTime * 0.25, 0.0, uTime * 0.15), 3) - 0.42);
    if (cr < 0.15) cr += 0.1 * (vnoise(cq * 9.0 + uTime * 0.6) - 0.45);
    if (cr < d) { d = cr; part = 1.0; }
  } else d = min(d, cb - 0.2);
  return d;
}

// ---------------------------------------------------------------- the grove
vec4 treeIn(vec2 c) {
  vec2 h = hash22(c * 1.37 + 3.0);
  vec2 pos = (c + 0.5) * CELL + (h - 0.5) * CELL * 0.35;
  float has = 1.0;
  if (length((pos - CLEAR) * vec2(1.0, 0.8)) < 6.2) has = 0.0;    // the clearing
  if (length(pos - vec2(0.0, 0.4)) < 3.4) has = 0.0;              // where we stand and the sword lies
  if (length(pos - HERO.xz) < 3.6) has = 0.0;
  return vec4(pos, 0.95 + 0.3 * hash12(c * 5.1), has);
}
float treeSD(vec3 p, vec2 base, float sz, float seed, out float part) {
  vec3 q = p - vec3(base.x, groundH(base), base.y);
  part = 0.0;
  float bound = length(q - vec3(0.0, 2.4 * sz, 0.0)) - 3.6 * sz;
  if (bound > 0.5) return bound - 0.3;
  float d = 1e9;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float a = seed * 6.0 + fi * 2.1;
    vec3 top = vec3(cos(a) * 1.0, 3.0, sin(a) * 1.0) * sz;
    vec3 mid = vec3(cos(a + 0.8) * 0.2, 0.9, sin(a + 0.8) * 0.2) * sz;
    // a side limb off each stem, so the tops branch and vanish into the crown instead of ending in stubs
    vec3 lb = mid + (top - mid) * 0.55;
    vec3 lt = lb + vec3(cos(a + 1.9) * 0.7, 0.9, sin(a + 1.9) * 0.7) * sz;
    d = min(d, sdRoundCone(q, lb, lt, 0.1 * sz, 0.04 * sz));
    float tw = 0.04 * sin(q.y * 6.0 + fi * 2.0 + atan(q.z - mid.z, q.x - mid.x) * 3.0);
    d = min(d, sdRoundCone(q, vec3(0.0, -0.2, 0.0), mid, 0.27 * sz, 0.2 * sz) + tw);
    d = min(d, sdRoundCone(q, mid, top, 0.2 * sz, 0.05 * sz) + tw);
  }
  d = smin(d, sdRoundCone(q, vec3(0.0, -0.3, 0.0), vec3(0.0, 0.55, 0.0), 0.5 * sz, 0.2 * sz), 0.25);
  d = max(d, -q.y - 0.3);
  d += barkRelief(q, 1.3);
  float cr = 1e9;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float a = seed * 6.0 + fi * 1.05;
    float rr = 0.6 + 0.9 * hash11(seed * 3.0 + fi);
    vec3 c = vec3(cos(a) * rr, 2.45 + 0.9 * hash11(seed + fi * 1.3), sin(a) * rr) * sz;
    c.x += 0.06 * sin(uTime * 1.1 + fi + seed * 5.0) * (c.y - 1.5);
    cr = smin(cr, sdEllipsoid(q - c, vec3(1.0, 0.62, 1.0) * sz * (0.8 + 0.35 * hash11(seed * 7.0 + fi))), 0.3);
  }
  if (cr < 0.8) {
    vec3 w = q * 1.9 + vec3(uTime * 0.35, 0.0, uTime * 0.2);
    cr += 0.6 * (fbm(w, 2) - 0.36) + 0.15 * (vnoise(q * 7.0 + uTime * 0.8) - 0.5);
    if (cr < 0.15) cr += 0.09 * (vnoise(q * 16.0 + vec3(uTime * 0.9, 0.0, uTime * 0.5)) - 0.45);
  }
  if (cr < d) { part = 1.0; d = cr; }
  return d;
}

// ---------------------------------------------------------------- dry grass
float grassDens(vec2 b) {
  // dry grass grows in tufts between bare loam and leaf litter
  float tuft = smoothstep(0.42, 0.72, vnoise(b * 6.5 + 2.0)) * 0.95 + 0.08;
  tuft *= smoothstep(0.45, 1.1, length(b - HERO.xz));
  vec2 sa = SG.xz - normalize(ST.xz - SG.xz) * 0.16, sb = ST.xz;
  vec2 pa = b - sa, ba = sb - sa; float h = sat(dot(pa, ba) / dot(ba, ba));
  tuft *= smoothstep(0.022, 0.045, length(pa - ba * h));
  return tuft * (1.0 - smoothstep(4.0, 6.0, length(b - vec2(0.0, 1.0))));
}
float grassSD(vec3 p, float gh) {
  const float GC = 0.021;
  vec2 c0 = floor(p.xz / GC - 0.5);
  float d = 1e9;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 c = c0 + vec2(i, j);
    vec3 h = hash33(vec3(c, 7.0));
    vec2 b = (c + 0.15 + 0.7 * h.xy) * GC;
    if (h.z > grassDens(b)) continue;
    float ht = 0.025 + 0.06 * fract(h.z * 17.3);
    // blades arc out from the tuft and flop over, each its own way
    float la = 6.2831 * fract(h.x * 31.7 + h.y * 7.1);
    vec2 lean = vec2(cos(la), sin(la)) * (0.025 + 0.06 * fract(h.y * 29.3));
    lean += 0.006 * vec2(sin(uTime * 1.7 + b.x * 9.0 + b.y * 7.0), cos(uTime * 1.3 + b.y * 8.0));
    vec3 B = vec3(b.x, gh - 0.004, b.y);
    float dr = dot(lean, lean) * 1.6;
    vec3 M1 = B + vec3(lean.x * 0.08, ht * 0.42, lean.y * 0.08);
    vec3 M2 = B + vec3(lean.x * 0.38, ht * 0.78, lean.y * 0.38);
    vec3 T = B + vec3(lean.x, ht * 0.92 - dr, lean.y);
    d = min(d, sdRoundCone(p, B, M1, 0.0009, 0.0007));
    d = min(d, sdRoundCone(p, M1, M2, 0.0007, 0.0005));
    d = min(d, sdRoundCone(p, M2, T, 0.0005, 0.00015));
  }
  return d;
}

// ---------------------------------------------------------------- the scene
// ids: 1 ground, 2 bark, 3 blade, 4 bronze, 5 grip, 6 grass, 7 crown
float mapG(vec3 p, out int id) {
  float gh = groundH(p.xz);
  float d = p.y - gh; id = 1;
  // the old tree and its roots grow out of the soil (blended), the grass round them
  float hp; float hd = heroSD(p, hp);
  if (hp < 0.5) { if (hd < d + 0.015) id = 2; d = smin(d, hd, 0.03); }
  else if (hd < d) { d = hd; id = 7; }
  if (p.y - gh < 0.1 && hd > 0.004) { float g = max(grassSD(p, gh), -hd); if (g < d) { d = g; id = 6; } }
  int sm; float sd = swordSD(p, sm);
  if (sd < d) { d = sd; id = sm; }
  vec2 c0 = floor(p.xz / CELL - 0.5);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 c = c0 + vec2(i, j);
    vec4 tr = treeIn(c);
    if (tr.w < 0.5) continue;
    float pt; float td = treeSD(p, tr.xy, tr.z, hash12(c), pt);
    if (td < d) { d = td; id = pt > 0.5 ? 7 : 2; }
  }
  return d;
}
// what casts a shadow close by: the old tree, its roots, the sword, the trunks (crowns go by canopyAt)
float mapS(vec3 p) {
  float hp; float d = heroSD(p, hp);
  if (hp > 0.5) d = 1e9;
  int sm; d = min(d, swordSD(p, sm));
  vec2 c0 = floor(p.xz / CELL - 0.5);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 c = c0 + vec2(i, j);
    vec4 tr = treeIn(c);
    if (tr.w < 0.5) continue;
    float pt; float td = treeSD(p, tr.xy, tr.z, hash12(c), pt);
    if (pt < 0.5) d = min(d, td);
  }
  return d;
}
vec3 normG(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * (0.00025 + 0.0006 * t); int i;
  return normalize(e.xyy * mapG(p + e.xyy, i) + e.yyx * mapG(p + e.yyx, i) + e.yxy * mapG(p + e.yxy, i) + e.xxx * mapG(p + e.xxx, i));
}
float marchG(vec3 ro, vec3 rd, out int id) {
  float t = 0.02;
  for (int i = 0; i < 320; i++) {
    vec3 p = ro + rd * t;
    float d = mapG(p, id);
    if (abs(d) < 0.0002 + 0.0009 * t) return t;
    float gh = p.y - groundH(p.xz);
    float st = d * 0.72;
    if (gh < 0.1 && t < 6.0 && grassDens(p.xz) > 0.05) st = min(st, 0.01 + 0.008 * t);           // the grass blades are thin: don't step over them
    t += st;
    if (t > 90.0 || p.y > 9.0) { id = 0; return -1.0; }
  }
  // out of steps while creeping along a surface at a grazing angle: that is a hit, not the sky
  mapG(ro + rd * t, id);
  return t;
}

// the crowns as the moon sees them: 0 open sky .. 1 dense leaves, at canopy height
float canopyAt(vec2 c, float fine) {
  float cov = 0.0;
  vec2 c0 = floor(c / CELL - 0.5);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 cc = c0 + vec2(i, j);
    vec4 tr = treeIn(cc);
    if (tr.w < 0.5) continue;
    cov = max(cov, smoothstep(2.5 * tr.z, 1.1 * tr.z, length(c - tr.xy)));
  }
  cov = max(cov, smoothstep(2.9, 1.3, length((c - (HERO.xz + vec2(0.7, 0.6))) * vec2(1.0, 0.9))));
  // the grove's crowns overlap overhead; thinner over the clearing
  vec2 cl = CLEAR + MOON.xz / MOON.y * CANH;
  cov = max(cov, mix(0.85, 0.55, smoothstep(7.0, 3.0, length(c - cl))));
  // the crowns close over the old tree's foot, but leave one gap: the moon falls on the sword
  vec2 cs = vec2(0.0, 1.05) + MOON.xz / MOON.y * (CANH - 0.04);
  float gp = length((c - cs) * vec2(1.0, 0.62)) + 0.35 * (vnoise(c * 2.5 + uTime * 0.05) - 0.5);
  cov *= smoothstep(0.25, 1.3, gp);
  // gaps between the leaf masses, stirring: the moon comes through them in shafts
  float lf = fbm(c * 0.9 + vec2(uTime * 0.06, uTime * 0.025), 4) + 0.1 * fine * vnoise(c * 7.0 + uTime * 0.4);
  cov *= smoothstep(0.34, 0.5, lf + 0.12 * cov);
  return cov;
}
float moonVisF(vec3 p, float fine) {
  if (p.y > CANH) return 1.0;
  vec2 c = p.xz + MOON.xz / MOON.y * (CANH - p.y);
  return 1.0 - 0.97 * canopyAt(c, fine);
}
float moonVis(vec3 p) { return moonVisF(p, 1.0); }
float shadowG(vec3 p) {
  float s = 1.0, t = 0.003 + 0.006 * hash12(gl_FragCoord.xy + uFrame * 1.7);
  for (int i = 0; i < 26; i++) {
    vec3 q = p + MOON * t;
    if (q.y > 4.5) break;
    float h = mapS(q);
    s = min(s, 14.0 * h / t);
    t += clamp(h * 0.85, 0.003 + 0.02 * t, 0.6);
    if (s < 0.01 || t > 6.0) break;
  }
  return smoothstep(0.0, 1.0, sat(s));
}

vec3 skyG(vec3 rd) {
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.03, 0.04, 0.07), vec3(0.004, 0.006, 0.014), pow(h, 0.45));
  float md = dot(rd, MOON);
  c += MOONC * (0.05 * pow(sat(md), 4.0) + 0.25 * pow(sat(md), 50.0)) * (0.5 + 0.5 * uMoonK);
  c += starField(rd, 1.0) * smoothstep(0.0, 0.15, rd.y) * (1.2 - 0.6 * uMoonK);
  vec2 cq = rd.xz / max(rd.y, 0.05) * 0.6 + vec2(uTime * 0.03, 0.0);
  float cl = smoothstep(0.45, 0.85, fbm(cq, 4)) * smoothstep(0.02, 0.2, rd.y);
  c = mix(c, MOONC * 0.06 * (0.6 + 0.6 * pow(sat(md), 3.0)), cl * 0.6);
  float ang = acos(clamp(md, -1.0, 1.0));
  if (ang < 0.02) c += vec3(1.0, 0.97, 0.9) * 5.0 * smoothstep(0.0105, 0.0095, ang) * uMoonK;
  return c;
}
// what a mirror-bright surface low in the grove sees: the crowns overhead against the moonlit sky,
// and the dark grove round the horizon
vec3 envG(vec3 p, vec3 r) {
  vec3 grove = vec3(0.016, 0.02, 0.034) + MOONC * 0.09 * pow(sat(dot(normalize(vec3(r.x, 0.0, r.z)), MOON) * 0.5 + 0.5), 3.0);
  if (r.y < 0.03) return grove;
  float tt = (CANH + 0.3 - p.y) / r.y;
  vec2 c = p.xz + r.xz * tt;
  float cov = 0.75 * canopyAt(c, 1.0);
  vec3 leaves = vec3(0.008, 0.01, 0.01) + MOONC * 0.08 * smoothstep(0.7, 0.9, vnoise(c * 30.0)) * (1.0 - cov * 0.5);
  vec3 sky = skyG(r) * 1.6 + MOONC * 0.03;
  return mix(sky, leaves, cov) * smoothstep(0.03, 0.2, r.y) + grove * (1.0 - smoothstep(0.03, 0.2, r.y));
}

// ---------------------------------------------------------------- falling olive leaves
// leaf i: where and when it lands, and how it falls. 0..5 settle on the blade, the rest on the
// grass and roots round it or high in the air between us and the clearing.
void leafPose(int i, out vec3 c, out vec3 ax, out vec3 nrm, out float sz, out float seed) {
  float fi = float(i);
  seed = hash11(fi * 13.7 + 1.0);
  vec3 h = hash33(vec3(fi, 3.0, 9.0));
  vec3 land, landN; float tl;
  if (i < 6) {
    float u = i == 0 ? 0.17 : i == 1 ? 0.43 : i == 2 ? 0.30 : i == 3 ? 0.55 : i == 4 ? 0.23 : 0.62;
    float v = (h.x - 0.5) * 0.02;
    tl = i == 0 ? 50.0 : i == 1 ? 51.0 : i == 2 ? 54.95 : i == 3 ? 56.7 : i == 4 ? 58.4 : 60.2;
    land = bladeTop(u, v, landN);
    if (i == 1 || i == 2 || i == 5) landN = -landN;      // some land silver side up
  } else if (i < 11) {
    land = vec3(mix(-0.55, 0.55, h.x), 0.0, mix(0.55, 1.9, h.y));
    land.y = groundH(land.xz) + 0.05 + 0.04 * h.z;
    landN = normalize(vec3(h.y - 0.5, 2.5, h.z - 0.5));
    tl = mix(53.4, 60.5, fract(h.z * 7.3 + fi * 0.37));
    if (i < 8) tl -= 6.0;
  } else {
    land = vec3(mix(-2.4, 1.2, h.x), 0.0, mix(1.6, 6.0, h.y));
    land.y = groundH(land.xz) + 0.06;
    landN = vec3(0.0, 1.0, 0.0);
    tl = mix(61.5, 65.5, h.z);
  }
  float a0 = 6.2831 * h.z;
  vec3 t0 = normalize(cross(landN, vec3(cos(a0), 0.0, sin(a0))));
  float fall = max(tl - uTime, 0.0);
  float sw = 1.0 - exp(-fall * 1.6);
  c = land + vec3(0.0, fall * 0.42, 0.0)
    + sw * vec3(0.11 * sin(fall * 2.3 + seed * 20.0), 0.0, 0.07 * cos(fall * 1.9 + seed * 11.0));
  ax = rotAx(t0, vec3(0.0, 1.0, 0.0), fall * (1.4 + seed));
  nrm = rotAx(landN, vec3(0.0, 1.0, 0.0), fall * (1.4 + seed));
  float fl = sw * 1.2 * sin(fall * (3.0 + 2.0 * seed) + seed * 30.0);
  vec3 ac = normalize(ax);
  nrm = rotAx(nrm, ac, fl);
  // tumble end over end a little as well
  vec3 bx = normalize(cross(nrm, ac));
  float pt = sw * 0.6 * sin(fall * 2.1 + seed * 7.0);
  ax = rotAx(ac, bx, pt); nrm = rotAx(nrm, bx, pt);
  sz = 0.028 + 0.008 * seed;
}
// nearest leaf along the ray before maxT: returns t (or -1), leaf-local uv and leaf frame
float leafHit(vec3 ro, vec3 rd, float maxT, out vec2 uv, out vec3 ln, out vec3 lax, out float lseed, out float lsz) {
  float best = -1.0;
  for (int i = 0; i < 22; i++) {
    vec3 c, ax, nrm; float sz, seed;
    leafPose(i, c, ax, nrm, sz, seed);
    float dn = dot(rd, nrm);
    if (abs(dn) < 1e-4) continue;
    float tt = dot(c - ro, nrm) / dn;
    if (tt <= 0.0 || tt >= maxT || (best > 0.0 && tt >= best)) continue;
    vec3 q = ro + rd * tt - c;
    vec3 bx = cross(nrm, ax);
    vec2 l = vec2(dot(q, ax), dot(q, bx)) / sz;            // x along -1..1, y across
    if (abs(l.x) > 1.0) continue;
    // olive leaf: long and narrow, widest just before the middle, a fine point
    float w = 0.2 * pow(max(1.0 - l.x * l.x, 0.0), 0.75) * (1.0 - 0.12 * l.x);
    if (abs(l.y) > w) continue;
    best = tt; uv = l; ln = nrm; lax = ax; lseed = seed; lsz = sz;
  }
  return best;
}
// is the moon blocked at p by a leaf that has settled on the blade
float leafShadow(vec3 p) {
  float s = 1.0;
  for (int i = 0; i < 6; i++) {
    vec3 c, ax, nrm; float sz, seed;
    leafPose(i, c, ax, nrm, sz, seed);
    float dn = dot(MOON, nrm);
    if (abs(dn) < 1e-3) continue;
    float tt = dot(c - p, nrm) / dn;
    if (tt <= 0.0 || tt > 0.3) continue;
    vec3 q = p + MOON * tt - c;
    vec2 l = vec2(dot(q, ax), dot(q, cross(nrm, ax))) / sz;
    float w = 0.2 * pow(max(1.0 - l.x * l.x, 0.0), 0.75) * (1.0 - 0.12 * l.x);
    s *= 1.0 - 0.9 * smoothstep(0.03, -0.02, max(abs(l.x) - 1.0, abs(l.y) - w)) ;
  }
  return s;
}
vec3 shadeLeaf(vec3 p, vec3 rd, vec2 uv, vec3 nrm, vec3 ax, float seed, vec3 ML) {
  vec3 v = -rd;
  bool top = dot(nrm, v) > 0.0;
  vec3 n = top ? nrm : -nrm;
  // midrib, faint veins, a gentle curl
  float mid = smoothstep(0.035, 0.0, abs(uv.y)) * (1.0 - 0.6 * abs(uv.x));
  vec3 bx = cross(nrm, ax);
  n = normalize(n + bx * uv.y * 1.2 * (top ? 1.0 : -1.0) + ax * uv.x * 0.08);
  float cell = 0.85 + 0.3 * vnoise(uv * vec2(40.0, 140.0) + seed * 30.0);
  // olive: dark grey-green and waxy above, silver-white and downy beneath
  vec3 alb = top ? vec3(0.055, 0.07, 0.045) * cell : vec3(0.36, 0.38, 0.35) * cell;
  alb = mix(alb, top ? vec3(0.09, 0.1, 0.07) : vec3(0.42, 0.42, 0.38), mid * 0.6);
  float rough = top ? 0.32 : 0.6;
  float vis = moonVis(p);
  float nl = sat(dot(n, MOON));
  vec3 col = alb / PI * ML * nl * vis;
  col += ML * ggx(n, MOON, v, rough) * fresnel(n, v, 0.04) * vis * (top ? 1.0 : 0.4);
  // light through the leaf when it is between us and the moon
  col += vec3(0.1, 0.13, 0.06) * ML * 0.12 * sat(dot(-n, MOON)) * vis;
  // the down on the underside: a soft sheen at grazing angles
  if (!top) col += alb * ML * 0.08 * pow(1.0 - sat(dot(n, v)), 3.0) * vis;
  col += alb * vec3(0.15, 0.18, 0.28) * (0.5 + 0.5 * n.y);
  return col;
}

// ---------------------------------------------------------------- shading
vec3 shadeG(vec3 ro, vec3 rd, float t, int id, vec3 ML) {
  vec3 p = ro + rd * t; vec3 n = normG(p, t); vec3 v = -rd;
  float vis = moonVis(p);
  float sh = (id == 7 ? 1.0 : shadowG(p + n * (0.001 + 0.001 * t))) * vis;
  float nl = sat(dot(n, MOON));
  vec3 col;
  if (id == 3 || id == 4) {
    // metal: the worn iron blade, the bronze furniture
    vec3 U, V, W; swordBasis(U, V, W);
    vec3 q = p - SG;
    float u = dot(q, U), vv = dot(q, V);
    vec3 F0; float rough; vec3 diff = vec3(0.0); float dk = 0.0;
    sh *= leafShadow(p);
    if (id == 3) {
      float hw = bladeHW(u);
      float e = sat(abs(vv) / hw);
      // fine polishing scratches running along the blade, honed edges, rust blooms and pitting
      float scr = vnoise(vec2(u * 9.0, vv * 2600.0)) * 0.6 + vnoise(vec2(u * 30.0, vv * 7000.0)) * 0.4;
      float rust = smoothstep(0.66, 0.86, fbm(vec2(u * 16.0, vv * 55.0) + 3.0, 4) + 0.22 * smoothstep(0.7, 1.0, e) + 0.3 * smoothstep(0.06, 0.0, u) + 0.12 * smoothstep(0.5, 0.7, u / LB));
      float pit = smoothstep(0.82, 0.9, vnoise(vec2(u, vv) * 700.0)) * (0.3 + rust);
      n = normalize(n + V * (scr - 0.5) * 0.05 + (vec3(vnoise(p * 900.0), 0.0, vnoise(p * 900.0 + 3.0)) - 0.5) * 0.25 * pit);
      F0 = vec3(0.56, 0.57, 0.58) * (0.82 + 0.18 * scr) * (1.0 - 0.6 * pit);
      rough = mix(0.12, 0.2, scr);
      // the honed bevel along each edge: steeper, polished, it catches the moon in a fine line
      float bev = smoothstep(0.8, 0.93, e);
      vec3 W0; vec3 U0, V0; swordBasis(U0, V0, W0);
      n = normalize(mix(n, normalize(W0 * sign(dot(n, W0)) * 0.75 + V0 * sign(vv) * 0.66), bev));
      rough = mix(rough, 0.16, bev);
      float fu = smoothstep(0.0075, 0.0035, abs(vv)) * smoothstep(0.66 * LB, 0.5 * LB, u);
      F0 *= 1.0 - 0.25 * fu;                                              // the fuller, duller with grime
      diff = vec3(0.11, 0.055, 0.028) * (0.5 + 0.7 * fbm(vec2(u, vv) * 300.0, 3));
      dk = rust * 0.8;
      rough = mix(rough, 0.85, dk);
    } else {
      float pat = smoothstep(0.55, 0.85, fbm(p * 220.0, 4)) * 0.7;
      F0 = vec3(0.78, 0.54, 0.33) * 0.8 * (0.85 + 0.3 * vnoise(p * 1200.0));
      rough = 0.3 + 0.1 * vnoise(p * 600.0);
      diff = vec3(0.06, 0.09, 0.075);                                         // verdigris in the hollows
      dk = pat * 0.5;
      rough = mix(rough, 0.8, dk);
    }
    vec3 r = reflect(rd, n);
    float ndv = sat(dot(n, v));
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - ndv, 5.0);
    vec3 env = envG(p, r);
    // rough metal sees a blurred sky: blend toward the sky's mean
    env = mix(env, vec3(0.03, 0.04, 0.065) + MOONC * 0.04, smoothstep(0.1, 0.5, rough));
    vec3 spec = F * (env * (0.55 + 0.45 * vis) + ML * ggx(n, MOON, v, rough) * sh + ML * ggx(n, MOON, v, 0.45) * 0.35 * sh);
    vec3 dif = diff / PI * ML * nl * sh + diff * vec3(0.15, 0.18, 0.28) * (0.5 + 0.5 * n.y);
    col = mix(spec, dif + spec * 0.08, dk);
  } else if (id == 5) {
    // the grip: dark cord, rubbed shiny where hands held it
    vec3 alb = vec3(0.05, 0.035, 0.024) * (0.7 + 0.5 * vnoise(p * 1500.0));
    col = alb / PI * ML * nl * sh + alb * vec3(0.15, 0.18, 0.28) * (0.5 + 0.5 * n.y);
    col += ML * ggx(n, MOON, v, 0.45) * 0.04 * sh;
  } else if (id == 2) {
    // olive bark: grey, deeply fissured, twisted; pale lichen; ridges worn smooth
    vec3 hq = p - HERO;
    bool isRoot = hq.y < 0.35 && length(hq.xz) > 0.55;
    float fis;
    if (isRoot) {
      int i0; float hp0; heroSD(p, hp0);     // sets gRootDir for this point
      vec2 rd2 = gRootDir;
      vec2 rp = vec2(dot(p.xz, rd2), dot(p.xz, vec2(-rd2.y, rd2.x)));
      // fissures running along the root: coarse enough to read at a couple of metres
      vec3 fq = vec3(rp.x * 7.0, p.y * 70.0, rp.y * 70.0);
      fq.yz += 0.6 * vec2(vnoise(fq * 0.3), vnoise(fq * 0.3 + 7.0));
      float f1 = vnoise(fq) * 0.75 + vnoise(fq * 2.2 + 4.0) * 0.25;
      float fd = smoothstep(4.5, 1.5, t);
      fis = mix(0.7, smoothstep(0.02, 0.13, abs(f1 - 0.5)), fd);
      vec3 side = normalize(vec3(-rd2.y, 0.0, rd2.x));
      float f2 = vnoise(fq + vec3(0.0, 0.2, 0.2)) * 0.75 + vnoise((fq + vec3(0.0, 0.2, 0.2)) * 2.2 + 4.0) * 0.25;
      n = normalize(n + fd * side * sign(f1 - 0.5) * (f2 - f1) * 5.0 * (1.0 - smoothstep(0.0, 0.12, abs(f1 - 0.5))) + 0.15 * (vec3(vnoise(p * 25.0), vnoise(p * 25.0 + 2.0), vnoise(p * 25.0 + 5.0)) - 0.5));
    } else {
      float ang = atan(hq.z, hq.x);
      vec2 bc = vec2(ang * 3.0 + hq.y * 1.4, hq.y * 1.1) * vec2(2.2, 1.0);
      float f1 = vnoise(bc * vec2(1.0, 3.0)) * 0.6 + vnoise(bc * vec2(2.3, 6.0) + 5.0) * 0.4;
      fis = smoothstep(0.015, 0.09, abs(f1 - 0.5));
      n = normalize(n + 0.12 * (vec3(vnoise(p * 70.0), vnoise(p * 70.0 + 2.0), vnoise(p * 70.0 + 5.0)) - 0.5));
    }
    vec3 alb = vec3(0.1, 0.088, 0.072) * (0.55 + 0.7 * fbm(p * vec3(8.0, 3.0, 8.0), 3));
    if (isRoot) {
      float moss = smoothstep(0.5, 0.7, fbm(p * 9.0 + 3.0, 3)) * smoothstep(-0.2, 0.8, n.y);
      alb = mix(alb, vec3(0.035, 0.045, 0.025) * (0.7 + 0.6 * vnoise(p * 200.0)), moss * 0.8);
      float lich = smoothstep(0.66, 0.78, fbm(p * 14.0 + 11.0, 3)) * fis;
      alb = mix(alb, vec3(0.2, 0.21, 0.18) * (0.8 + 0.4 * vnoise(p * 300.0)), lich * 0.7);
    }
    alb *= mix(0.15, 1.25, fis);
    alb = mix(alb, vec3(0.24, 0.26, 0.22), smoothstep(0.64, 0.8, fbm(p * 6.0 + 7.0, 3)) * 0.5 * fis);
    alb *= 0.8 + 0.4 * vnoise(p * vec3(60.0, 160.0, 60.0));
    nl = sat(dot(n, MOON));
    col = alb / PI * ML * nl * sh;
    col += ML * ggx(n, MOON, v, 0.85) * 0.01 * sh * fis;
    col += alb * vec3(0.24, 0.28, 0.42) * (0.45 + 0.55 * n.y) * (0.7 + 0.3 * vis);
    col += alb * ML * 0.05 * sat(0.4 - n.y);                                            // light off the ground
    col += MOONC * (isRoot ? 0.12 : 0.35) * pow(1.0 - sat(dot(n, v)), 4.0) * sat(dot(rd, MOON) + 0.4) * vis * (0.4 + 0.6 * fis);   // moon rim
  } else if (id == 6) {
    // dry grass: straw-pale at the tips, darker at the root; light through the blade
    float hgt = sat((p.y - groundH(p.xz)) / 0.1);
    float hh = hash12(floor(p.xz / 0.021) + 3.0);
    vec3 alb = mix(vec3(0.06, 0.055, 0.04), mix(vec3(0.22, 0.2, 0.14), vec3(0.15, 0.155, 0.11), hh), smoothstep(0.0, 0.7, hgt));
    float trans = sat(dot(-n, MOON)) * 0.5 + 0.25;
    col = alb / PI * ML * (nl * 0.7 + trans * 0.5) * sh;
    col += ML * ggx(n, MOON, v, 0.45) * 0.06 * sh;
    col += alb * vec3(0.15, 0.18, 0.28) * (0.3 + 0.7 * hgt);
  } else if (id == 7) {
    // olive crowns: narrow leaves, dark above, flashing silver as they turn
    vec3 lp = p * 55.0 + vec3(uTime * 0.5, 0.0, uTime * 0.3);
    vec3 ci = floor(lp), cf = fract(lp) - 0.5;
    vec3 hh = hash33(ci);
    vec2 ld = normalize(hh.xy - 0.5);
    vec2 lc = vec2(dot(cf.xz, ld), dot(cf.xz, vec2(-ld.y, ld.x)));
    float leaf = mix(0.55, smoothstep(1.0, 0.7, length(lc * vec2(1.6, 5.0))), smoothstep(9.0, 3.0, t));
    float flip = smoothstep(0.5, 0.9, sin(uTime * (1.5 + 2.0 * hh.z) + hh.z * 40.0) * 0.5 + 0.5);
    float silver = mix(0.15, 1.0, flip) * leaf;
    vec3 alb = mix(vec3(0.035, 0.045, 0.03), vec3(0.24, 0.26, 0.24), silver * 0.7) * mix(0.5, 1.0, leaf);
    vec3 lfn = normalize(hh - 0.5 + vec3(0.0, 0.4, 0.0));
    n = normalize(mix(n, lfn, 0.7 * leaf));
    float vc = moonVis(p + vec3(0.0, 0.4, 0.0));
    col = alb / PI * ML * sat(dot(n, MOON) * 0.7 + 0.3) * (0.15 + 0.85 * vc) * (0.45 + 0.55 * sat(n.y + 0.5));
    col += vec3(0.08, 0.11, 0.05) * ML * 0.1 * pow(sat(dot(rd, MOON)), 2.0) * leaf;   // backlit, light through the leaves
    col += ML * ggx(n, MOON, v, 0.35) * 0.08 * silver;
    col += alb * vec3(0.15, 0.18, 0.28) * 0.7;
    col *= 0.6;
  } else {
    // the ground between the roots: dark loam, fallen olive leaves, a few pebbles
    vec2 xz = p.xz;
    vec3 alb = vec3(0.085, 0.072, 0.058) * (0.65 + 0.7 * fbm(xz * 12.0, 3));
    float fine = smoothstep(4.0, 1.0, t);
    vec2 lc0 = floor(xz / 0.07 - 0.5);
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
      vec2 cc = lc0 + vec2(i, j);
      vec3 hh = hash33(vec3(cc, 2.0));
      if (hh.z > 0.45) continue;
      vec2 o = (cc + 0.35 + 0.3 * hh.xy) * 0.07;
      vec2 d = rot(hh.z * 40.0) * (xz - o);
      float lx = d.x / 0.026;
      float w = 0.2 * pow(max(1.0 - lx * lx, 0.0), 0.75);
      float lf = step(abs(lx), 1.0) * smoothstep(w, w * 0.6, abs(d.y / 0.026));
      vec3 lcol = fract(hh.z * 13.0) < 0.35 ? vec3(0.15, 0.155, 0.14) : vec3(0.065, 0.06, 0.042);
      alb = mix(alb, lcol * (0.8 + 0.4 * fract(hh.x * 7.0)), lf * fine);
    }
    vec2 cp = voronoiEdge(xz * 30.0 + 7.0);
    alb = mix(alb, vec3(0.1, 0.095, 0.085) * (0.7 + 0.5 * cp.y), step(0.96, cp.y) * smoothstep(0.0, 0.25, cp.x) * fine);
    n = normalize(n + fine * 0.3 * vec3(vnoise(xz * 300.0) - 0.5, 0.0, vnoise(xz * 300.0 + 4.0) - 0.5));
    nl = sat(dot(n, MOON));
    col = alb / PI * ML * nl * sh;
    col += alb * vec3(0.15, 0.18, 0.28) * (0.4 + 0.3 * vis);
  }
  return col;
}

// the air of the grove: haze lit by the moon where the crowns let it through, in soft shafts
vec3 shaftsG(vec3 ro, vec3 rd, float depth, vec3 ML) {
  float tmax = min(depth, 32.0);
  const int NS = 44;
  // one offset per sample (the jitter changes every sample) with only a little per-pixel dither: smooth, not grainy
  float j = fract(hash12(uJitter * 917.3 + 0.37) + 0.25 * hash12(gl_FragCoord.xy * 0.731 + 17.0 + uJitter * 53.0));
  vec3 acc = vec3(0.0);
  float prev = 0.0;
  for (int i = 0; i < NS; i++) {
    float f = (float(i) + j) / float(NS);
    float tt = tmax * f * (0.35 + 0.65 * f);
    float dt = tt - prev; prev = tt;
    vec3 q = ro + rd * tt;
    if (q.y > CANH) continue;
    float dens = exp(-max(q.y, 0.0) / 2.5) * (0.4 + 1.2 * vnoise(q * 0.5 + vec3(uTime * 0.15, 0.0, 0.0)));
    float mv = moonVisF(q, 0.0); acc += vec3(mv * mv * dens * dt);
  }
  float cosA = dot(rd, MOON);
  float g = 0.6;
  float ph = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosA, 1.5) * 0.08 + 0.03;
  return acc * ML * ph * 0.06 * uShaft;
}

vec3 peace(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  vec3 ML = MOONC * 9.0 * uMoonK;
  int id;
  float t = marchG(ro, rd, id);
  float depth = t > 0.0 ? t : 200.0;
  vec3 col = t > 0.0 ? shadeG(ro, rd, t, id, ML) : skyG(rd);
  // the leaves in the air and on the blade
  vec2 luv; vec3 ln, lax; float lseed, lsz;
  float lt = leafHit(ro, rd, depth, luv, ln, lax, lseed, lsz);
  if (lt > 0.0) { depth = lt; col = shadeLeaf(ro + rd * lt, rd, luv, ln, lax, lseed, ML); t = lt; }
  // distance: night air in the grove
  if (t > 0.0) {
    float fog = 1.0 - exp(-depth * 0.02);
    vec3 fogc = vec3(0.006, 0.008, 0.015) + MOONC * 0.012 * uMoonK * pow(sat(dot(rd, MOON) + 0.2), 2.0);
    col = mix(col, fogc, fog);
  }
  col += shaftsG(ro, rd, depth, ML);
  return col;
}
`;
