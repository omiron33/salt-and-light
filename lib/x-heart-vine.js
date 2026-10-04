// The heart (verse 3), s37: the pruned vine. In the dark, an old grapevine: a thick, twisted trunk of
// shaggy, fissured bark rises on the right and turns into the trained arm that runs left across the
// frame. Green shoots rise from the arm with real grape leaves (five-lobed, serrated, veined; the side
// light glows through the ones turned away from it, a few curl at the edge), tendrils coil, and one
// small dark cluster of grapes hangs below. One branch hangs from the arm withered: dry, grey and
// brittle, with two dead curled leaves. A lamp out of shot on the left lights it all from the side;
// behind, out of focus, the next vineyard row is a soft dark band with a few warm glints.
// A forged iron pruning hook with a worn wooden handle (in shadow, running out of frame so no hand is
// implied) rises into shot, poises, and on "Tear" sweeps through the withered branch at its base: the
// cut branch tumbles away down into the dark and the vine shivers.
// Units: metres; the camera looks along -z, so screen right is +x. uCut: song time of the cut.
import { LENS_GLSL } from '/song/lib/x-heart.js';

export const VINE_UNIFORMS = {
  uFocus: 0.55, uAper: 0.006,
  uCut: 1e4,          // song time the blade passes through the branch
  uKpos: [0.4, 0.3, 0.0], uKang: 0.0,   // knife position and rotation (about z)
  uShiver: 0.0,       // the vine's shiver after the cut
};
export const KNIFE = { KR: 0.075, KA: 1.05, KW: 0.02, KT: 0.55 };

