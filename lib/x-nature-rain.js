// s02's world: "Blessed are the ones who mourn." Night rain at a doorway. Dark wet basalt cobbles
// run up to a wall of rough stone blocks; on the left a dark doorway, on the right a small arched
// niche in the wall where a clay oil lamp burns, sheltered and steady. Rain falls through the frame
// in layers and splashes on the stones; puddles in the gaps ripple. Every drop takes the lamp's
// light by how close it passes and how it lies against it (forward scatter): drops between us and
// the lamp shine like falling sparks. uEase (0..1) is the rain easing on "comfort".
// World: ground y = 0, wall face at z = WZ facing the camera (-z).
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const RAIN_UNIFORMS = { ...NATURE_UNIFORMS, uEase: 0, uSpark: 0, uLampK: 1 };

export const RAIN_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uEase, uSpark, uLampK;
const float WZ = 2.4;
const vec3 NICHE = vec3(-0.35, 0.52, WZ);       // niche floor centre, at the wall face
const vec3 LAMPB = vec3(-0.35, 0.52, WZ + 0.075); // lamp body centre on the niche floor
const vec3 WICK = vec3(-0.29, 0.565, WZ + 0.02);
vec3 flameC() { return WICK + vec3(0.0, 0.022, 0.0); }

// cobbles: rounded basalt setts in a loose grid (voronoi), tops worn smooth
vec3 cobble(vec2 xz) {
  vec2 w = xz + 0.04 * vec2(vnoise(xz * 3.0), vnoise(xz * 3.0 + 7.0));
  vec2 ve = voronoiEdge(w * vec2(5.2, 6.4));
  float e = ve.x;
  float dome = smoothstep(0.0, 0.22, e);
  dome = dome * (2.0 - dome);
  float h = 0.026 * dome * (0.6 + 0.6 * ve.y) - 0.005;
  h += 0.006 * (fbm(xz * 14.0 + ve.y * 9.0, 3) - 0.5) * dome + 0.0015 * vnoise(xz * 90.0) * dome;
  return vec3(h, e, ve.y);
}
float groundH(vec2 xz) { return cobble(xz).x; }

float sdArchNiche(vec3 p) {
  // an arched recess: a box with a half-round top, cut into the wall
  vec3 q = p - vec3(NICHE.x, NICHE.y, WZ + 0.13);
  float box = sdBox(q - vec3(0.0, 0.14, 0.0), vec3(0.165, 0.14, 0.13));
  float arch = max(length(q.xy - vec2(0.0, 0.28)) - 0.165, abs(q.z) - 0.13);
  return min(box, arch);
}
// rough ashlar: rows of blocks, mortar joints sunk a little
float blocks(vec3 p, out float jd) {
  float row = floor(p.y / 0.29);
  float off = hash11(row * 3.1) * 0.6;
  float bx = (p.x + off) / 0.52;
  float jx = abs(fract(bx) - 0.5) * 0.52, jy = abs(fract(p.y / 0.29) - 0.5) * 0.29;
  jd = min(0.26 - jx, 0.145 - jy);
  float bump = 0.012 * fbm(p.xy * 9.0 + row, 4) + 0.006 * vnoise(p.xy * 40.0);
  return smoothstep(0.012, 0.0, jd) * 0.012 + bump;
}
float mapW(vec3 p, out int id) {
  float jd;
  float wall = sdBox(p - vec3(0.0, 2.0, WZ + 0.35), vec3(6.0, 2.0, 0.35)) + blocks(p, jd) * (p.z < WZ + 0.05 ? 1.0 : 0.0);
  // the doorway and the dark room behind it
  float door = sdBox(p - vec3(1.05, 1.05, WZ + 0.5), vec3(0.48, 1.05, 0.62));
  wall = max(wall, -door);
  float back = sdBox(p - vec3(1.05, 1.0, WZ + 1.7), vec3(1.2, 2.0, 0.1));
  wall = min(wall, back);
  wall = max(wall, -sdArchNiche(p));
  // a worn threshold stone before the door
  float step0 = sdBox(p - vec3(1.05, 0.03, WZ - 0.05), vec3(0.62, 0.04, 0.22)) - 0.01;
  float g = p.y - groundH(p.xz);
  id = 1; float d = g * 0.8;
  if (wall < d) { d = wall; id = 2; }
  if (step0 < d) { d = step0; id = 3; }
  // the clay lamp: a squat round body, a spout, a filling hole
  vec3 q = p - LAMPB;
  float body = sdEllipsoid(q, vec3(0.062, 0.03, 0.05));
  float spout = sdCapsule(p, LAMPB + vec3(0.02, 0.008, -0.01), WICK - vec3(0.0, 0.004, 0.0), 0.014);
  float lamp = smin(body, spout, 0.02);
  lamp = max(lamp, -(length(q - vec3(0.01, 0.03, 0.0)) - 0.016));
  if (lamp < d) { d = lamp; id = 4; }
  return d;
}
vec3 normW(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0006; int i;
  return normalize(e.xyy * mapW(p + e.xyy, i) + e.yyx * mapW(p + e.yyx, i) + e.yxy * mapW(p + e.yxy, i) + e.xxx * mapW(p + e.xxx, i));
}
float marchW(vec3 ro, vec3 rd, out int id) {
  float t = 0.03;
  for (int i = 0; i < 150; i++) {
    float d = mapW(ro + rd * t, id);
    if (abs(d) < 0.0004 * t) return t;
    t += d;
    if (t > 12.0) break;
  }
  id = 0; return -1.0;
}
float shadowW(vec3 p, vec3 L) {
  vec3 d = L - p; float md = length(d); d /= md;
  float s = 1.0, t = 0.01; int id;
  for (int i = 0; i < 28; i++) {
    float h = mapW(p + d * t, id);
    if (id == 4) h = max(h, 0.02);    // the lamp body doesn't shade its own flame's light much
    s = min(s, 10.0 * h / t);
    t += clamp(h, 0.01, 0.2);
    if (s < 0.01 || t > md - 0.03) break;
  }
  return sat(s);
}
float aoW(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0; int id;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i); o += w * (h - mapW(p + n * h, id)); w *= 0.6; }
  return sat(1.0 - 4.0 * o);
}

