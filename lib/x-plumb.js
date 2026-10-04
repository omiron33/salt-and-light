// The heart (verse 3), s39 and s40: the plumb line. A wall of large dressed limestone blocks; on one
// block a few Hebrew letters are cut (שבע, the root of "to swear an oath"). A plumb line hangs before
// it: a twisted cord from out of frame above and a pointed bronze bob. In s39 the light is cold and
// raking (night through a window, from the upper left) and the bob swings; in s40 it comes to rest,
// perfectly true, in clean warm lamplight from the right, its line laid exactly along a vertical joint.
// Units: metres. The wall's face is the plane z = 0 (facing +z); the line's pivot is at PIV.
// uSwing (radians, x) and uSwingZ: the pendulum's angle; uWarm 0 cold .. 1 warm lamplight.
import { LENS_GLSL } from '/song/lib/x-heart.js';

export const PIV = [0.0, 1.45, 0.11];
export const LEN = 1.3;        // pivot to the bob's tip

export const PLUMB_UNIFORMS = {
  uFocus: 0.9, uAper: 0.003,
  uSwing: 0.0, uSwingZ: 0.0, uWarm: 0.0, uSpin: 0.0, uLetters: 1.0,
};

export const PLUMB_GLSL = LENS_GLSL + /* glsl */ `
uniform float uSwing, uSwingZ, uWarm, uSpin, uLetters;
const vec3 PIV = vec3(${PIV.join(', ')});
const float LEN = ${LEN.toFixed(3)};

// the line's direction (down from the pivot)
vec3 lineDir() { return normalize(vec3(sin(uSwing), -cos(uSwing) * cos(uSwingZ), sin(uSwingZ))); }
// a frame on the bob: axis down the line
vec3 bobTip() { return PIV + lineDir() * LEN; }

// ---------------- the wall ----------------
// courses of large blocks; the joint at x = 0 runs straight down behind the line
const float CH = 0.36;       // course height
vec2 blockOf(vec2 p, out vec2 f, out vec2 sz) {
  float row = floor(p.y / CH);
  float w = 0.5 + 0.38 * hash11(row * 3.1 + 0.7);
  // every other course is offset, but the joint at x = 0 is kept in the two courses behind the bob
  // every course has a joint at x = 0 (the line's joint, true from top to bottom); the differing
  // block lengths stagger the other joints
  float off = 0.0;
  float x = p.x + off;
  float col = floor(x / w);
  f = vec2(x - col * w, p.y - row * CH);
  sz = vec2(w, CH);
  return vec2(col, row);
}
float wallSD(vec3 p) {
  vec2 f, sz; vec2 id = blockOf(p.xy, f, sz);
  float e = min(min(f.x, sz.x - f.x), min(f.y, sz.y - f.y)) + 0.012 * (fbm(p.xy * 6.0 + id * 5.0, 2) - 0.5);
  // each block's face is pillowed a little and chiselled; margins drafted round the edges
  float face = 0.004 * smoothstep(0.0, 0.05, e) + 0.003 * smoothstep(0.03, 0.06, e);
  float tool = 0.0035 * fbm(p.xy * vec2(14.0, 30.0) + id * 13.0, 4) + 0.0004 * vnoise(p.xy * 300.0) + 0.0012 * vnoise(p.xy * vec2(40.0, 160.0) + id * 3.0);
  // chipped arrises
  float chip = smoothstep(0.55, 0.8, fbm(p.xy * 25.0 + id * 7.0, 3)) * smoothstep(0.03, 0.0, e) * 0.008;
  float joint = 0.006 * smoothstep(0.012, 0.0, e);
  return p.z - face - tool + joint + chip;
}

// the letters: strokes cut into the block to the left of the line. Hebrew reads right to left:
// shin, bet, ayin. Each stroke a capsule in the wall plane (2D), cut v-shaped.
float seg2(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
const vec2 LO = vec2(-0.09, 0.5);    // the inscription's lower right corner
const float LS = 0.12;                // letter height
float lettersD(vec2 q) {
  vec2 p = (q - LO) / LS;             // letter units: y 0..1, x leftward negative
  float d = 1e9;
  // shin (rightmost): three arms rising from a rounded base
  vec2 s = p - vec2(-0.45, 0.0);
  d = min(d, seg2(s, vec2(0.38, 1.0), vec2(0.3, 0.08)));
  d = min(d, seg2(s, vec2(0.3, 0.08), vec2(-0.3, 0.08)));
  d = min(d, seg2(s, vec2(-0.3, 0.08), vec2(-0.4, 1.0)));
  d = min(d, seg2(s, vec2(0.0, 0.62), vec2(-0.08, 0.1)));
  d = min(d, seg2(s, vec2(0.38, 1.0), vec2(0.28, 0.95)));
  d = min(d, seg2(s, vec2(0.0, 0.62), vec2(0.08, 0.66)));
  d = min(d, seg2(s, vec2(-0.4, 1.0), vec2(-0.3, 1.0)));
  // bet: roof, right side, base running out past it to the left
  vec2 b = p - vec2(-1.45, 0.0);
  d = min(d, seg2(b, vec2(-0.32, 0.92), vec2(0.28, 0.92)));
  d = min(d, seg2(b, vec2(0.28, 0.92), vec2(0.28, 0.08)));
  d = min(d, seg2(b, vec2(0.42, 0.06), vec2(-0.38, 0.06)));
  // ayin (leftmost): two arms, the right one long and running down to a tail at the left
  vec2 a = p - vec2(-2.35, 0.0);
  d = min(d, seg2(a, vec2(-0.3, 0.95), vec2(0.0, 0.35)));
  d = min(d, seg2(a, vec2(0.3, 0.95), vec2(0.05, 0.25)));
  d = min(d, seg2(a, vec2(0.05, 0.25), vec2(-0.38, 0.04)));
  return d * LS;
}
float lettersCut(vec2 q) {
  if (uLetters < 0.001 || q.x > LO.x + 0.06 || q.x < LO.x - 0.42 || q.y < LO.y - 0.05 || q.y > LO.y + LS + 0.05) return 0.0;
  float d = lettersD(q);
  // worn v-cut, 7 mm wide
  return uLetters * 0.004 * smoothstep(0.0055, 0.0, d) * (0.85 + 0.15 * vnoise(q * 200.0));
}

// ---------------- the plumb line ----------------
float cordSD(vec3 p) {
  vec3 a = PIV + vec3(0.0, 2.0, 0.0) * 0.0, dir = lineDir();
  vec3 top = PIV - dir * 1.0;                      // runs on up out of frame
  vec3 bt = PIV + dir * (LEN - 0.105);             // where it ties onto the bob
  float d = sdCapsule(p, top, bt, 0.0011);
  return d;
}
// the bob: a turned bronze plummet, a cap with a ring, a body that tapers to a point
float bobSD(vec3 p, out float hy) {
  vec3 dir = lineDir();
  vec3 tip = bobTip();
  // local frame: y up the line from the tip
  vec3 up = -dir;
  vec3 r0 = normalize(cross(up, vec3(0.0, 0.0, 1.0)));
  vec3 r1 = cross(r0, up);
  vec3 q = p - tip;
  float y = dot(q, up);
  vec2 xz = vec2(dot(q, r0), dot(q, r1));
  xz = rot(uSpin) * xz;
  float rr = length(xz);
  hy = y;
  // profile: point (y = 0) widening to a shoulder at 0.06, a neck, a cap and a ring
  float prof = mix(0.0, 0.021, smoothstep(0.0, 0.062, y)) * (1.0 - 0.15 * smoothstep(0.06, 0.08, y));
  prof += 0.003 * smoothstep(0.06, 0.064, y) * smoothstep(0.075, 0.07, y);     // a turned bead
  prof = mix(prof, 0.008, smoothstep(0.082, 0.092, y));                       // neck
  float body = max(rr - prof, max(-y, y - 0.1)) * 0.8;
  float ring = length(vec2(length(vec2(xz.x, y - 0.104)) - 0.006, xz.y)) - 0.0016;
  return min(body, ring);
}

float mapP(vec3 p, out int id) {
  float d = wallSD(p) + lettersCut(p.xy); id = 1;
  float c = cordSD(p);
  if (c < d) { d = c; id = 2; }
  float hy; float b = bobSD(p, hy);
  if (b < d) { d = b; id = 3; }
  return d;
}
float mapPd(vec3 p) { int i; return mapP(p, i); }
vec3 normP(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0002;
  return normalize(e.xyy * mapPd(p + e.xyy) + e.yyx * mapPd(p + e.yyx) + e.yxy * mapPd(p + e.yxy) + e.xxx * mapPd(p + e.xxx));
}
float marchP(vec3 ro, vec3 rd, out int id) {
  float t = 0.05;
  for (int i = 0; i < 160; i++) {
    float d = mapP(ro + rd * t, id);
    if (abs(d) < 0.0001 * t) return t;
    t += d * 0.85;
    if (t > 6.0) break;
  }
  id = -1; return -1.0;
}
// the shadow of everything but the thin cord (whose soft-shadow estimate would smear it wide)
float mapNC(vec3 p) { float hy; return min(wallSD(p) + lettersCut(p.xy), bobSD(p, hy)); }
// the cord's own shadow: a crisp line widened only by the light's size with distance
float cordShadow(vec3 p, vec3 L, float size) {
  vec3 dir = lineDir();
  vec3 a = PIV - dir * 1.0, b = PIV + dir * (LEN - 0.105);
  vec3 u = b - a; vec3 w0 = p - a;
  float A = dot(L, L), B = dot(L, u), C = dot(u, u), D = dot(L, w0), E = dot(u, w0);
  float den = A * C - B * B;
  float sc = (B * E - C * D) / den, tc = (A * E - B * D) / den;
  tc = sat(tc); sc = max((tc * B - D) / A, 0.0);
  float dist = length(w0 + L * sc - u * tc);
  float pen = 0.0011 + size * sc;
  return 1.0 - 0.85 * smoothstep(pen, pen * 0.3, dist);
}
float shadowP(vec3 p, vec3 L, float maxT, float k) {
  float res = 1.0, t = 0.004;
  for (int i = 0; i < 32; i++) {
    float h = mapNC(p + L * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.002, 0.08);
    if (res < 0.01 || t > maxT) break;
  }
  return smoothstep(0.0, 1.0, res);
}

// the two lights: cold moonlight from a high window at the upper left (a broad, distant source),
// and the warm lamp low to the right (a near point)
const vec3 MOONDIR = normalize(vec3(-0.75, 0.55, 0.38));
const vec3 LAMPP = vec3(0.75, 0.8, 0.62);

vec3 plumb(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id;
  float t = marchP(ro, rd, id);
  vec3 col = vec3(0.003, 0.0035, 0.005);
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normP(p), v = -rd;
    vec3 alb; float rough = 0.85, spec = 0.035, metal = 0.0;
    if (id == 1) {
      vec2 f, sz; vec2 bid = blockOf(p.xy, f, sz);
      float h = hash12(bid);
      alb = vec3(0.52, 0.47, 0.39) * (0.78 + 0.3 * h) * (0.75 + 0.35 * fbm(p.xy * 7.0 + h * 11.0, 4));
      // lichen and weathering stains running down
      alb *= 1.0 - 0.25 * smoothstep(0.55, 0.8, fbm(vec2(p.x * 9.0, p.y * 2.0) + h * 5.0, 3));
      float e = min(min(f.x, sz.x - f.x), min(f.y, sz.y - f.y));
      alb *= mix(0.55, 1.0, smoothstep(0.0, 0.012, e));
      // inside the letters the stone is darker (old soot and dirt in the cuts)
      float ld = uLetters > 0.0 ? lettersD(p.xy) : 1.0;
      alb *= mix(1.0 - 0.4 * uLetters, 1.0, smoothstep(0.0, 0.006, ld));
    } else if (id == 2) {
      // linen cord, waxed
      alb = vec3(0.55, 0.5, 0.42) * (0.8 + 0.2 * sin(dot(p, lineDir()) * 2600.0));
      rough = 0.6;
    } else {
      // cast bronze, a dark patina and a polished turned band
      float hy; bobSD(p, hy);
      alb = vec3(0.62, 0.42, 0.24) * (0.75 + 0.25 * fbm(p.xy * 300.0, 2));
      float band = smoothstep(0.058, 0.062, hy) * smoothstep(0.078, 0.074, hy);
      alb = mix(alb * vec3(0.7, 0.75, 0.7), alb * 1.25, band);
      rough = mix(0.35, 0.15, band); metal = 1.0;
    }
    vec3 f0 = mix(vec3(spec), alb, metal);
    vec3 acc = vec3(0);
    // moon
    {
      vec3 L = MOONDIR;
      float nl = sat(dot(n, L));
      float sh = nl > 0.0 ? shadowP(p + n * 0.001, L, 2.0, 90.0) * cordShadow(p, L, 0.01) : 0.0;
      // the window's light falls in a soft slanted pool, fading to the lower right
      // a slanting shaft from the window, across the letters and down to the bob
      vec2 bd = normalize(vec2(0.6, -0.44));
      vec2 bq = p.xy - vec2(-0.6, 0.64);
      float across = abs(bq.x * bd.y - bq.y * bd.x);
      float pool = smoothstep(0.42, 0.12, across + 0.08 * fbm(p.xy * 3.0, 2)) * smoothstep(-0.9, -0.3, dot(bq, bd));
      vec3 lc = vec3(0.32, 0.4, 0.58) * 5.5 * (1.0 - uWarm) * (0.12 + 0.88 * pool);
      vec3 h = normalize(L + v); float nh = sat(dot(n, h));
      float a = max(0.03, rough * rough), a2 = a * a;
      float D = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
      vec3 F = f0 + (1.0 - f0) * pow(1.0 - sat(dot(h, v)), 5.0);
      acc += (alb * (1.0 - metal) / PI + D * F * 0.25) * lc * nl * sh;
    }
    // lamp
    {
      vec3 L = LAMPP - p; float d2 = dot(L, L); L *= inversesqrt(d2);
      float nl = sat(dot(n, L));
      float sh = nl > 0.0 ? shadowP(p + n * 0.001, L, sqrt(d2), 14.0) * cordShadow(p, L, 0.012) : 0.0;
      float fl = 0.95 + 0.05 * vnoise(vec2(uTime * 6.0, 2.0));
      vec3 lc = vec3(1.0, 0.66, 0.36) * 1.7 / (d2 * sqrt(d2)) * uWarm * fl;
      vec3 h = normalize(L + v); float nh = sat(dot(n, h));
      float a = max(0.03, rough * rough), a2 = a * a;
      float D = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
      vec3 F = f0 + (1.0 - f0) * pow(1.0 - sat(dot(h, v)), 5.0);
      acc += (alb * (1.0 - metal) / PI + D * F * 0.25) * lc * nl * sh;
    }
    // the room's soft fill
    vec3 fill = mix(vec3(0.03, 0.04, 0.065), vec3(0.09, 0.065, 0.045), uWarm);
    acc += (alb * (1.0 - metal) + f0 * 0.5 * metal) * fill * (0.5 + 0.5 * n.z);
    // bronze and cord catch the room: a dim reflection of the light's colour
    if (id == 3) { vec3 rr = reflect(rd, n); col = acc + alb * mix(vec3(0.25, 0.3, 0.42), vec3(0.9, 0.6, 0.35), uWarm) * (0.12 + 0.5 * pow(sat(dot(rr, mix(MOONDIR, normalize(LAMPP - p), uWarm))), 6.0)); }
    else col = acc;
  }
  // a little dust drifting in the light
  float g = 0.0;
  for (int i = 0; i < 3; i++) {
    float z = 0.2 + 0.25 * float(i);
    float tz = (z - ro.z) / rd.z;
    if (tz > 0.0 && (t < 0.0 || tz < t)) {
      vec2 q = (ro + rd * tz).xy * 90.0 + vec2(uTime * 0.3, -uTime * 0.15 + float(i) * 7.0);
      vec2 cell = floor(q), f = fract(q) - 0.5;
      vec2 o = hash22(cell + float(i) * 13.0) - 0.5;
      float m = step(0.94, hash12(cell + 3.1 + float(i)));
      g += m * exp(-dot(f - o * 0.6, f - o * 0.6) * 80.0);
    }
  }
  col += mix(vec3(0.3, 0.38, 0.55), vec3(1.0, 0.7, 0.4), uWarm) * g * 0.012;
  return col;
}
`;