export const VINE_GLSL = LENS_GLSL + /* glsl */ `
uniform float uCut, uKang, uShiver;
uniform vec3 uKpos;

// the light: a lamp out of shot on the left, at the vine's height (a side light)
const vec3 KEYP = vec3(-0.45, 0.02, 0.45);
// a second, fainter lamp further off behind the vine: it glows through the leaves and rims the bark
const vec3 BACKP = vec3(-0.35, 0.3, -0.6);
const vec3 KEYC = vec3(1.0, 0.7, 0.42);

// ---------------- bark ----------------
// deep fissures between long plates, with strips peeling off them (s: along the limb, a: round it)
// shaggy grape bark: long narrow plates running along the limb (stretched cells), split by dark
// fissures; each plate is made of fibrous strips, and many plates lift and peel away at one end.
// gBark: x = fissure (0 in a crack .. 1 on a plate), y = plate id, z = peel lift
vec3 gBark;
float barkD(float s, float a, float k) {
  vec2 uv = vec2(s * 15.0 * k, a * 2.6);
  uv += vec2(0.7, 0.9) * (vec2(fbm(uv * vec2(0.35, 0.9) + 3.0, 3), fbm(uv * vec2(0.5, 0.7) + 8.0, 3)) - 0.5);
  vec2 vc = voronoiEdge(uv * vec2(1.0, 1.0));
  float plate = smoothstep(0.0, 0.3, vc.x + 0.08 * (vnoise(uv * 6.0) - 0.5));
  float id = vc.y;
  // fibrous strips within the plate, running along the limb
  float fib = fbm(vec2(s * 14.0, a * 16.0 + id * 9.0), 3);
  float strips = fbm(vec2(s * 30.0, a * 22.0 + id * 9.0), 3);
  // the peel: the plate's surface rises toward one end and frays
  float ph = fract(uv.x + id * 3.0);
  float peel = step(0.55, hash11(id * 17.0)) * smoothstep(0.3, 0.95, ph) * plate;
  gBark = vec3(plate, id, peel);
  return 0.0032 * plate + 0.0012 * strips * plate + 0.0008 * fib + 0.0016 * peel;
}
// the arm: runs along x at about y = 0.07, into the trunk at the right
vec3 cordC(float x) {
  return vec3(x, 0.07 + 0.016 * sin(x * 7.0 + 0.6) + 0.007 * sin(x * 19.0) - 0.05 * smoothstep(0.24, 0.36, x) * 0.0, -0.02 + 0.014 * sin(x * 5.0 + 1.2));
}
float cordR(float x) { return 0.02 + 0.004 * sin(x * 11.0 + 0.3) + 0.003 * sin(x * 27.0) + 0.01 * smoothstep(0.1, 0.33, x); }
// the trunk: rises from below on the right, twisting
const float TX = 0.34;
vec3 trunkC(float y) {
  return vec3(TX + 0.025 * sin(y * 8.0 + 1.0) + 0.012 * sin(y * 21.0), y, -0.03 + 0.02 * sin(y * 6.0 + 2.0));
}
float trunkR(float y) { return 0.036 + 0.006 * sin(y * 13.0) - 0.012 * smoothstep(-0.1, 0.07, y); }
float woodSD(vec3 p, out float bark) {
  // arm
  vec3 c = cordC(p.x);
  vec2 d = p.yz - c.yz;
  float a = atan(d.y, d.x) + 0.25 * sin(p.x * 5.0);
  float ra = length(d) - cordR(p.x);
  float bA = ra < 0.02 ? barkD(p.x, a, 1.0) : 0.0;
  float arm = (ra - bA) * 0.7;
  arm = max(arm, p.x - TX);
  // trunk
  vec3 tc = trunkC(p.y);
  vec2 e = p.xz - tc.xz;
  float at = atan(e.y, e.x) + 0.3 * sin(p.y * 4.0);
  float rt = length(e) - trunkR(p.y);
  float bT = rt < 0.02 ? barkD(p.y * 0.8, at, 1.0) * 1.3 : 0.0;
  float tr = (rt - bT) * 0.7;
  tr = max(tr, p.y - cordC(TX).y);
  bark = arm < tr ? bA : bT;
  return smin(arm, tr, 0.03);
}

// ---------------- leaves ----------------
// palmate grape leaf in its own frame: q.x along the midrib from the petiole junction, q.y across.
// Returns the outline radius at angle th, for leaf radius R.
float leafRad(float th, float R) {
  float at = abs(th);
  float l0 = exp(-th * th / 0.16);
  float l1 = 0.9 * exp(-pow(at - 1.05, 2.0) / 0.14);
  float l2 = 0.72 * exp(-pow(at - 2.05, 2.0) / 0.12);
  float prof = max(max(l0, l1), l2);
  float rr = R * (0.74 + 0.26 * prof);
  // the open sinus at the petiole
  rr *= mix(1.0, 0.15, smoothstep(2.55, 3.05, at));
  // serrated teeth pointing forward along the edge
  float tt = fract(at * (9.0 + 4.0 * R / 0.06));
  rr -= R * 0.04 * tt * tt;
  return rr;
}
// the outline without its teeth (for the smooth curl of the blade)
float leafRadS(float th, float R) {
  float at = abs(th);
  float prof = max(max(exp(-th * th / 0.16), 0.9 * exp(-pow(at - 1.05, 2.0) / 0.14)), 0.72 * exp(-pow(at - 2.05, 2.0) / 0.12));
  return R * (0.74 + 0.26 * prof) * mix(1.0, 0.15, smoothstep(2.55, 3.05, at));
}
#define NL 6
vec3 leafO(int i) {
  if (i == 0) return vec3(-0.13, 0.135, 0.025);
  if (i == 1) return vec3(0.0, 0.16, -0.04);
  if (i == 2) return vec3(0.15, 0.145, -0.02);
  if (i == 3) return vec3(-0.25, 0.1, 0.03);
  if (i == 4) return vec3(0.27, 0.17, 0.035);
  return vec3(-0.06, 0.225, 0.07);
}
vec3 leafN(int i) {
  if (i == 0) return normalize(vec3(-0.6, 0.25, 1.0));
  if (i == 1) return normalize(vec3(0.55, 0.3, 1.0));
  if (i == 2) return normalize(vec3(0.75, 0.1, 0.7));
  if (i == 3) return normalize(vec3(-0.4, 0.5, 1.0));
  if (i == 4) return normalize(vec3(0.6, 0.2, 1.0));
  return normalize(vec3(-0.2, -0.6, 1.0));
}
vec3 leafU(int i) {
  if (i == 0) return normalize(vec3(-0.35, 1.0, 0.0));
  if (i == 1) return normalize(vec3(0.15, 1.0, 0.1));
  if (i == 2) return normalize(vec3(0.5, 0.85, 0.0));
  if (i == 3) return normalize(vec3(-0.8, 0.5, 0.0));
  if (i == 4) return normalize(vec3(0.35, 0.9, 0.0));
  return normalize(vec3(-0.2, 1.0, 0.3));
}
float leafR(int i) { return i == 1 ? 0.08 : i == 5 ? 0.085 : i == 3 ? 0.065 : 0.072; }
float leafCurl(int i) { return i == 2 ? 0.9 : i == 4 ? 0.6 : i == 0 ? 0.3 : 0.15; }
// local coordinates of p in leaf i (x along, y across, w off the blade) with its cup, curl and wave
vec3 leafLocal(vec3 p, int i, out float rr, out float r) {
  vec3 n = leafN(i), u = leafU(i);
  // the wind and the shiver move the leaves a little
  float sw = 0.04 * sin(uTime * 0.9 + float(i) * 2.1) + 0.1 * uShiver * sin(uTime * 20.0 + float(i));
  u = normalize(u + n * sw);
  n = normalize(n - u * dot(n, u));
  vec3 v = cross(n, u);
  vec3 q = p - leafO(i);
  float x = dot(q, u), y = dot(q, v), w = dot(q, n);
  float R = leafR(i);
  r = length(vec2(x, y));
  float th = atan(y, x);
  rr = leafRad(th, R);
  float k = r / max(leafRadS(th, R), 1e-4);
  // cupped about the midrib, waved, and curling back at the edge
  w -= 0.22 * y * y / R + 0.06 * x * x / R - 0.004 * abs(y) / R * 0.01;
  w += leafCurl(i) * R * 0.18 * pow(sat((k - 0.65) / 0.35), 2.0);
  return vec3(x, y, w);
}
float leafSD(vec3 p, int i) {
  float rr, r;
  vec3 l = leafLocal(p, i, rr, r);
  float d2 = r - rr;
  return max(d2 * 0.7, abs(l.z) - 0.0005) * 0.6;
}
// the vein pattern at a leaf point (1 on a vein)
float leafVein(vec3 l, float R) {
  float r = length(l.xy), th = atan(l.y, l.x);
  float v = 0.0;
  float an[5] = float[5](0.0, 1.0, -1.0, 1.95, -1.95);
  for (int k = 0; k < 5; k++) {
    float dth = th - an[k];
    float along = r * cos(dth), perp = r * sin(dth);
    if (along < 0.0) continue;
    float wv = mix(0.0013, 0.0004, sat(along / R));
    v = max(v, smoothstep(wv, wv * 0.3, abs(perp)));
    // secondary veins running out to the teeth
    float sec = abs(fract((along - abs(perp) * 0.9) * 55.0 / R * 0.06) - 0.5);
    v = max(v, 0.6 * smoothstep(0.05, 0.0, sec) * smoothstep(0.012, 0.0, abs(perp) - 0.004 - along * 0.2) * smoothstep(0.004, 0.012, abs(perp)));
  }
  return v;
}

// shoots from the arm to each leaf's petiole
vec3 caneBase(int i) { vec3 o = leafO(i); vec3 c = cordC(clamp(o.x * 0.8 + 0.02, -0.4, TX)); return c + vec3(0.0, 0.015, 0.0); }
float caneSD(vec3 p, int i) {
  vec3 a = caneBase(i), c = leafO(i);
  vec3 b = mix(a, c, 0.5) + vec3(0.02 * sin(float(i) * 3.0), 0.0, 0.015);
  float r = 0.003;
  return min(sdCapsule(p, a, b, r), sdCapsule(p, b, c, r * 0.6));
}
// tendrils: a stalk and a tight coil
float helixSD(vec3 q, float rad, float pitch, float len, float th) {
  float a = atan(q.z, q.x);
  float yy = q.y - a / 6.2832 * pitch;
  yy -= pitch * floor(yy / pitch + 0.5);
  float d = length(vec2(length(q.xz) - rad, yy)) - th;
  return max(d * 0.6, abs(q.y - len * 0.5) - len * 0.5);
}
float tendrilSD(vec3 p) {
  // one from the shoot of leaf 1, curling up and to the left
  vec3 a = vec3(0.02, 0.12, -0.02), b = vec3(-0.04, 0.17, 0.0);
  float d = sdCapsule(p, a, b, 0.0011);
  vec3 q = p - b; q.xy = rot(-0.9) * q.xy;
  d = min(d, helixSD(q, 0.0045, 0.006, 0.03, 0.001));
  // one from leaf 2's shoot, hanging down to the right
  vec3 c = vec3(0.2, 0.11, 0.0), e = vec3(0.235, 0.075, 0.02);
  d = min(d, sdCapsule(p, c, e, 0.001));
  vec3 q2 = p - e; q2.xy = rot(2.6) * q2.xy;
  d = min(d, helixSD(q2, 0.004, 0.005, 0.025, 0.0009));
  return d;
}

// ---------------- the grapes ----------------
const vec3 GS = vec3(-0.11, 0.06, 0.04);   // where the bunch hangs from
vec3 berryP(int i) {
  float fi = float(i);
  float t = (fi + 0.5) / 30.0;                              // 0 top .. 1 bottom
  float ang = fi * 2.399 + hash11(fi * 9.1) * 0.6;
  float rad = 0.024 * (1.0 - 0.7 * t) * sqrt(0.35 + 0.65 * hash11(fi * 3.7));
  return GS + vec3(rad * cos(ang) + 0.004 * t, -0.012 - 0.042 * t + 0.004 * hash11(fi * 2.3), rad * sin(ang) * 0.9);
}
float grapesSD(vec3 p, out int which) {
  which = 0;
  float b = sdBox(p - (GS + vec3(0.0, -0.04, 0.0)), vec3(0.035, 0.05, 0.035));
  if (b > 0.01) return b;
  float d = min(sdCapsule(p, GS + vec3(0.01, 0.03, -0.045), GS + vec3(0.0, 0.0, 0.0), 0.0016), sdCapsule(p, GS, GS + vec3(0.004, -0.055, 0.0), 0.0012));   // the stalk
  for (int i = 0; i < 30; i++) {
    float r = 0.0068 + 0.0014 * hash11(float(i) * 5.3);
    float s = length((p - berryP(i)) / vec3(1.0, 1.12, 1.0)) - r;
    if (s < d) { d = s; which = i + 1; }
  }
  return d;
}

// ---------------- the withered branch ----------------
const vec3 WA = vec3(0.07, 0.07, 0.0);
const vec3 WB = vec3(0.15, -0.06, 0.04);
const vec3 WC = vec3(0.19, -0.16, 0.05);
const vec3 CUTP = vec3(0.092, 0.035, 0.011);   // where the blade passes (near the base)
float fallT() { return max(uTime - uCut - 0.03, 0.0); }
vec3 fallFrame(vec3 p) {
  float t = fallT();
  if (t <= 0.0) return p;
  vec3 drop = vec3(0.035 * t, -0.2 * t * t - 0.03 * t, 0.04 * t);
  vec3 q = p - CUTP - drop;
  q.xy = rot(-0.6 * t * t - 0.35 * t) * q.xy;
  q.yz = rot(0.5 * t) * q.yz;
  return q + CUTP;
}
// dry wood: thin, knobbly, cracked along its length
float deadWood(vec3 p) {
  vec3 ax = normalize(WB - WA);
  float s = dot(p - WA, ax);
  float knob = 0.0012 * smoothstep(0.6, 1.0, sin(s * 70.0)) + 0.0006 * vnoise(vec2(s * 300.0, atan(p.z, p.x) * 3.0));
  vec3 M = mix(WA, WB, 0.55) + vec3(0.012, 0.004, 0.006);
  float d = min(min(sdCapsule(p, WA, M, 0.0055), sdCapsule(p, M, WB, 0.0047)), sdCapsule(p, WB, WC + vec3(-0.01, 0.0, 0.0), 0.0036));
  // a short side twig with a broken end, and a dry tendril
  d = min(d, sdCapsule(p, M, M + vec3(0.022, -0.012, 0.008), 0.0022));
  return d - knob;
}
// a dead leaf: the same leaf, shrivelled, curled hard and torn
float deadLeafSD(vec3 p, vec3 o, vec3 n, vec3 u, float R, float curl, float seed) {
  vec3 v = normalize(cross(n, u));
  vec3 q = p - o;
  float x = dot(q, u), y = dot(q, v), w = dot(q, n);
  float r = length(vec2(x, y)), th = atan(y, x);
  float rr = leafRad(th, R) * (0.85 + 0.15 * vnoise(vec2(th * 3.0, seed)));
  float k = r / rr;
  w -= curl * R * 0.8 * k * k * k + 0.3 * r * r / R * sin(th * 2.0 + seed);
  float tear = smoothstep(0.62, 0.7, fbm(vec2(x, y) * 120.0 + seed, 3));
  return max((r - rr) * 0.6 + tear * 0.004, abs(w) - 0.0005) * 0.7;
}

int gWhich;
int gLeaf;
float vineMap(vec3 p) {
  vec3 ps = p;
  float sv = uShiver * sin(uTime * 23.0) * smoothstep(-0.1, 0.25, p.x) * smoothstep(0.38, 0.25, p.x);
  ps.y += sv * 0.003; ps.z += sv * 0.002;
  float bark;
  float d = woodSD(ps, bark); gWhich = 1;
  // shoots, leaves and tendrils above the arm
  float lb = sdBox(ps - vec3(0.0, 0.18, 0.0), vec3(0.4, 0.14, 0.14));
  if (lb < 0.02) {
    for (int i = 0; i < NL; i++) {
      float c = caneSD(ps, i);
      if (c < d) { d = c; gWhich = 2; }
      float l = leafSD(ps, i);
      if (l < d) { d = l; gWhich = 3; gLeaf = i; }
    }
    float td = tendrilSD(ps);
    if (td < d) { d = td; gWhich = 2; }
  } else d = min(d, lb);
  // the grapes
  int bw; float g = grapesSD(ps, bw);
  if (g < d) { d = g; gWhich = bw > 0 ? 7 : 2; gLeaf = bw; }
  // the withered branch: the stub stays, the rest falls after the cut
  bool cut = uTime > uCut + 0.03;
  vec3 pf = cut ? fallFrame(p) : ps;
  vec3 ax = normalize(WB - WA);
  float wb = deadWood(pf);
  if (cut) {
    wb = max(wb, -dot(pf - CUTP, ax) + 0.0006);
    float stub = max(sdCapsule(ps, WA, WB, 0.0055), dot(ps - CUTP, ax) + 0.0006);
    wb = min(wb, stub);
  }
  if (wb < d) gWhich = 4;
  d = smin(d, wb, 0.008);
  float db = sdBox(pf - vec3(0.17, -0.13, 0.01), vec3(0.09, 0.13, 0.07));
  if (db < 0.02) {
    float dl = deadLeafSD(pf, WB + vec3(0.032, -0.03, 0.012), normalize(vec3(0.5, 0.2, 1.0)), normalize(vec3(0.5, -0.85, 0.0)), 0.038, 0.55, 1.0);
    dl = min(dl, deadLeafSD(pf, WC + vec3(-0.024, -0.028, 0.01), normalize(vec3(-0.4, 0.1, 1.0)), normalize(vec3(-0.3, -0.95, 0.0)), 0.032, -0.6, 4.0));
    if (cut) dl = max(dl, -dot(pf - CUTP, ax));
    if (dl < d) { d = dl; gWhich = 5; }
  } else d = min(d, db);
  return d;
}

// ---------------- the pruning hook ----------------
const float KR = ${'${KR}'}, KA = ${'${KA}'}, KW = ${'${KW}'}, KT = ${'${KT}'};
vec3 knifeLocal(vec3 p) {
  vec3 q = p - uKpos;
  q.xy = rot(uKang) * q.xy;
  q.xz = rot(KT) * q.xz;
  return q;
}
// e = 0 at the edge .. 1 at the spine; part: 0 blade, 1 handle, 2 ferrule
float knifeSDL(vec3 q, out float e, out float part) {
  float r = length(q.xy), an = atan(q.y, q.x);
  float s = sat(an / KA);
  float w = KW * (1.0 - pow(s, 2.2)) + 0.0008;
  float cen = KR - 0.35 * w;
  float dr = abs(r - cen) - w * 0.5;
  float da = max(-an, an - KA) * r;
  float blade = max(dr, da);
  // the tang runs down into the ferrule
  blade = min(blade, sdBox(q - vec3(KR - 0.006, -0.008, 0.0), vec3(0.0055, 0.01, 0.0015)));
  e = sat((r - (cen - 0.5 * w)) / max(w, 1e-4));
  // forged: a wedge from the spine to a honed bevel, hammer marks on the flats
  float th = 0.0003 + 0.002 * smoothstep(0.0, 0.45, e) + 0.0002 * vnoise(q.xy * 400.0);
  float b3 = max(blade, abs(q.z) - th);
  // a turned wooden handle, worn, running down out of frame
  vec3 h = q - vec3(KR - 0.006, -0.18, 0.0);
  float rad = 0.0085 + 0.0015 * smoothstep(0.1, 0.16, -h.y);
  float hand = max(length(h.xz) - rad, abs(h.y) - 0.16);
  float fer = max(length((q - vec3(KR - 0.006, -0.026, 0.0)).xz) - 0.0095, abs(q.y + 0.026) - 0.007);
  part = 0.0;
  float d = b3;
  if (fer < d) { d = fer; part = 2.0; }
  if (hand < d) { d = hand; part = 1.0; }
  return d;
}
float knifeSD(vec3 p) { float e, pt; return knifeSDL(knifeLocal(p), e, pt) * 0.9; }

float mapV(vec3 p, out int id) {
  float d = vineMap(p); id = gWhich;
  float k = knifeSD(p);
  if (k < d) { d = k; id = 6; }
  return d;
}
float mapVd(vec3 p) { int i; return mapV(p, i); }
vec3 normV(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.00015;
  return normalize(e.xyy * mapVd(p + e.xyy) + e.yyx * mapVd(p + e.yyx) + e.yxy * mapVd(p + e.yxy) + e.xxx * mapVd(p + e.xxx));
}
float marchV(vec3 ro, vec3 rd, out int id) {
  float t = 0.2;
  for (int i = 0; i < 170; i++) {
    float d = mapV(ro + rd * t, id);
    if (abs(d) < 0.0001 * t) return t;
    t += d * 0.85;
    if (t > 1.6) break;
  }
  id = -1; return -1.0;
}
float shadowV(vec3 p, vec3 L) {
  float res = 1.0, t = 0.003;
  for (int i = 0; i < 32; i++) {
    float h = mapVd(p + L * t);
    res = min(res, 16.0 * h / t);
    t += clamp(h, 0.003, 0.06);
    if (res < 0.01 || t > 0.8) break;
  }
  return smoothstep(0.0, 1.0, res);
}

// the next row of the vineyard, 1.6 m behind: soft dark masses of leaf and the stakes between them,
// the lamp's last light on their left edges, and a few warm glints on wet leaves (bokeh)
vec3 rowBehind(vec3 ro, vec3 rd) {
  float tz = (-1.6 - ro.z) / rd.z;
  if (tz < 0.0) return vec3(0.003);
  vec2 q = (ro + rd * tz).xy;
  float canopy = smoothstep(0.42, 0.62, fbm(q * vec2(2.2, 3.0) + vec2(2.0, 0.0), 4)) * smoothstep(-0.45, -0.15, q.y) * smoothstep(0.75, 0.35, q.y);
  float stake = smoothstep(0.03, 0.01, abs(fract(q.x * 0.8 + 0.3) - 0.5) / 0.8) * smoothstep(0.5, 0.3, q.y);
  float lit = pow(sat(0.6 - 0.45 * q.x), 2.0);
  vec3 c = vec3(0.004, 0.0045, 0.006);
  c += vec3(0.06, 0.07, 0.025) * canopy * (0.25 + lit);
  c += KEYC * 0.05 * canopy * lit * fbm(q * 9.0, 2);
  c = mix(c, vec3(0.01, 0.008, 0.006) * (0.4 + lit), stake * 0.8);
  // glints
  vec2 g = q * 6.0; vec2 cell = floor(g), f = fract(g) - 0.5;
  vec2 o = (hash22(cell) - 0.5) * 0.5;
  float m = step(0.8, hash12(cell + 7.0)) * canopy;
  float disc = smoothstep(0.2, 0.17, length(f - o));
  c += KEYC * disc * m * 0.35 * (0.3 + lit) * (0.6 + 0.4 * sin(uTime * 0.8 + hash12(cell) * 6.0));
  return c;
}

vec3 vine(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id;
  float t = marchV(ro, rd, id);
  vec3 col = rowBehind(ro, rd);
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normV(p), v = -rd;
    vec3 alb; float rough = 0.8, spec = 0.04, trans = 0.0, metal = 0.0;
    vec3 transC = vec3(0);
    float edgeG = 0.0;
    if (id == 1) {
      // old vine bark: grey-brown plates, dark fissures, paler peeling strips, a little lichen
      // recompute the bark pattern for whichever limb this is
      bool onArm = p.x < TX - 0.025 || p.y > cordC(TX).y - 0.005;
      if (onArm) { vec3 c = cordC(p.x); vec2 d = p.yz - c.yz; barkD(p.x, atan(d.y, d.x) + 0.25 * sin(p.x * 5.0), 1.0); }
      else { vec3 tc = trunkC(p.y); vec2 e = p.xz - tc.xz; barkD(p.y * 0.8, atan(e.y, e.x) + 0.3 * sin(p.y * 4.0), 1.0); }
      float h = hash11(gBark.y * 31.0);
      // each plate its own grey-brown; old weathered ones silver-grey, fresh-peeled ones warm tan
      vec3 plateC = mix(vec3(0.1, 0.075, 0.055), vec3(0.15, 0.14, 0.125), 0.3 * h + 0.7 * fbm(p.xy * 25.0 + p.z * 13.0, 3));
      plateC = mix(plateC, vec3(0.22, 0.15, 0.09), gBark.z * 0.7);
      plateC *= 0.75 + 0.5 * fbm(vec2(p.x + p.y, p.z) * 160.0, 3);
      alb = mix(vec3(0.02, 0.016, 0.013), plateC, gBark.x);
      // moss and lichen on the upper side, in patches
      float moss = smoothstep(0.48, 0.68, fbm(p.xz * 22.0 + p.y * 9.0, 4)) * smoothstep(-0.2, 0.5, n.y);
      alb = mix(alb, vec3(0.07, 0.1, 0.03) * (0.7 + 0.6 * fbm(p.xz * 300.0, 2)), moss * 0.85);
      float lich = smoothstep(0.7, 0.85, fbm(p.xy * 35.0 + 5.0, 3)) * gBark.x;
      alb = mix(alb, vec3(0.33, 0.34, 0.28), lich * 0.5);
      rough = 0.9;
    } else if (id == 2) {
      alb = vec3(0.16, 0.15, 0.06) * (0.8 + 0.3 * fbm(p.xy * 200.0, 2)); rough = 0.55; trans = 0.3; transC = vec3(0.3, 0.35, 0.08);
    } else if (id == 3) {
      float rr, r; vec3 l = leafLocal(p, gLeaf, rr, r);
      float R = leafR(gLeaf);
      float vein = leafVein(l, R);
      float mott = fbm(l.xy * 260.0, 3);
      // the upper face is a deep glossy green; the veins pale; the edge browning a little
      float lh = hash11(float(gLeaf) * 7.7);
      alb = mix(vec3(0.045, 0.1, 0.022), vec3(0.075, 0.105, 0.02), lh) * (0.75 + 0.5 * mott);
      alb = mix(alb, vec3(0.16, 0.2, 0.07), vein * 0.7);
      // autumn creeping in from the edge: yellow, then brown at the very rim
      float rim = r / rr;
      float yel = smoothstep(0.55, 0.95, rim + 0.25 * (fbm(l.xy * 90.0, 2) - 0.5)) * (0.3 + 0.7 * lh);
      alb = mix(alb, vec3(0.13, 0.11, 0.02), yel * 0.7);
      alb = mix(alb, vec3(0.13, 0.07, 0.025), smoothstep(0.92, 1.0, rim) * 0.8);
      // a few rust spots
      float spot = smoothstep(0.8, 0.84, vnoise(l.xy * 160.0 + float(gLeaf) * 7.0)) * step(0.4, lh);
      alb = mix(alb, vec3(0.1, 0.055, 0.02), spot * 0.85);
      rough = 0.5; spec = 0.05; trans = 1.0;
      transC = mix(vec3(0.55, 0.75, 0.1), vec3(0.18, 0.28, 0.04), vein) * (0.8 + 0.3 * mott);
    } else if (id == 4) {
      // dry dead wood: grey, split along its length, pale at the breaks
      vec3 ax = normalize(WB - WA);
      vec3 pf = uTime > uCut + 0.03 ? fallFrame(p) : p;
      float s = dot(pf, ax);
      float crack = smoothstep(0.08, 0.0, abs(vnoise(vec2(s * 40.0, atan(pf.z - WA.z, pf.x - WA.x) * 6.0)) - 0.5));
      alb = vec3(0.15, 0.145, 0.135) * (0.7 + 0.4 * fbm(vec2(s * 200.0, pf.z * 600.0), 3));
      alb *= 1.0 - 0.6 * crack;
      rough = 0.85;
    } else if (id == 5) {
      vec3 pf = uTime > uCut + 0.03 ? fallFrame(p) : p;
      alb = vec3(0.3, 0.2, 0.11) * (0.5 + 0.7 * fbm(pf.xy * 140.0, 3));
      alb = mix(alb, vec3(0.2, 0.19, 0.17), 0.4 * fbm(pf.xy * 40.0, 2));
      rough = 0.9; trans = 0.5; transC = vec3(0.5, 0.3, 0.1);
    } else if (id == 7) {
      // grapes: near-black purple under a dusty bloom
      float h = hash11(float(gLeaf) * 7.1);
      alb = mix(vec3(0.02, 0.012, 0.04), vec3(0.045, 0.018, 0.05), h);
      rough = 0.5; spec = 0.03;
      float bloom = 0.5 + 0.5 * fbm(p.xy * 900.0, 2);
      alb += vec3(0.04, 0.045, 0.065) * bloom * 0.6;
      trans = 0.2; transC = vec3(0.25, 0.02, 0.08);
    } else {
      vec3 q = knifeLocal(p); float e, part; knifeSDL(q, e, part);
      if (part == 1.0) {
        // olive wood handle, dark, worn smooth and paler where it was held
        float g = fbm(vec2(q.y * 40.0, atan(q.z, q.x - KR) * 2.0), 3);
        alb = mix(vec3(0.04, 0.028, 0.018), vec3(0.11, 0.075, 0.045), g) * (0.85 + 0.2 * sin(q.y * 90.0 + g * 9.0));
        rough = 0.45; spec = 0.045;
      } else if (part == 2.0) { alb = vec3(0.45, 0.32, 0.16); rough = 0.35; metal = 1.0; }
      else {
        // forged iron: dark, pitted, with a bright honed bevel along the inner edge
        float bevel = 1.0 - smoothstep(0.2, 0.34, e);
        edgeG = 1.0 - smoothstep(0.0, 0.12, e);
        float pit = fbm(q.xy * 500.0, 3);
        alb = mix(vec3(0.42, 0.4, 0.38) * (0.6 + 0.6 * pit), vec3(0.9, 0.88, 0.85), bevel);
        rough = mix(0.38 + 0.2 * pit, 0.1, bevel);
        metal = 1.0;
      }
    }
    vec3 f0 = mix(vec3(spec), alb, metal);
    vec3 L = KEYP - p; float dl2 = dot(L, L); L *= inversesqrt(dl2);
    float nl = dot(n, L);
    float sh = shadowV(p + n * 0.0012 * sign(nl + 1e-4), L);
    vec3 lc = KEYC * 2.4 / (0.1 + dl2) * (id == 3 ? 0.7 : 1.0);
    vec3 h = normalize(L + v); float nh = sat(dot(n, h));
    float a = max(0.02, rough * rough), a2 = a * a;
    float D = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
    vec3 F = f0 + (1.0 - f0) * pow(1.0 - sat(dot(h, v)), 5.0);
    col = (alb * (1.0 - metal) / PI * sat(nl) + D * F * sat(nl) * 0.25) * lc * sh;
    // light through leaves (and the thin parts) from the side away from us
    if (trans > 0.0) col += transC * sat(-nl) * lc * sh * 0.32 * trans * (0.4 + 0.6 * pow(sat(dot(-v, L) * 0.5 + 0.5), 2.0));
    {
      vec3 Lb = BACKP - p; float db2 = dot(Lb, Lb); Lb *= inversesqrt(db2);
      vec3 lb = KEYC * 0.5 / (0.2 + db2);
      float nb = dot(n, Lb);
      if (trans > 0.0) col += transC * sat(-nb) * lb * 0.26 * trans * (0.6 + 0.6 * fbm(p.xy * 90.0, 2));
      col += alb * (1.0 - metal) * sat(nb) * lb * 0.35 * pow(1.0 - sat(dot(n, v)), 2.0);
    }
    // a cool faint fill from behind on the right so the dark side keeps its form
    vec3 R = normalize(vec3(0.7, 0.4, -0.6));
    col += (alb * (1.0 - metal) + f0 * 0.3) * vec3(0.04, 0.05, 0.08) * (0.1 + 0.9 * pow(sat(dot(n, R)), 2.0));
    col += alb * vec3(0.004, 0.004, 0.006);
    // metal reflects the lamp as a soft bright source and the dark room otherwise
    if (metal > 0.5) {
      vec3 rr = reflect(rd, n);
      float lobe = pow(sat(dot(rr, L)), 18.0 / (rough + 0.05));
      float broad = pow(sat(dot(rr, L) * 0.5 + 0.5), 3.0);
      col += f0 * (KEYC * (lobe * 3.0 + broad * 0.25) * sh + KEYC * 0.12 * pow(sat(dot(rr, normalize(BACKP - p)) * 0.5 + 0.5), 4.0) + vec3(0.012, 0.014, 0.018));
    }
    // the honed edge: a thin line of light along the inside of the hook (it catches the lamp at any angle)
    col += KEYC * edgeG * (0.35 + 0.65 * pow(sat(dot(reflect(rd, n), L) * 0.5 + 0.5), 3.0)) * 0.9;
    // falling into darkness: the deeper it goes the less light reaches it
    col *= exp(-max(-p.y - 0.12, 0.0) * 6.0);
  }
  // a little dust drifting in the lamp's light
  float g = 0.0;
  for (int i = 0; i < 3; i++) {
    float z = -0.1 + 0.12 * float(i);
    float tz = (z - ro.z) / rd.z;
    if (tz > 0.0 && (t < 0.0 || tz < t)) {
      vec2 q = (ro + rd * tz).xy * 140.0 + vec2(uTime * 0.6, uTime * 0.25 + float(i) * 7.0);
      vec2 cell = floor(q), f = fract(q) - 0.5;
      vec2 o = hash22(cell + float(i) * 13.0) - 0.5;
      float m = step(0.93, hash12(cell + 3.1 + float(i)));
      g += m * exp(-dot(f - o * 0.6, f - o * 0.6) * 90.0) * 0.6;
    }
  }
  col += KEYC * g * 0.03 * pow(sat(0.5 - 0.5 * rd.x), 1.5);
  return col;
}
`.replace('${KR}', KNIFE.KR.toFixed(3)).replace('${KA}', KNIFE.KA.toFixed(3)).replace('${KW}', KNIFE.KW.toFixed(3)).replace('${KT}', KNIFE.KT.toFixed(3));