float lampFlick() { return 0.9 + 0.07 * vnoise(vec2(uTime * 6.0, 2.0)) + 0.03 * vnoise(vec2(uTime * 17.0, 4.0)); }
vec3 lampCol() { return vec3(1.0, 0.5, 0.2) * lampFlick() * uLampK; }

// a splash event per small cell of ground: when it happens (age 0..), and where
// returns (age, cx, cz); age < 0 means no splash in progress
vec3 splashCell(vec2 cell) {
  float rate = mix(1.0, 0.45, uEase);
  float per = 0.55 + 0.5 * hash12(cell * 1.7);
  float ph = hash12(cell * 3.3 + 1.0);
  float x = uTime / per + ph;
  float n = floor(x);
  float age = fract(x) * per;
  float live = step(hash12(cell + n * 1.37), 0.55 * rate);
  vec2 c = (cell + 0.2 + 0.6 * hash22(cell + n)) * 0.11;
  return vec3(live > 0.5 ? age : -1.0, c);
}
// ripple slope at a puddle point from the rings of nearby splashes
vec2 ripples(vec2 xz) {
  vec2 g = vec2(0);
  vec2 cb = floor(xz / 0.11);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 s = splashCell(cb + vec2(i, j));
    if (s.x < 0.0) continue;
    vec2 d = xz - s.yz; float r = length(d);
    float R = 0.18 * s.x + 0.004;
    float w = exp(-pow((r - R) / 0.006, 2.0)) * exp(-s.x * 4.0);
    g += d / max(r, 1e-4) * w * sin((r - R) * 900.0) * 0.6;
  }
  return g;
}

// the drops a splash throws up: little points of water, lit by the lamp
vec3 splashDrops(vec3 ro, vec3 rd, float depth) {
  if (rd.y > -0.02) return vec3(0);
  float tp = (0.012 - ro.y) / rd.y;
  if (tp <= 0.0 || tp > depth + 0.3) return vec3(0);
  vec3 hp = ro + rd * tp;
  vec2 cb = floor(hp.xz / 0.11);
  vec3 acc = vec3(0);
  vec3 L = flameC();
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 s = splashCell(cb + vec2(i, j));
    float a = s.x;
    if (a < 0.0 || a > 0.22) continue;
    for (int k = 0; k < 6; k++) {
      float fk = float(k);
      vec2 cell = cb + vec2(i, j);
      float ang = 6.2831 * (fk / 6.0 + hash12(cell + fk));
      float sp = 0.18 + 0.15 * hash12(cell * 2.0 + fk);
      float vy = 0.45 + 0.3 * hash12(cell * 5.0 + fk);
      vec3 dp = vec3(s.y + cos(ang) * sp * a, groundH(s.yz) + vy * a - 4.9 * a * a, s.z + sin(ang) * sp * a);
      if (dp.y < 0.0) continue;
      vec3 oc = dp - ro; float tc = dot(oc, rd);
      if (tc <= 0.0 || tc > depth) continue;
      float h2 = dot(oc, oc) - tc * tc;
      float pw = tc * 0.00072;
      float r = 0.0009 + pw;
      vec3 ld = L - dp; float l2 = dot(ld, ld);
      float ph = 0.35 + 3.0 * pow(sat(dot(rd, ld * inversesqrt(l2))), 12.0);
      acc += (lampCol() * (0.25 / (l2 + 0.05)) * ph + vec3(0.15, 0.18, 0.26)) * exp(-h2 / (r * r)) * (0.0009 / r) * (1.0 - a / 0.22);
    }
  }
  return acc;
}

