// The city on a hill (s14, s18, s31, s33, s35): one shared world. A first-century Galilean town of
// flat-roofed stone houses climbs a terraced hill above a misty valley; olive trees on the slopes,
// hills all round, the Sea of Galilee to the east. Hundreds of small windows and open doorways hold
// oil-lamp light, which pools on the lanes and the walls of the neighbouring houses and glows in the
// mist and the haze above the town. Units are metres; the hill's crown is near (0, 72, 0); east is +x.
//
// Uniforms: uDay 0 = deep night, 1 = blue hour, 1.5 = deepest blue hour with a pale band in the east
// (never sunrise in these scenes). uLit scales every lamp in town. uSpark: rising sparks (0..1).
// uGlory: the gold glow high in the sky. uStar: the morning star's brightness. uHero: 1 shows the hero
// house (s33); uHL0, uHL1: its eight windows / door, each 0..1 lit.
export const HERO_POS = [-34, 0, 96];        // xz of the hero house (y from the terrain)
export const CITY_UNIFORMS = {
  uDay: 0, uLit: 1, uSpark: 0, uGlory: 0, uStar: 0, uHero: 0, uHL0: [0, 0, 0], uHL0w: 0, uHL1: [0, 0, 0], uHL1w: 0,
  uFocus: 300, uAper: 0, uMist: 1, uGloryDir: [0.27, 0.8, -0.5], uGloryCore: 1, uMoonDir: [-0.85, 0.5, -0.25], uMistTop: 30, uSmoke: 0, uHaze: 1, uLeaf: 0, uCloud: 0, uStars: 1, uLitFrac: 1, uSill: 0, uEdge: 0, uStarDir: [0.9, 0.2, 0.25],
};