// rain: thin layers of falling streaks between the lens and the wall
vec3 rainLayers(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0);
  vec3 L = flameC();
  float dens = mix(0.75, 0.3, uEase);
  for (int k = 0; k < 34; k++) {
    float zp = 0.32 + 0.068 * float(k) + 0.03 * hash11(float(k));
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.05 || t > depth) continue;
    vec3 p = ro + rd * t;
    float spd = 6.2 + 1.2 * hash11(float(k) * 7.0);
    vec2 cell = vec2(0.045, 0.42);
    vec2 q = vec2(p.x + 0.07 * p.y, p.y + uTime * spd + float(k) * 0.37);
    vec2 cc = floor(q / cell);
    float h = hash12(cc + float(k) * 17.0);
    if (h > dens) continue;
    vec2 o = (hash22(cc + float(k) * 3.0) - 0.5) * cell * vec2(0.8, 0.6);
    vec2 f = q - (cc + 0.5) * cell - o;
    float len = 0.03;
    float r = 0.0007 + 0.0005 * hash12(cc + 5.0);
    float pw = t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
    float rr = r + pw * 0.6;
    float d = length(vec2(f.x, max(abs(f.y) - len, 0.0)));
    float cov = exp(-d * d / (rr * rr)) * (r / rr);
    if (cov < 0.002) continue;
    vec3 dp = vec3(p.x, p.y, p.z);
    vec3 ld = L - dp; float l2 = dot(ld, ld);
    float ca = dot(rd, ld * inversesqrt(l2));
    float ph = 0.25 + 2.2 * pow(sat(ca), 10.0) + 1.5 * pow(sat(ca), 60.0);
    float spark = 1.0 + uSpark * (1.2 + 2.0 * pow(sat(ca), 6.0)) * (0.7 + 0.6 * hash12(cc + 9.0));
    vec3 lit = lampCol() * (0.12 / (l2 + 0.08)) * ph * spark;
    vec3 sky = vec3(0.03, 0.038, 0.06);
    acc += (lit + sky) * cov * smoothstep(0.0, 0.3, t);
  }
  return acc;
}

vec3 mourn(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; float t = marchW(ro, rd, id);
  vec3 col = vec3(0); float depth = 30.0;
  vec3 L = flameC(); vec3 LC = lampCol();
  if (t > 0.0) {
    vec3 p = ro + rd * t; vec3 n = normW(p); vec3 v = -rd;
    depth = t;
    vec3 alb; float rough; float wet = 1.0; float puddle = 0.0; float f0 = 0.04;
    if (id == 1) {
      vec3 cb = cobble(p.xz);
      alb = vec3(0.075, 0.072, 0.07) * (0.55 + 0.8 * cb.z) * (0.6 + 0.8 * fbm(p.xz * 30.0, 3));
      rough = 0.22 + 0.5 * fbm(p.xz * 12.0 + cb.z * 5.0, 3);
      // water standing in the gaps and hollows
      float lvl = 0.0015 + 0.004 * fbm(p.xz * 2.0, 2);
      puddle = smoothstep(lvl + 0.001, lvl - 0.002, cb.x);
      if (puddle > 0.0) {
        vec2 rp = ripples(p.xz);
        n = normalize(mix(n, normalize(vec3(-rp.x, 1.0, -rp.y)), puddle));
        rough = mix(rough, 0.03, puddle);
        alb *= 1.0 - 0.6 * puddle;
      }
    } else if (id == 2 || id == 3) {
      float jd; blocks(p, jd);
      alb = vec3(0.24, 0.215, 0.19) * (0.65 + 0.6 * fbm(p.xy * 4.0 + p.z, 4)) * (0.8 + 0.4 * vnoise(p.xy * 30.0));
      alb *= mix(0.55, 1.0, smoothstep(0.0, 0.015, jd));
      // the niche is sheltered and dry; the face of the wall runs with rain
      float inNiche = smoothstep(0.02, -0.01, sdArchNiche(p - vec3(0.0, 0.0, -0.005)));
      wet = (p.z > WZ + 0.04) ? 0.3 : 1.0 - inNiche;
      if (p.z > WZ + 0.6) wet = 0.0;
      rough = mix(0.8, 0.35, wet);
      alb *= mix(1.0, 0.55, wet);
      if (id == 3) { alb *= 1.2; rough = mix(0.6, 0.25, wet); }
    } else {
      // fired clay, soot round the spout
      alb = vec3(0.42, 0.22, 0.12) * (0.8 + 0.3 * fbm(p.xz * 80.0, 3));
      alb *= mix(1.0, 0.25, smoothstep(0.03, 0.0, length(p - WICK)));
      rough = 0.6; wet = 0.0;
    }
    // the lamp
    vec3 ld = L - p; float l2 = dot(ld, ld); vec3 l = ld * inversesqrt(l2);
    float sh = shadowW(p + n * 0.003, L);
    vec3 E = LC * (1.4 / (l2 + 0.15));
    float nl = sat(dot(n, l));
    col = alb / PI * E * nl * sh + E * ggx(n, l, v, rough) * fresnel(n, v, mix(0.04, 0.06, wet)) * 3.0 * sh * (0.4 + 0.6 * wet);
    // the lit niche throws a soft bounce out onto the wall face and the stones below it
    if (id != 4) {
      vec3 B = NICHE + vec3(0.0, 0.2, -0.03);
      vec3 bd = B - p; float b2 = dot(bd, bd); vec3 bl = bd * inversesqrt(b2);
      float face = sat(-bl.z * 1.0 + 0.15);
      col += alb / PI * LC * 0.3 / (b2 + 0.02) * sat(dot(n, bl)) * face * (p.z < WZ + 0.01 ? 1.0 : 0.0);
    }
    // the clay lamp glows a little through its thin walls and oil
    if (id == 4) col += vec3(1.0, 0.4, 0.1) * 0.05 * exp(-length(p - WICK) / 0.02) * lampFlick();
    // the night: a dim blue sky over everything, the open air only
    float ao = aoW(p, n);
    float open = (0.55 + 0.45 * sat(n.y)) * (p.z < WZ + 0.06 ? 1.0 : 0.25);
    col += alb * vec3(0.55, 0.68, 1.0) * ao * open;
    // wet reflections: the flame and its glowing niche, and the dull sky
    if (wet > 0.0 && id != 4) {
      vec3 rr = reflect(rd, n);
      float F = fresnel(n, v, 0.02) * mix(0.35, 1.0, puddle) * wet;
      float gloss = mix(1.0, 0.25, sat(rough * 2.0));
      vec3 refl = flameAt(p + n * 0.002, rr, WICK, 0.042, 1.0, 0.0, 3.0, 20.0, 0.0) * gloss;
      vec3 toL = normalize(L - p);
      // the long wet-street streak: rough stones smear the lamp's reflection up and down
      vec3 dv = rr - toL;
      float gk = mix(400.0, 8000.0, gloss * gloss);
      float lobe = exp(-(dv.x * dv.x + dv.z * dv.z * 0.3) * gk - dv.y * dv.y * gk * 0.012);
      refl += LC * (1.6 * lobe + 0.12 * pow(sat(dot(rr, toL)), 30.0)) * (3.0 / (1.0 + l2));
      refl += vec3(0.1, 0.13, 0.2) * sat(rr.y + 0.2) * (0.35 + 0.65 * fbm(rr.xy * 3.0 + p.xz * 0.5, 3)) * mix(1.0, 0.35, sat(rough * 1.5 - 0.3));
      col += refl * F * 2.0;
    }
    // inside the dark room behind the door: almost nothing
    if (p.z > WZ + 0.5) col *= 0.35;
  } else {
    col = vec3(0.01, 0.012, 0.02);
  }
  // the flame itself, its glow in the wet air, and the lens glow round it
  col += flameAt(ro, rd, WICK, 0.042, 1.0, 0.0, 3.0, depth, 0.0) * uLampK;
  col += LC * hazeGlow(ro, rd, L, depth) * 0.006;
  col += LC * vec3(1.0, 0.75, 0.55) * lensGlow(ro, rd, L, depth, 0.006, 0.05) * 1.2;
  // rain and splashes
  col += rainLayers(ro, rd, depth);
  col += splashDrops(ro, rd, depth);
  return col;
}
`;