export const CITY_GLSL = /* glsl */ `
uniform float uGloryCore;
uniform vec3 uMoonDir;
uniform float uMistTop, uSmoke, uHaze, uLeaf, uCloud, uStars, uLitFrac, uSill, uEdge;
uniform float uDay, uLit, uSpark, uGlory, uStar, uHero, uFocus, uAper, uMist, uHL0w, uHL1w;
uniform vec3 uHL0, uHL1, uGloryDir, uStarDir;
const float CELL = 10.0;
const float TOWN_R = 128.0;
const float TOWN_MAX = 160.0;
// the town's edge: an irregular outline round the hill
float townRad(vec2 xz) { float a = atan(xz.y, xz.x); return TOWN_R * (1.0 + 0.1 * sin(2.0 * a + 1.0) + 0.07 * sin(5.0 * a + 2.3) + 0.05 * sin(9.0 * a + 4.0)); }
const vec2 HERO = vec2(${HERO_POS[0].toFixed(1)}, ${HERO_POS[2].toFixed(1)});
const vec3 LAMP = vec3(1.0, 0.52, 0.17);
#define MIST_TOP uMistTop

// ---------------- terrain ----------------
// the town's hill alone (cheap; what the houses stand on)
float hillCore(vec2 xz) {
  float r = length(xz * vec2(1.0, 1.12));
  float rr = r / 158.0;
  float h = 88.0 * exp(-rr * rr);
  h += 16.0 * exp(-pow(length(xz - vec2(-240.0, -170.0)) / 150.0, 2.0));
  return h;
}
float terrace(float h) {
  const float S = 3.4;
  float k = h / S;
  return S * (floor(k) + smoothstep(0.74, 0.97, fract(k)));
}
float townW(vec2 xz) { float tr = townRad(xz); return smoothstep(tr + 26.0, tr - 4.0, length(xz)); }
// ground height where the houses sit
float townGround(vec2 xz) { return terrace(hillCore(xz)); }
float farTerms(vec2 xz) {
  float R = length(xz);
  float h = 0.0;
  if (R > 380.0) h += 200.0 * smoothstep(380.0, 1300.0, R) * (0.3 + 0.7 * fbm(xz * 0.0013 + 3.0, 3));
  // the lake basin to the east, and the far shore's heights beyond it
  float sea = smoothstep(650.0, 1350.0, xz.x + 240.0 * sin(xz.y * 0.0016) + 0.0);
  h = mix(h, -80.0, sea);
  h += 300.0 * smoothstep(2300.0, 3900.0, xz.x) * (0.55 + 0.45 * fbm(xz * 0.0009, 3));
  return h;
}
// the hero house's yard: a level court of beaten earth in front of it (s33 only)
float heroPad(vec2 xz) {
  if (uHero < 0.5) return 0.0;
  vec2 q = xz - (HERO + vec2(0.0, 13.0));
  vec2 d = abs(q) - vec2(14.0, 15.0);
  return 1.0 - smoothstep(0.0, 6.0, max(d.x, d.y));
}
float terrainH(vec2 xz, int oct) {
  float hc = hillCore(xz);
  float tw = townW(xz);
  float tr = terrace(hc) + 0.25 * (vnoise(xz * 0.4) - 0.5);
  float pad = heroPad(xz);
  if (pad > 0.0) tr = mix(tr, terrace(hillCore(HERO)) - 0.05 + 0.08 * (vnoise(xz * 1.3) - 0.5), pad);
  if (tw >= 1.0) return tr;
  float h = hc + farTerms(xz);
  float det = 7.0 * (fbm(xz * 0.012, oct) - 0.5) + 1.4 * (fbm(xz * 0.08 + 5.0, max(oct - 2, 1)) - 0.5);
  h += det * (1.0 - tw);
  return mix(h, tr, tw);
}
const float WATER = -42.0;

// ---------------- houses ----------------
struct House { bool on; vec2 c; vec2 hs; float rot; float base; float h; float front; float seed; float up; };
House houseAt(vec2 cell) {
  House H;
  H.seed = hash12(cell * 1.37 + 11.0);
  vec2 cc = (cell + 0.5) * CELL;
  float r = length(cc);
  float h2 = hash12(cell + 71.3);
  H.on = r < townRad(cc) * (0.84 + 0.24 * hash12(cell + 5.1)) && h2 > 0.13;
  if (uHero > 0.5 && (length(cc - HERO) < 13.0 || heroPad(cc) > 0.2)) H.on = false;
  // s50: the hero house stands at the town's edge, open ground to its west
  if (uEdge > 0.5 && cc.x < HERO.x - 6.0 && abs(cc.y - HERO.y) < 45.0) H.on = false;
  vec2 hs = vec2(3.0, 3.0) + vec2(hash12(cell + 2.2), hash12(cell + 9.4)) * 1.1;
  // the crown of the hill: a larger hall
  if (r < 9.0) hs = vec2(4.2, 3.4);
  H.hs = hs;
  H.rot = (hash12(cell + 3.3) - 0.5) * 0.22;
  vec2 j = (hash22(cell + 7.7) - 0.5) * 2.0 * max(4.75 - max(hs.x, hs.y) * 1.1, 0.0);
  H.c = cc + j;
  H.base = townGround(H.c);
  float two = step(0.62, hash12(cell + 4.4));
  H.h = mix(3.4, 3.9, hash12(cell + 8.8)) + two * 2.9 + two * step(0.85, hash12(cell + 6.6)) * 2.9;
  H.up = step(0.55, hash12(cell + 1.9)) * (1.0 - two);   // a small upper room on some roofs
  // the front faces downhill (away from the crown), quantised to a side of the box
  vec2 dn = normalize(H.c + 1e-3);
  float a = atan(dn.y, dn.x) - H.rot;
  H.front = mod(floor(a / 1.5707963 + 0.5) + 4.0, 4.0);
  return H;
}
vec2 faceDir(float f) { return f < 0.5 ? vec2(1, 0) : f < 1.5 ? vec2(0, 1) : f < 2.5 ? vec2(-1, 0) : vec2(0, -1); }
float houseSD(vec3 p, House H) {
  vec2 q = rot(H.rot) * (p.xz - H.c);
  vec3 lp = vec3(q.x, p.y - H.base, q.y);
  float body = sdBox(lp - vec3(0, (H.h - 4.0) * 0.5, 0), vec3(H.hs.x - 0.12, (H.h + 4.0) * 0.5 - 0.12, H.hs.y - 0.12)) - 0.12;
  body += 0.07 * (vnoise(p * 0.45 + H.seed * 20.0) - 0.5);
  // a low parapet round the flat roof (uneven, here and there broken down): hollow the top
  float inner = sdBox(lp - vec3(0, H.h + 0.5 - 0.35 * step(0.5, vnoise(p.xz * 0.6 + H.seed * 9.0)), 0), vec3(H.hs.x - 0.25, 0.75, H.hs.y - 0.25));
  body = max(body, -inner);
  if (H.up > 0.5) {
    vec2 o = (hash22(H.c) - 0.5) * H.hs * 0.6;
    body = min(body, sdBox(lp - vec3(o.x, H.h + 1.3, o.y), vec3(H.hs.x * 0.42, 1.3, H.hs.y * 0.45)));
  }
  return body;
}

// ---------------- the hero house (s33) ----------------
// two storeys, 10 × 7 m, its front (+z, towards the valley) with six windows and a door, two on the
// west side; carved recesses, sills and lintels
const vec3 HHS = vec3(5.0, 3.6, 3.5);   // half width, half height(ish), half depth
float heroBase() { return townGround(HERO); }
const vec3 SILL = vec3(3.0, 1.3, 0.0);   // + HHS.z - 0.22 in z, set in sillLampSD
vec3 sillPos() { return vec3(-HHS.x + 0.2, 1.3, 0.6); }   // the west window's sill
float sillLampSD(vec3 lp) {
  vec3 q = lp - sillPos();
  if (dot(q, q) > 0.09) return length(q) - 0.2;
  float body = sdEllipsoid(q - vec3(0, 0.03, 0), vec3(0.06, 0.032, 0.075));
  body = smin(body, sdCapsule(q, vec3(-0.02, 0.03, 0), vec3(-0.1, 0.035, 0), 0.02), 0.02);
  body = max(body, -(length(q - vec3(0, 0.07, -0.005)) - 0.022));   // the filling hole
  return body;
}
vec3 flamePos() { return sillPos() + vec3(-0.105, 0.07, 0.0); }
float heroWood(vec3 lp) {
  float w = 1e3;
  float SZ = HHS.z;
  // front windows: a pair of shutters folded back flat against the wall either side
  for (int i = 0; i < 5; i++) {
    vec2 c = i == 0 ? vec2(-3.0, 1.7) : i == 1 ? vec2(3.0, 1.7) : i == 2 ? vec2(-3.2, 4.9) : i == 3 ? vec2(0.0, 4.9) : vec2(3.2, 4.9);
    float hw = i < 2 ? 0.28 : 0.26;
    w = min(w, sdBox(vec3(abs(lp.x - c.x) - (hw + 0.17), lp.y - c.y, lp.z - SZ - 0.03), vec3(0.15, 0.4, 0.025)));
  }
  // the door leaf, swung half open inward
  vec3 dq = lp - vec3(0.4 - 0.5, 1.05, SZ - 0.45);
  dq.xz = rot(0.9) * dq.xz;
  w = min(w, sdBox(dq - vec3(0.25, 0.0, 0.0), vec3(0.27, 1.06, 0.04)));
  return w;
}
float heroSD(vec3 p) {
  vec3 lp = vec3(p.x - HERO.x, p.y - heroBase(), p.z - HERO.y);
  if (length(lp - vec3(0, 3.5, 0)) > 14.0) return length(lp - vec3(0, 3.5, 0)) - 12.0;
  float body = sdBox(lp - vec3(0, 1.6, 0), vec3(HHS.x, 5.6, HHS.z));      // y from -4 to 7.2
  float inner = sdBox(lp - vec3(0, 7.9, 0), vec3(HHS.x - 0.3, 0.8, HHS.z - 0.3));
  body = max(body, -inner);
  // small, deep-set windows on the front (ground x = -3, 3, door at 0.4; upper x = -3.2, 0, 3.2)
  float rec = 1e3;
  rec = min(rec, sdBox(lp - vec3(-3.0, 1.7, HHS.z), vec3(0.28, 0.4, 0.55)));
  rec = min(rec, sdBox(lp - vec3(3.0, 1.7, HHS.z), vec3(0.28, 0.4, 0.55)));
  rec = min(rec, sdBox(lp - vec3(-3.2, 4.9, HHS.z), vec3(0.26, 0.4, 0.55)));
  rec = min(rec, sdBox(lp - vec3(0.0, 4.9, HHS.z), vec3(0.26, 0.4, 0.55)));
  rec = min(rec, sdBox(lp - vec3(3.2, 4.9, HHS.z), vec3(0.26, 0.4, 0.55)));
  rec = min(rec, sdBox(lp - vec3(0.4, 1.05, HHS.z), vec3(0.55, 1.1, 0.6)));   // the door
  rec = min(rec, sdBox(lp - vec3(-HHS.x, 1.7, 0.6), vec3(0.55, 0.4, 0.28)));  // west side, ground
  rec = min(rec, sdBox(lp - vec3(-HHS.x, 4.9, -0.8), vec3(0.55, 0.4, 0.26))); // west side, upper
  body = max(body, -rec);
  // stone sills and timber lintels
  float s = 1e3;
  s = min(s, sdBox(lp - vec3(-3.0, 1.27, HHS.z + 0.05), vec3(0.4, 0.05, 0.1)));
  s = min(s, sdBox(lp - vec3(3.0, 1.27, HHS.z + 0.05), vec3(0.4, 0.05, 0.1)));
  s = min(s, sdBox(lp - vec3(-3.2, 4.47, HHS.z + 0.05), vec3(0.38, 0.05, 0.1)));
  s = min(s, sdBox(lp - vec3(0.0, 4.47, HHS.z + 0.05), vec3(0.38, 0.05, 0.1)));
  s = min(s, sdBox(lp - vec3(3.2, 4.47, HHS.z + 0.05), vec3(0.38, 0.05, 0.1)));
  s = min(s, sdBox(lp - vec3(0.4, 2.25, HHS.z + 0.04), vec3(0.8, 0.1, 0.1)));
  // the outside stair to the roof along the east wall
  vec3 sp = lp - vec3(HHS.x + 0.6, 0.0, 0.0);
  float yTop = 0.32 * floor((HHS.z - sp.z) / 0.32 + 1.0);
  float stair = max(sdBox(sp - vec3(0, 1.6, 0), vec3(0.6, 5.6, HHS.z)), (sp.y - yTop) * 0.7);
  float lampD = uSill > 0.0 ? sillLampSD(lp) : 1e3;
  return min(min(min(min(body, s), stair), heroWood(lp)), lampD);
}

// ---------------- olive trees ----------------
const float TCELL = 9.0;
float gTrunk = 0.0;
float treeSD(vec3 p, out float ok) {
  ok = 0.0;
  float R = length(p.xz);
  if (R < townRad(p.xz) - 6.0 || R > 520.0) return 1e3;
  if (uHero > 0.5 && length(p.xz - HERO - vec2(0.0, 14.0)) < 30.0) return 1e3;
  vec2 cell = floor(p.xz / TCELL);
  float hs = hash12(cell + 31.0);
  if (hs < mix(0.5, 0.75, smoothstep(200.0, 320.0, R)) + 0.2 * smoothstep(0.5, 0.7, vnoise(cell * 0.15))) return 1e3;
  vec2 cc = (cell + 0.5) * TCELL + (hash22(cell + 4.0) - 0.5) * 3.6;
  float g = hillCore(cc) + 7.0 * (fbm(cc * 0.012, 2) - 0.5) - 0.3;
  float sc = 1.15 + 0.45 * hash12(cell + 8.0);
  vec3 q = p - vec3(cc.x, g, cc.y);
  q.xz = rot(hs * 6.28) * q.xz;
  if (q.y > 6.0 * sc) return q.y - 5.5 * sc;
  // a wide, broken crown of two or three lumps over a short, leaning trunk
  float bound = length((q - vec3(0.0, 3.0, 0.0) * sc) / vec3(1.3, 0.9, 1.3)) - 3.2 * sc;
  if (bound > 1.5) return bound * 0.7;
  // a gnarled, split trunk: two or three limbs twisting out of a squat bole
  float tw = 0.35 * sin(q.y * 1.7 + hs * 9.0);
  vec3 tq = q + vec3(tw, 0.0, 0.25 * cos(q.y * 1.3 + hs * 5.0));
  float trunk = sdCapsule(tq, vec3(0, -0.5, 0), vec3(0.1, 1.0, 0.0) * sc, 0.5);
  trunk = smin(trunk, sdCapsule(tq, vec3(0.1, 0.9, 0.0) * sc, vec3(1.1, 2.7, 0.4) * sc, 0.2), 0.3);
  trunk = smin(trunk, sdCapsule(tq, vec3(0.0, 0.9, 0.0) * sc, vec3(-0.9, 2.9, -0.5) * sc, 0.18), 0.3);
  trunk = min(trunk, sdCapsule(tq, vec3(0.0, 1.0, 0.1) * sc, vec3(0.1, 3.1, 1.0) * sc, 0.13));
  trunk += 0.08 * (vnoise(p * 3.0) - 0.5);
  // the crown: separate leaf masses at the ends of the limbs, broken by gaps
  float canopy = 1e3;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    vec3 o = vec3(cos(fk * 2.4 + hs * 6.0) * (1.0 + 1.0 * hash11(fk + hs * 13.0)), 3.0 + 1.1 * hash11(fk * 3.1 + hs), sin(fk * 2.4 + hs * 6.0) * (1.0 + 1.0 * hash11(fk + 7.0 + hs * 13.0))) * sc;
    canopy = smin(canopy, sdEllipsoid(q - o, vec3(0.95, 0.5, 0.9) * sc * (0.7 + 0.45 * hash11(fk * 5.7 + hs))), 0.2);
  }
  // fine leaf texture and holes the sky shows through
  float holes = vnoise(p * 1.9) * 0.6 + vnoise(p * 4.3 + 2.0) * 0.4;
  canopy += 0.7 * smoothstep(0.42, 0.72, holes) + 0.1 * (vnoise(p * 7.0) - 0.5);
  canopy *= 0.6;
  ok = 1.0;
  gTrunk = trunk < canopy ? 1.0 : 0.0;
  return min(canopy, trunk);
}

// ---------------- the scene SDF ----------------
// id: 0 terrain, 1 water, 2 house, 3 tree, 4 hero house
float gOct = 5.0;
// the ray being marched (cells are walked along it: never step past a cell's exit, where a
// neighbour's house or tree may be closer); zero when evaluating off a ray (normals, AO)
vec3 gRd = vec3(0.0);
float gEps = 0.01;
float cellExit(vec2 xz, float C) {
  if (dot(gRd, gRd) < 0.5) return 1e3;
  vec2 f = fract(xz / C) * C;
  float tx = abs(gRd.x) < 1e-4 ? 1e4 : (gRd.x > 0.0 ? (C - f.x) / gRd.x : f.x / -gRd.x);
  float tz = abs(gRd.z) < 1e-4 ? 1e4 : (gRd.z > 0.0 ? (C - f.y) / gRd.z : f.y / -gRd.z);
  return min(tx, tz) + 2.0 * gEps + 0.02;
}
float mapD(vec3 p, out int id) {
  int oct = int(gOct);
  float h = terrainH(p.xz, oct);
  float d = (p.y - h) * (length(p.xz) < TOWN_MAX + 30.0 ? 0.48 : 0.62);
  id = 0;
  float w = p.y - WATER;
  if (w < d) { d = w; id = 1; }
  float R = length(p.xz);
  if (R < TOWN_MAX + 16.0 && p.y < h + 12.5) {
    vec2 cell = floor(p.xz / CELL);
    House H = houseAt(cell);
    // never step past this cell's border (the neighbour's house may be closer)
    float border = cellExit(p.xz, CELL);
    float hs0 = H.on ? houseSD(p, H) : 1e3;
    float hd = min(hs0, border);
    if (hd < d) { d = hd; if (hs0 <= hd + 1e-4) id = 2; }
  }
  if (R > 95.0 && R < 540.0 && p.y < h + 10.0) {
    float ok; float td = treeSD(p, ok);
    float border = cellExit(p.xz, TCELL);
    float dd = min(td, border);
    if (dd < d) { d = dd; if (td <= dd + 1e-4 && ok > 0.5) id = 3; }
  }
  if (uHero > 0.5) { float hd = heroSD(p); if (hd < d) { d = hd; id = 4; } }
  return d;
}
float mapOnly(vec3 p) { int i; return mapD(p, i); }
vec3 mapNormal(vec3 p, float t) {
  float h = 0.004 + 0.0006 * t;
  const vec2 k = vec2(1, -1);
  return normalize(k.xyy * mapOnly(p + k.xyy * h) + k.yyx * mapOnly(p + k.yyx * h) + k.yxy * mapOnly(p + k.yxy * h) + k.xxx * mapOnly(p + k.xxx * h));
}
float march(vec3 ro, vec3 rd, out int id) {
  float t = 0.05;
  id = -1;
  gRd = rd;
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    gOct = t < 400.0 ? 5.0 : t < 1500.0 ? 4.0 : 3.0;
    gEps = 0.0008 * t + 0.002;
    if (p.y > 520.0 && rd.y > 0.0) { id = -1; gRd = vec3(0.0); return -1.0; }
    float d = mapD(p, id);
    if (d < 0.0008 * t + 0.002) { gRd = vec3(0.0); return t; }
    t += d;
    if (t > 9000.0) { id = -1; gRd = vec3(0.0); return -1.0; }
  }
  // out of steps close to something: take it as a hit rather than a hole of sky
  int i2; mapD(ro + rd * t, i2); id = i2;
  gRd = vec3(0.0);
  return t;
}
float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.08;
  gRd = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float h = mapOnly(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.3, 9.0);
    if (res < 0.02 || t > 60.0) break;
  }
  gRd = vec3(0.0);
  return sat(res);
}
float ambOcc(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 3; i++) { float h = 0.3 * float(i * i); o += (h - mapOnly(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - 0.32 * o);
}

// ---------------- time of day ----------------
vec3 moonDir() { return normalize(uMoonDir); }
float nightK() { return 1.0 - smoothstep(0.0, 1.0, uDay); }
vec3 zenithCol() { return mix(vec3(0.004, 0.0075, 0.026), vec3(0.03, 0.06, 0.17), smoothstep(0.0, 1.5, uDay)); }
vec3 skyAmb() { return mix(vec3(0.006, 0.009, 0.02), vec3(0.11, 0.16, 0.32), smoothstep(0.0, 1.5, uDay)); }
vec3 moonCol() { return vec3(0.34, 0.47, 0.88) * 0.3 * mix(1.0, 0.15, smoothstep(0.0, 1.2, uDay)); }

// stars: three layers of hashed cells on the sphere, twinkling; brighter in the night
vec3 starLayer(vec3 rd, float sc, float thr, float sz) {
  vec3 q = rd * sc; vec3 c = floor(q); vec3 f = fract(q);
  sz = sz * sc;
  float h = hash13(c);
  if (h < thr) return vec3(0);
  vec3 o = hash33(c + 3.1) * 0.6 + 0.2;
  float d = length(f - o);
  float b = (h - thr) / (1.0 - thr);
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + 5.0 * hash13(c + 9.0)) + h * 40.0);
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.65), hash13(c + 5.0));
  return tint * exp(-d * d / (sz * sz)) * (0.5 + 3.0 * b * b) * tw;
}
vec3 stars(vec3 rd) {
  vec3 s = starLayer(rd, 260.0, 0.955, 0.0006) * 0.9;
  s += starLayer(rd, 520.0, 0.95, 0.0005) * 0.45;
  s += starLayer(rd, 110.0, 0.985, 0.0007) * 4.0;
  // the Milky Way: a faint dusty band
  vec3 ax = normalize(vec3(0.3, 0.2, -1.0));
  float bq = dot(rd, normalize(vec3(0.85, 0.5, 0.15))) / 0.22;
  float band = exp(-bq * bq);
  float dust = fbm(rd.xy * 7.0 + rd.z * 3.0, 4);
  s += vec3(0.6, 0.62, 0.75) * band * (0.012 + 0.035 * smoothstep(0.35, 0.8, dust)) * (1.0 - 0.7 * smoothstep(0.45, 0.6, fbm(rd.zx * 14.0, 3)));
  s += starLayer(rd, 700.0, 0.8, 0.0005) * 0.5 * band;
  return s;
}
// a thin veil of high cloud (s18): wisps that dim the stars and catch the glory's light
float cloudAt(vec3 rd) {
  if (uCloud <= 0.0 || rd.y <= 0.02) return 0.0;
  vec2 cuv = rd.xz / (rd.y + 0.12) * 1.1 + vec2(uTime * 0.012, uTime * 0.004);
  float f = fbm(cuv * vec2(1.2, 2.6), 5);
  return smoothstep(0.48, 0.85, f) * uCloud * smoothstep(0.02, 0.25, rd.y);
}
vec3 sky(vec3 rd) {
  float y = rd.y;
  float k15 = smoothstep(0.0, 1.5, uDay);
  vec3 zen = zenithCol();
  vec3 hor = mix(vec3(0.026, 0.034, 0.068), vec3(0.09, 0.13, 0.27), k15);
  vec3 col = mix(hor, zen, pow(sat(y + 0.02), 0.45));
  // the east: in the blue hour a pale band low over the far shore (never rose: no sunrise yet)
  float east = pow(sat(dot(normalize(vec3(rd.x, 0.0, rd.z) + 1e-4), vec3(1, 0, 0)) * 0.5 + 0.5), 3.0);
  float band = exp(-max(y, 0.0) * 9.0) * east;
  col += vec3(0.11, 0.14, 0.2) * band * smoothstep(0.6, 1.5, uDay) * 1.4;
  col += vec3(0.05, 0.065, 0.11) * band * smoothstep(0.3, 1.0, uDay);
  float dawnK = smoothstep(1.5, 2.0, uDay);
  if (dawnK > 0.0) {
    float e2 = pow(sat(dot(normalize(vec3(rd.x, 0.0, rd.z) + 1e-4), vec3(1, 0, 0)) * 0.5 + 0.5), 2.0);
    float low = exp(-max(y, 0.0) * 7.0);
    col += (vec3(0.75, 0.32, 0.24) * low + vec3(1.1, 0.6, 0.22) * exp(-max(y, 0.0) * 18.0) * e2) * e2 * dawnK;
    col += vec3(0.06, 0.05, 0.08) * dawnK * (1.0 - low);
  }
  // the moon's glow (the moon itself out of frame, high behind the camera's left)
  float m = sat(dot(rd, moonDir()));
  col += vec3(0.05, 0.065, 0.1) * pow(m, 12.0) * nightK();
  float cl = cloudAt(rd);
  col += stars(rd) * mix(1.0, 0.12, smoothstep(0.2, 1.6, uDay)) * smoothstep(-0.02, 0.12, y) * 0.19 * uStars * (1.0 - 0.85 * cl);
  col = mix(col, vec3(0.012, 0.014, 0.022), cl * 0.6);
  // the morning star low in the east
  vec3 ms = normalize(uStarDir);
  float dm = length(rd - ms);
  col += vec3(1.0, 0.97, 0.9) * uStar * (exp(-dm * dm / 1.2e-6) * 6.0 + exp(-dm * 160.0) * 0.08);
  return col;
}

// ---------------- the lamps ----------------
float flick(float s) { return 0.82 + 0.1 * sin(uTime * (5.0 + 4.0 * s) + s * 60.0) + 0.08 * sin(uTime * (11.0 + 7.0 * s) + s * 17.0); }
// one house's lamp light: a point just outside its front, how lit
vec4 houseLamp(House H) {
  vec2 fd = faceDir(H.front);
  vec2 wd = rot(-H.rot) * fd;
  float out1 = (H.front < 0.5 || (H.front > 1.5 && H.front < 2.5)) ? H.hs.x : H.hs.y;
  vec2 xz = H.c + wd * (out1 + 0.6);
  float lit = step(1.0 - 0.22 * uLitFrac, fract(H.seed * 7.31)) * (1.1 + 1.6 * fract(H.seed * 3.7));
  return vec4(xz.x, H.base + 1.3, xz.y, lit * flick(H.seed) * uLit);
}
// the warm light at a point from the nearby houses' doors and windows
vec3 lampsAt(vec3 p, vec3 n) {
  if (length(p.xz) > TOWN_MAX + 30.0) return vec3(0);
  vec2 c0 = floor(p.xz / CELL);
  vec3 acc = vec3(0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    House H = houseAt(c0 + vec2(i, j));
    if (!H.on) continue;
    vec4 L = houseLamp(H);
    if (L.w <= 0.0) continue;
    vec3 dl = L.xyz - p; float r2 = dot(dl, dl);
    float nl = sat(dot(n, dl * inversesqrt(r2)) * 0.85 + 0.15);
    acc += vec3(1.0, 0.5, 0.18) * L.w * nl * 9.0 / (r2 + 0.8);
  }
  return acc;
}
// the hero house's light (its windows and door spilling onto the lane and the walls)
vec3 heroLamps(vec3 p, vec3 n) {
  if (uHero < 0.5) return vec3(0);
  float b = heroBase();
  vec3 O = vec3(HERO.x, b, HERO.y);
  vec3 acc = vec3(0);
  vec3 P[9]; float K[9];
  P[0] = O + vec3(-3.0, 1.7, HHS.z + 0.6); K[0] = uHL0.x;
  P[1] = O + vec3(3.0, 1.7, HHS.z + 0.6);  K[1] = uHL0.y;
  P[2] = O + vec3(-3.2, 4.9, HHS.z + 0.6); K[2] = uHL0.z;
  P[3] = O + vec3(0.0, 4.9, HHS.z + 0.6);  K[3] = uHL0w;
  P[4] = O + vec3(3.2, 4.9, HHS.z + 0.6);  K[4] = uHL1.x;
  P[5] = O + vec3(-HHS.x - 0.6, 1.7, 0.6); K[5] = uHL1.y;
  P[6] = O + vec3(-HHS.x - 0.6, 4.9, -0.8); K[6] = uHL1.z;
  P[7] = O + vec3(0.4, 1.2, HHS.z + 1.0);  K[7] = uHL1w * 2.2;
  if (uSill > 0.0) {
    vec3 F = O + flamePos();
    vec3 dl = F - p; float r2 = dot(dl, dl);
    acc += vec3(1.0, 0.55, 0.22) * uSill * flick(0.91) * sat(dot(n, dl * inversesqrt(r2)) * 0.9 + 0.1) * 0.35 / (r2 + 0.004);
  }
  for (int i = 0; i < 9; i++) {
    if (i == 8) {
      // a lamp on the roof: the house crowned with light
      vec3 dl = O + vec3(0.5, 8.0, 0.5) - p; float r2 = dot(dl, dl);
      acc += LAMP * uGlory * flick(0.77) * sat(dot(n, dl * inversesqrt(r2)) * 0.9 + 0.1) * 4.0 / (r2 + 1.0);
      continue;
    }
    if (K[i] <= 0.0) continue;
    vec3 dl = P[i] - p; float r2 = dot(dl, dl);
    vec3 L = dl * inversesqrt(r2);
    // the light leaves through the opening: forward-facing lobe
    vec3 fw = i == 5 || i == 6 ? vec3(-1, 0, 0) : vec3(0, 0, 1);
    float lobe = 0.25 + 0.75 * sat(dot(-L, fw));
    acc += LAMP * K[i] * flick(float(i) * 0.137) * lobe * lobe * sat(dot(n, L) * 0.9 + 0.1) * 1.6 / (r2 + 0.3);
  }
  return acc;
}
// the hero house's openings: which one a point on the house is in, glowing from within
vec3 heroEmit(vec3 lp, vec3 n) {
  vec4 W[8]; float K[8];   // centre x (or z for the west side), centre y, half w, half h
  W[0] = vec4(-3.0, 1.7, 0.28, 0.4);  K[0] = uHL0.x * 0.8;
  W[1] = vec4(3.0, 1.7, 0.28, 0.4);   K[1] = uHL0.y * 1.2;
  W[2] = vec4(-3.2, 4.9, 0.26, 0.4);  K[2] = uHL0.z * 0.55;
  W[3] = vec4(0.0, 4.9, 0.26, 0.4);   K[3] = uHL0w * 1.0;
  W[4] = vec4(3.2, 4.9, 0.26, 0.4);   K[4] = uHL1.x * 0.7;
  W[5] = vec4(0.6, 1.7, 0.28, 0.4);   K[5] = uHL1.y;
  W[6] = vec4(-0.8, 4.9, 0.26, 0.4);  K[6] = uHL1.z;
  W[7] = vec4(0.4, 1.05, 0.55, 1.1);  K[7] = uHL1w;
  vec3 e = vec3(0);
  for (int i = 0; i < 8; i++) {
    bool west = i == 5 || i == 6;
    float u = west ? lp.z : lp.x;
    float depth = west ? -HHS.x - lp.x : lp.z - HHS.z;   // 0 at the wall face, negative inside
    vec2 q = vec2(u - W[i].x, lp.y - W[i].y);
    vec2 dd = abs(q) - W[i].zw;
    if (K[i] <= 0.0 || max(dd.x, dd.y) > 0.02 || depth > 0.05 || depth < -0.7) continue;
    float k = K[i] * flick(float(i) * 0.31 + 0.2);
    // the back of the recess is the room: warm, brightest low where the lamp stands
    float back = 1.0 - smoothstep(-0.56, -0.5, depth);
    float edge = smoothstep(0.0, 0.18, min(W[i].z - abs(q.x), W[i].w - abs(q.y)));
    vec3 tintW = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.68, 0.35), fract(float(i) * 0.618));
    vec3 room = tintW * (0.35 + 1.5 * pow(1.0 - smoothstep(-W[i].w, W[i].w, q.y), 1.5)) * (0.75 + 0.25 * vnoise(q * 3.0 + 3.0)) * (0.35 + 0.65 * edge);
    // the lamp's small flame on the sill, seen through the opening
    vec2 fq = vec2(q.x, q.y + W[i].w * 0.62);
    vec2 fa = vec2(fq.x / 0.025, max(fq.y, 0.0) / 0.07); float fb = min(fq.y, 0.0) / 0.03;
    float flame = exp(-dot(fa, fa) - fb * fb);
    // the reveal's stone catches the light, brightest deep inside
    vec3 c = room * back + tintW * 1.2 * (1.0 - back) * smoothstep(0.05, -0.55, depth) * 0.3;
    c += vec3(1.0, 0.75, 0.4) * flame * 18.0 * back * (i == 7 || (i == 5 && uSill > 0.0) ? 0.0 : 1.0);
    e += c * k;
  }
  return e;
}
// the town's light seen from afar: a warm field over the lit hill (for the mist and the haze)
float townGlowAt(vec3 p) {
  vec3 q = (p - vec3(0, 56, 0)) / vec3(TOWN_R, 50.0, TOWN_R);
  float d = max(length(q) - 1.0, 0.0) * 100.0;
  return 1.0 / (1.0 + d * d * 0.0006);
}

// ---------------- materials ----------------
// coursed limestone blocks on a wall: u along the wall, v up (metres); returns albedo factor, bump
// rough walling: coursed ashlar (squared blocks, uneven courses, pillowed faces) or rubble
// (irregular field stones); dark, recessed joints. Returns the albedo factor; mortar 0..1; bump is a
// small tangent-plane tilt (u, v) of the stone face.
vec3 masonry(vec2 uv, float far, float rubble, out float mortar, out vec2 bump) {
  vec2 cid; float e; vec2 bdir = vec2(0);
  if (rubble < 0.5 && fbm(uv * 0.35 + 17.0, 3) > 0.6) rubble = 1.0;   // patches of rubble infill and repair
  if (rubble > 0.5) {
    vec2 q = uv * vec2(2.3, 3.1);
    vec2 v = voronoiEdge(q + 0.15 * vec2(vnoise(q * 1.7), vnoise(q * 1.7 + 4.0)));
    e = v.x / 2.6; cid = vec2(v.y, v.y * 7.0);
    bdir = (vnoised(q * 2.0 + v.y * 9.0).yz) * 0.5;
  } else {
    // courses of varying height: each 0.9 m band split at a different height into two courses
    float yw = uv.y + 0.05 * (vnoise(vec2(uv.x * 0.9, 3.0)) - 0.5);
    float band = floor(yw / 0.9);
    float split = 0.32 + 0.26 * hash11(band * 4.7 + 1.3);
    float by = yw - band * 0.9;
    float lower = step(by, split * 0.9);
    float rowH = lower > 0.5 ? split * 0.9 : (1.0 - split) * 0.9;
    float row = band * 2.0 + (1.0 - lower);
    float fv = (lower > 0.5 ? by : by - split * 0.9) / rowH;
    float len = 0.45 + 0.75 * hash11(row * 3.1);
    float u = uv.x / len + hash11(row * 1.7) * 7.0;
    u += 0.55 * (vnoise(vec2(u * 0.8, row * 5.0)) - 0.5);
    float col = floor(u), fu = fract(u);
    float ex = min(fu, 1.0 - fu) * len, ey = min(fv, 1.0 - fv) * rowH;
    e = min(ex, ey);
    cid = vec2(col, row);
    // pillowed face: tilts toward each edge
    bdir = vec2(sign(fu - 0.5) * (1.0 - smoothstep(0.0, 0.09, ex)), sign(fv - 0.5) * (1.0 - smoothstep(0.0, 0.07, ey)));
  }
  e += 0.045 * (vnoise(uv * 9.0) - 0.5) + 0.018 * (vnoise(uv * 37.0) - 0.5);   // chipped arrises
  float sharp = 1.0 - smoothstep(0.008, 0.03, e);
  mortar = mix(sharp, 0.2, far);
  float tint = mix(hash12(cid), 0.5, far * 0.85);
  float grain = 0.85 + 0.3 * mix(vnoise(uv * 13.0 + tint * 9.0) * 0.6 + vnoise(uv * 47.0) * 0.4, 0.5, far);
  grain *= 1.0 + 0.22 * (vnoise(uv * 140.0) - 0.5) * (1.0 - far) + 0.12 * (vnoise(uv * 320.0) - 0.5) * (1.0 - far);
  vec3 c = mix(vec3(0.8, 0.75, 0.68), vec3(1.08, 1.0, 0.9), tint) * grain;
  c *= 1.0 - 0.35 * smoothstep(0.65, 0.95, hash12(cid + 3.3)) * (1.0 - far * 0.8);     // darker, weathered stones
  c = mix(c, c * vec3(0.8, 0.85, 0.75), smoothstep(0.55, 0.8, vnoise(uv * 2.3 + tint)));   // lichen and soot
  c *= mix(0.25, 1.0, 1.0 - mortar);                                // deep joints
  bump = bdir * 0.35 * (1.0 - far) + (vnoised(uv * 9.0 + tint * 5.0).yz) * 0.12 * (1.0 - far) + (vnoised(uv * 60.0).yz) * 0.05 * (1.0 - far);
  return c;
}

vec3 surfaceCol(vec3 p, vec3 n, vec3 rd, float t, int id) {
  vec3 alb = vec3(0.2);
  vec3 emit = vec3(0);
  float rough = 0.85;
  vec3 v = -rd;
  float far = smoothstep(60.0, 220.0, t);
  if (id == 0) {
    float tw = townW(p.xz);
    float rock = smoothstep(0.55, 0.75, fbm(p.xz * 0.05, 4)) * (1.0 - tw);
    alb = mix(vec3(0.17, 0.155, 0.1), vec3(0.11, 0.12, 0.07), smoothstep(0.3, 0.7, fbm(p.xz * 0.02 + 4.0, 4)));
    alb = mix(alb, vec3(0.26, 0.24, 0.21), rock);
    // the lanes and terraces in town: packed pale earth, with the riser walls in stone
    alb = mix(alb, vec3(0.15, 0.13, 0.105) * (0.7 + 0.5 * vnoise(p.xz * 2.0)) * (0.85 + 0.3 * vnoise(p.xz * 13.0)), tw);
    float riser = smoothstep(0.55, 0.2, n.y) * tw;
    if (riser > 0.0) alb = mix(alb, vec3(0.2, 0.18, 0.15) * (0.6 + 0.6 * vnoise(p.xz * 1.3 + p.y * 2.0)), riser);
    alb *= 0.85 + 0.3 * vnoise(p.xz * 0.7);
    // far hamlets and shepherds' fires: small warm points on the far hills
    float R = length(p.xz);
    if (R > 500.0) {
      vec2 hc = floor(p.xz / 40.0);
      float hh = hash12(hc + 17.0);
      float cl = smoothstep(0.55, 0.75, fbm(hc * 0.08, 2));   // they cluster in villages
      if (hh > 0.985 - 0.05 * cl - 0.02 * smoothstep(1500.0, 600.0, R)) {
        vec2 lp = (hc + 0.2 + 0.6 * hash22(hc + 3.0)) * 40.0;
        float dd = length(p.xz - lp);
        float px = t * 0.0009;
        emit += LAMP * (0.4 + 0.6 * hash12(hc)) * flick(hh) * uLit * 2.5 * exp(-dd * dd / (px * px * 2.0 + 0.3));
      }
    }
  } else if (id == 1) {
    alb = vec3(0.0);
  } else if (id == 3) {
    // olive leaves: fine silver-grey masses; the undersides catch the moon in flecks
    float fine = vnoise(p * 14.0) * 0.6 + vnoise(p * 31.0) * 0.4;
    float lod = smoothstep(25.0, 110.0, t);
    fine = mix(fine, 0.5, lod);
    float silver = smoothstep(0.45, 0.8, fine) * (1.0 - lod * 0.5);
    float gap = 0.0;
    alb = mix(vec3(0.07, 0.08, 0.065), vec3(0.2, 0.22, 0.19), fine);
    alb = mix(alb, vec3(0.42, 0.46, 0.44), silver * 0.5);
    n = normalize(n + (vnoised(p.xz * 11.0 + p.y * 3.0).yzx - 0.5) * 1.1 * (1.0 - lod));
    alb = mix(alb, vec3(0.2, 0.22, 0.2), lod * 0.5);
    float okT; treeSD(p, okT); float trunkish = gTrunk;
    alb = mix(alb, vec3(0.1, 0.09, 0.08) * (0.6 + 0.6 * vnoise(p * vec3(8.0, 2.0, 8.0))), trunkish);
    silver *= 1.0 - trunkish;
    // a moonlit sheen on the silver leaves
    emit += moonCol() * 0.9 * silver * pow(sat(dot(reflect(rd, n), moonDir())), 4.0) * (1.0 - gap);
  } else if (id == 2 || id == 4) {
    vec2 cell = floor(p.xz / CELL);
    House H = houseAt(cell);
    vec2 q2; vec3 lp; vec2 hs; float hh;
    if (id == 2) { H = houseAt(cell); q2 = rot(H.rot) * (p.xz - H.c); lp = vec3(q2.x, p.y - H.base, q2.y); hs = H.hs; hh = H.h; }
    else { H.seed = 0.5; H.base = heroBase(); H.h = 7.2; H.hs = HHS.xz; H.rot = 0.0; H.front = 1.0; H.c = HERO; lp = vec3(p.x - HERO.x, p.y - H.base, p.z - HERO.y); hs = HHS.xz; hh = 7.2; }
    vec3 ln = id == 2 ? vec3((rot(H.rot) * n.xz).x, n.y, (rot(H.rot) * n.xz).y) : n;
    // wall plane coords
    vec2 uv = abs(ln.x) > abs(ln.z) ? vec2(lp.z, lp.y) : vec2(lp.x, lp.y);
    float m; vec2 bump;
    float rubble = id == 4 ? 0.0 : step(0.55, fract(H.seed * 11.7));
    vec3 mc = masonry(uv + H.seed * 13.0, far, rubble, m, bump);
    float stoneT = fract(H.seed * 5.3);
    vec3 base = mix(vec3(0.42, 0.36, 0.29), vec3(0.5, 0.44, 0.36), stoneT);
    base = mix(base, vec3(0.24, 0.23, 0.22), step(0.8, stoneT));   // some basalt houses
    // weathering: darker and damper low on the wall, rain streaks from the parapet
    float weather = 0.7 + 0.3 * smoothstep(-0.5, 2.0, lp.y) - 0.18 * fbm(uv * vec2(0.8, 4.0) + H.seed * 9.0, 3) * smoothstep(hh - 2.5, hh, lp.y);
    alb = base * mc * weather * (0.55 + 0.45 * fract(H.seed * 29.7));
    if (abs(ln.y) < 0.5 && id == 2) {
      float by = lp.y - (hh - 0.45);
      float bx = abs(fract(uv.x / 0.55) - 0.5) * 0.55;
      float beam = (1.0 - smoothstep(0.06, 0.08, bx)) * (1.0 - smoothstep(0.06, 0.08, abs(by))) * (1.0 - far);
      alb = mix(alb, vec3(0.05, 0.035, 0.025), beam);
    }
    if (ln.y > 0.6) alb = vec3(0.3, 0.26, 0.21) * (0.7 + 0.4 * vnoise(p.xz * 3.0)) * (0.85 + 0.15 * vnoise(p.xz * 17.0));   // beaten-earth roofs
    // the stones' rough faces
    if (far < 1.0 && abs(ln.y) < 0.5) {
      vec3 tu = abs(n.x) > abs(n.z) ? vec3(0, 0, 1) : vec3(1, 0, 0);
      n = normalize(n + (tu * bump.x + vec3(0, 1, 0) * bump.y) * (1.0 - far));
    }
    // windows and the door (cell houses: painted openings with lamplight)
    if (id == 2 && abs(ln.y) < 0.5) {
      float fIdx = abs(ln.x) > abs(ln.z) ? (ln.x > 0.0 ? 0.0 : 2.0) : (ln.z > 0.0 ? 1.0 : 3.0);
      float wlen = abs(ln.x) > abs(ln.z) ? hs.y : hs.x;
      float uu = uv.x;
      float floors = floor((hh - 0.4) / 2.9);
      float fl = floor((lp.y - 0.0) / 2.9);
      float fy = lp.y - fl * 2.9;
      float nslot = max(1.0, floor(wlen * 2.0 / 2.0));
      float slot = clamp(floor((uu + wlen) / (2.0 * wlen) * nslot), 0.0, nslot - 1.0);
      float sc = -wlen + (slot + 0.5) * 2.0 * wlen / nslot;
      float hsd = hash12(vec2(H.seed * 91.0 + fIdx * 7.0 + slot * 3.0, fl));
      bool isFront = abs(fIdx - H.front) < 0.5;
      bool door = isFront && fl < 0.5 && abs(slot - floor(nslot * 0.5)) < 0.5;
      if (fl < floors && lp.y > 0.0) {
        float wsz = 0.75 + 0.45 * fract(H.seed * 17.3);
        vec2 hw = door ? vec2(0.48, 0.98) : vec2(0.2, 0.3) * wsz;
        float cy = door ? 0.98 : 1.7 + 0.15 * fract(H.seed * 3.3);
        vec2 rel = vec2(uu - sc, fy - cy);
        vec2 dd = abs(rel) - hw;
        float box = max(dd.x, dd.y);
        // round-headed openings on some houses
        if (fract(H.seed * 23.1) > 0.55) { vec2 ar = rel - vec2(0.0, hw.y - hw.x); box = rel.y > hw.y - hw.x ? length(ar) - hw.x : max(dd.x, -rel.y - hw.y); }
        float inside = 1.0 - smoothstep(-0.015, 0.015, box);
        bool exists = door || hsd > 0.3;
        // only some rooms are awake: most windows dark, a few bright, many dim; a few doors open
        float lit = door ? step(1.0 - 0.22 * uLitFrac, fract(H.seed * 7.31)) * (1.1 + 1.6 * fract(H.seed * 3.7))
                         : step(1.0 - 0.38 * uLitFrac, fract(hsd * 13.7)) * mix(0.08, 1.4, pow(fract(hsd * 5.1), 2.4));
        lit *= uLit;
        vec3 lampc = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.66, 0.32), fract(hsd * 31.0));
        if (exists) {
          // the deep reveal: a band of shadow round the opening, darker above (the lintel's shadow)
          float rim = (1.0 - smoothstep(0.0, 0.09, box)) * step(-0.015, box);
          alb *= 1.0 - 0.6 * rim * (rel.y > 0.0 ? 1.0 : 0.6);
          if (inside > 0.0) {
            float depthG = sat(-box / 0.12);
            // the room: brightest low where the lamp stands, a shutter or curtain on one side
            vec3 room = lampc * (0.4 + 1.6 * pow(sat(0.5 - rel.y / (2.0 * hw.y)), 1.6)) * (0.55 + 0.45 * depthG);
            float side = fract(hsd * 19.3);
            if (!door && side > 0.5) room *= mix(1.0, 0.18, smoothstep(-0.02, 0.02, (side > 0.75 ? rel.x : -rel.x) - hw.x * 0.15));
            if (!door && fract(hsd * 7.7) > 0.55) { vec2 lg = abs(fract(rel / 0.11) - 0.5); room *= mix(1.0, 0.15, (1.0 - far) * smoothstep(0.36, 0.46, max(lg.x, lg.y))); }
            if (door && fract(H.seed * 41.0) > 0.45) room *= mix(1.0, 0.3, smoothstep(0.0, 0.05, rel.x - hw.x * 0.1 * (1.0 - rel.y)));
            // the lamp's flame, a bright point on the sill
            vec2 fq = vec2(rel.x - hw.x * 0.3 * (side - 0.5), rel.y + hw.y * 0.72);
            room += vec3(1.0, 0.75, 0.4) * 6.0 * exp(-dot(fq / vec2(0.03, 0.05), fq / vec2(0.03, 0.05))) * (1.0 - far);
            alb = mix(alb, vec3(0.015), inside);
            emit += room * lit * flick(hsd + H.seed) * (door ? 2.6 : 2.4) * inside * (1.0 + far * 0.8);
          }
          // the warm spill round a lit opening on its own wall, strongest below the sill
          float wash = exp(-max(box, 0.0) / (door ? 0.55 : 0.3)) * (1.0 - inside) * (rel.y < 0.0 ? 1.0 : 0.45);
          emit += alb * lampc * lit * flick(hsd + H.seed) * wash * (door ? 2.0 : 1.4);
        }
      }
    }
    bool clay = id == 4 && uSill > 0.0 && sillLampSD(lp) < 0.004;
    bool wood = id == 4 && !clay && heroWood(lp) < 0.01;
    if (clay) alb = vec3(0.42, 0.2, 0.1) * (0.8 + 0.3 * vnoise(lp.xz * 60.0));
    // the back of a deep window opening is the dark room beyond, not more stone
    if (id == 4 && !clay && lp.z < HHS.z - 0.5 && lp.z > HHS.z - 0.62 && abs(lp.x) < 4.0 && n.z > 0.5) alb = vec3(0.025, 0.02, 0.018);
    if (id == 4 && !clay && lp.x > -HHS.x + 0.5 && lp.x < -HHS.x + 0.62 && n.x < -0.5) alb = vec3(0.025, 0.02, 0.018);
    if (wood) {
      // weathered timber: vertical planks, dark seams, grain
      float px = abs(n.z) > abs(n.x) ? lp.x : lp.z;
      float pl = fract(px / 0.14);
      alb = vec3(0.16, 0.1, 0.06) * (0.75 + 0.4 * vnoise(vec2(px * 3.0, lp.y * 40.0))) * mix(0.35, 1.0, smoothstep(0.0, 0.08, min(pl, 1.0 - pl)));
    }
    if (id == 4 && !wood && !clay) { vec3 he = clamp(heroEmit(lp, n), 0.0, 1e3); emit += he; alb *= 1.0 - 0.85 * sat(dot(he, vec3(1.0)) * 4.0); }
    rough = 0.9;
  }
  // light
  float ao = ambOcc(p, n);
  vec3 L = moonDir();
  float nl = sat(dot(n, L));
  float sh = (nl > 0.0 && t < 260.0) ? softShadow(p + n * 0.05, L) : 1.0;
  vec3 col = alb * moonCol() * nl * sh * 3.0;
  // sky light, with the pale east in the blue hour
  float dayK = smoothstep(0.5, 1.5, uDay);
  vec3 amb = skyAmb() * (0.55 + 0.45 * n.y) * (1.0 + 1.3 * dayK * (1.0 - abs(n.y))) + vec3(0.05, 0.065, 0.1) * sat(n.x) * dayK
    + vec3(0.16, 0.08, 0.06) * sat(n.x * 0.8 + 0.2) * smoothstep(1.5, 2.0, uDay);
  col += alb * amb * ao;
  // the lamps
  vec3 lamps = lampsAt(p + n * 0.05, n) + heroLamps(p + n * 0.02, n);
  col += alb * lamps * mix(ao, 1.0, 0.4);
  // the town's glow bouncing up under the trees and terrain near it
  col += alb * LAMP * 0.015 * townGlowAt(p) * uLit * (1.0 - townW(p.xz)) * (0.4 + 0.6 * sat(-n.y + 0.6));
  if (id == 1) {
    // the lake: a dark mirror of the sky, rippled
    vec3 nn = normalize(vec3(0.03 * (vnoise(p.xz * 0.05 + uTime * 0.1) - 0.5), 1.0, 0.03 * (vnoise(p.xz * 0.05 + 7.0 - uTime * 0.1) - 0.5)));
    vec3 r = reflect(rd, nn);
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(nn, v)), 5.0);
    col = sky(r) * fr * 1.0 + vec3(0.002, 0.004, 0.006);
  }
  col += emit;
  return col;
}

// ---------------- the air ----------------
// valley mist below MIST_TOP: a short jittered march, lit by the sky, the moon and the town's glow
// the valley mist: a sheet lying in the low ground, its top surface rolling slowly; brightest along
// its moonlit top, darker in its depths, warm where it lies under the lit town; thin wisps above
float mistTop(vec2 xz) { return MIST_TOP - 5.0 + 10.0 * fbm(xz * 0.0055 + vec2(uTime * 0.012, uTime * 0.004), 3); }
vec4 mistVol(vec3 ro, vec3 rd, float tEnd, vec2 fc) {
  if (uMist <= 0.0) return vec4(0, 0, 0, 1);
  float top = MIST_TOP + 9.0, bot = WATER - 1.0;
  float t0 = 0.0, t1 = min(tEnd < 0.0 ? 3000.0 : tEnd, 3000.0);
  if (abs(rd.y) > 1e-4) {
    float ta = (top - ro.y) / rd.y, tb = (bot - ro.y) / rd.y;
    float lo = min(ta, tb), hi = max(ta, tb);
    t0 = max(t0, lo); t1 = min(t1, hi);
  } else if (ro.y > top) return vec4(0, 0, 0, 1);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 16;
  float j = hash12(fc + uJitter * 37.0 + fract(uTime) * 11.0);
  vec3 acc = vec3(0); float T = 1.0;
  float span = t1 - t0;
  float dayK = smoothstep(0.5, 1.5, uDay);
  for (int i = 0; i < N; i++) {
    // samples gathered toward the near end, where the mist is seen in detail
    float x0 = float(i) / float(N), x1 = float(i + 1) / float(N), xm = (float(i) + j) / float(N);
    float t = t0 + span * xm * xm;
    float dt = span * (x1 * x1 - x0 * x0);
    vec3 p = ro + rd * t;
    float g = max(hillCore(p.xz) - 3.0, WATER);
    float hAbove = p.y - g;
    float mt = mistTop(p.xz);
    float below = mt - p.y;                       // depth under the mist's top surface
    float n = fbm(p * vec3(0.018, 0.08, 0.018) + vec3(uTime * 0.09, 0.0, uTime * 0.035), 3);
    float sheet = smoothstep(-1.5, 3.5, below) * smoothstep(0.2, 0.85, n + 0.25 * smoothstep(0.0, 12.0, below));
    float wisp = (1.0 - smoothstep(0.0, 7.0, -below)) * smoothstep(0.55, 0.8, n) * 0.25;
    float dens = 0.03 * uMist * max(sheet, wisp) * smoothstep(-1.0, 3.0, hAbove);
    if (dens < 1e-5) continue;
    // light: the moon and sky from above, dimming with depth; the town's lamps from above it
    float depthK = exp(-max(below, 0.0) * 0.12);
    float tg = townGlowAt(p);
    vec3 Ls = (skyAmb() * (0.55 + 0.6 * depthK) + moonCol() * 1.1 * depthK) * vec3(0.82, 0.9, 1.0)
            + vec3(1.0, 0.58, 0.28) * uLit * 0.6 * tg * tg * (0.4 + 0.6 * depthK)
            + vec3(0.03, 0.045, 0.07) * dayK * depthK;
    float a = 1.0 - exp(-dens * dt);
    acc += T * a * Ls;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  return vec4(acc, T);
}
// the long haze, and the warm halo of the town's light hanging in it
vec3 hazeApply(vec3 col, vec3 ro, vec3 rd, float t) {
  float tt = t < 0.0 ? 20000.0 : t;
  // exponential height fog: optical depth integrated along the ray
  const float HF = 260.0, D0 = 0.00022;
  float ry = rd.y;
  float od = abs(ry) < 1e-3 ? D0 * exp(-ro.y / HF) * tt : D0 * HF / ry * (exp(-ro.y / HF) - exp(-(ro.y + ry * tt) / HF));
  float fo = 1.0 - exp(-max(od, 0.0));
  vec3 hz = mix(vec3(0.014, 0.019, 0.038), vec3(0.08, 0.11, 0.22), smoothstep(0.0, 1.5, uDay));
  col = mix(col, hz, fo);
  // a low night haze lying among the houses and terraces: depth between the ridges
  float near = t < 0.0 ? 0.0 : max(min(tt, 900.0) - 25.0, 0.0);
  float lowK = exp(-max(ro.y + rd.y * min(tt, 900.0) * 0.5 - 40.0, 0.0) / 60.0);
  col = mix(col, hz * 1.6 + vec3(0.01, 0.006, 0.003) * uLit, (1.0 - exp(-near * 0.0012 * uHaze)) * lowK);
  // closest approach of the ray to the town (before what it hits)
  vec3 C = vec3(0, 68, 0);
  float tc = clamp(dot(C - ro, rd), 0.0, tt);
  float dc = length(ro + rd * tc - C);
  float halo = exp(-dc / 110.0) * 0.08 + exp(-dc / 320.0) * 0.03;
  col += vec3(1.0, 0.62, 0.32) * halo * 0.22 * uLit * (1.0 - 0.4 * smoothstep(0.5, 1.5, uDay)) * sat(tc / 60.0);
  if (uHero > 0.5 && uGlory > 0.0) {
    vec3 Hc = vec3(HERO.x, heroBase() + 8.5, HERO.y);
    float th = clamp(dot(Hc - ro, rd), 0.0, tt);
    float dh = length(ro + rd * th - Hc);
    col += vec3(1.0, 0.68, 0.38) * uGlory * (exp(-dh / 2.0) * 0.12 + exp(-dh / 8.0) * 0.02);
  }
  return col;
}
// rising sparks: a scrolling grid of embers above the town, walked a cell at a time
vec3 sparks(vec3 ro, vec3 rd, float tEnd) {
  if (uSpark <= 0.0) return vec3(0);
  vec3 acc = vec3(0);
  const float S = 9.0;
  float rise = uTime * 3.6;
  vec3 o = ro - vec3(0, -rise, 0);
  vec3 cell = floor(o / S);
  vec3 stp = sign(rd);
  vec3 tMax = ((cell + max(stp, 0.0)) * S - o) / rd;
  vec3 tDel = abs(S / rd);
  float tEndC = tEnd < 0.0 ? 260.0 : min(tEnd, 260.0);
  for (int i = 0; i < 40; i++) {
    float h = hash13(cell);
    if (h > 0.955) {
      vec3 sp = (cell + 0.2 + 0.6 * hash33(cell + 4.0)) * S;
      sp.x += 0.8 * sin(uTime * 1.3 + h * 30.0); sp.z += 0.8 * cos(uTime * 1.1 + h * 20.0);
      vec3 w = sp + vec3(0, -rise, 0);   // world position
      float r = length(w.xz);
      float inTown = smoothstep(TOWN_R + 20.0, TOWN_R - 20.0, r) * smoothstep(70.0, 92.0, w.y) * (1.0 - smoothstep(120.0, 290.0, w.y));
      vec3 rel = sp - o;
      float tl = dot(rel, rd);
      if (tl > 0.3 && tl < tEndC && inTown > 0.0) {
        vec3 sep = rel - rd * tl;
        sep.y *= 0.3;   // drawn out a little along its rise
        float d = length(sep);
        float px = tl * 0.0011;   // about a pixel
        float life = 0.5 + 0.5 * sin(uTime * (3.0 + 4.0 * h) + h * 50.0);
        vec3 c = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.8, 0.45), hash13(cell + 2.0));
        float sz = px * (1.0 + 1.5 * smoothstep(30.0, 3.0, tl));
        acc += c * inTown * life * exp(-tl / 140.0) * (0.25 + 0.9 * hash13(cell + 7.0)) * (exp(-d * d / (sz * sz * 2.5)) * 2.4 + exp(-d / (sz * 6.0)) * 0.04);
      }
    }
    if (tMax.x < tMax.y && tMax.x < tMax.z) { cell.x += stp.x; tMax.x += tDel.x; }
    else if (tMax.y < tMax.z) { cell.y += stp.y; tMax.y += tDel.y; }
    else { cell.z += stp.z; tMax.z += tDel.z; }
    if (min(tMax.x, min(tMax.y, tMax.z)) > tEndC) break;
  }
  return acc * uSpark;
}
// the Father's glory: a vast, soft gold light high in the sky
vec3 gloryGlow(vec3 rd) {
  if (uGlory <= 0.0) return vec3(0);
  vec3 g = normalize(uGloryDir);
  float c = sat(dot(rd, g));
  // faint rays turning slowly about the centre, seen where the veil of cloud catches them
  vec3 up = normalize(cross(g, vec3(1, 0, 0))), rt = cross(up, g);
  float ang = atan(dot(rd, up), dot(rd, rt));
  float rays = 0.6 * vnoise(vec2(ang * 9.0 + uTime * 0.05, 1.0)) + 0.4 * vnoise(vec2(ang * 23.0 - uTime * 0.04, 4.0));
  rays = smoothstep(0.35, 0.85, rays);
  float cl = cloudAt(rd);
  float core = (pow(c, 900.0) * 0.5 + pow(c, 160.0) * 0.1) * uGloryCore;
  float halo = pow(c, 24.0) * 0.08 + pow(c, 6.0) * 0.02 + pow(c, 2.0) * 0.004;
  float veil = cl * (pow(c, 10.0) * 0.16 + pow(c, 3.0) * 0.025) * (0.55 + 0.6 * rays);
  float shafts = pow(c, 6.0) * 0.008 * rays * (1.0 - cl) * min(uGloryCore, 1.0);
  vec3 gold = mix(vec3(1.0, 0.62, 0.26), vec3(1.0, 0.86, 0.6), pow(c, 60.0));
  return gold * uGlory * (core + halo + veil + shafts);
}
// hearth smoke rising from a few roofs, drifting with the night air, lit from below by the town
vec4 smokes(vec3 ro, vec3 rd, float tEnd) {
  if (uSmoke <= 0.0) return vec4(0, 0, 0, 1);
  vec3 acc = vec3(0); float T = 1.0;
  float tE = tEnd < 0.0 ? 1e5 : tEnd;
  vec3 ax = normalize(vec3(0.45, 1.0, 0.12));
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    vec2 c = vec2(-70.0 + 26.0 * fk + 9.0 * sin(fk * 3.1), 40.0 - 22.0 * mod(fk * 7.0, 5.0) + 6.0 * cos(fk * 1.7));
    vec3 B = vec3(c.x, townGround(c) + 7.0, c.y);
    // closest approach of the ray to the plume's axis
    vec3 w0 = ro - B;
    float b = dot(rd, ax), d0 = dot(rd, w0), e = dot(ax, w0);
    float den = 1.0 - b * b;
    if (den < 1e-4) continue;
    float tr = (b * e - d0) / den;          // along the ray
    float ta = (e - b * d0) / den;          // along the axis (height up the plume)
    if (tr <= 0.0 || tr > tE || ta < 0.0 || ta > 90.0) continue;
    float R = 0.8 + 0.1 * ta;
    float dist = length(w0 + rd * tr - ax * ta);
    if (dist > R * 2.0) continue;
    float h = ta;
    float n = fbm(vec3(dist * 0.12 + fk * 3.0, h * 0.05 - uTime * 0.3, fk * 7.0), 3);
    float q = dist / R;
    float dens = exp(-q * q) * smoothstep(0.2, 0.75, n) * smoothstep(0.0, 4.0, h) * (1.0 - smoothstep(18.0, 60.0, h));
    // optical depth across the plume ~ its width
    float od = dens * R * 0.05 * uSmoke;
    float a = 1.0 - exp(-od);
    vec3 L = moonCol() * 0.9 + skyAmb() * 1.2 + vec3(1.0, 0.55, 0.25) * uLit * 0.22 * exp(-h * 0.08);
    acc += T * a * L * vec3(0.9, 0.88, 0.86);
    T *= 1.0 - a;
  }
  return vec4(acc, T);
}

vec3 cityLens(vec2 fc, out vec3 ro) {
  vec3 rd = camRay(fc, ro);
  if (uAper <= 0.0) return rd;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd * (uFocus / dot(rd, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

vec3 cityShade(vec2 fc) {
  vec3 ro; vec3 rd = cityLens(fc, ro);
  int id;
  float t = march(ro, rd, id);
  vec3 col;
  if (t < 0.0) col = sky(rd) + gloryGlow(rd);
  else { vec3 p = ro + rd * t; gOct = t < 400.0 ? 5.0 : 4.0; vec3 n = mapNormal(p, t); col = surfaceCol(p, n, rd, t, id); }
  if (uSill > 0.0 && uHero > 0.5) {
    vec3 F = vec3(HERO.x, heroBase(), HERO.y) + flamePos();
    float tf = dot(F - ro, rd);
    if (tf > 0.0 && (t < 0.0 || tf < t + 0.02)) {
      vec3 d = ro + rd * tf - F;
      float sway = 0.006 * sin(uTime * 7.0) + 0.004 * sin(uTime * 13.0 + 1.0);
      d.x -= sway * sat(d.y / 0.04);
      float h = d.y;
      float w = 0.011 * sat(1.0 - h / 0.055) * smoothstep(-0.012, 0.004, h);
      float core = exp(-dot(d.xz, d.xz) / max(w * w, 1e-6)) * smoothstep(-0.012, 0.0, h) * smoothstep(0.06, 0.0, h);
      float fl = flick(0.91);
      col += vec3(1.0, 0.72, 0.35) * core * 40.0 * uSill * fl;
      col += vec3(1.0, 0.5, 0.18) * exp(-length(d) / 0.05) * 0.5 * uSill * fl;
    }
  }
  vec4 sm = smokes(ro, rd, t);
  col = col * sm.a + sm.rgb;
  col = hazeApply(col, ro, rd, t);
  vec4 m = mistVol(ro, rd, t, fc);
  col = col * m.a + m.rgb;
  col += sparks(ro, rd, t);
  return col;
}
`;
