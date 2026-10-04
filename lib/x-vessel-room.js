// s01's world: a dark stone room. On a rough oak table stands an empty, worn wooden bowl; dust hangs
// in the air. High up there is a gap in the roof, and a narrow shaft of pale gold light comes down
// through it (uFront: how far down the shaft the light has reached, 0..1), lands in the empty bowl
// and slowly fills it (uFill 0..1) like gold poured in, until the bowl glows and its light warms the
// whole room. Motes turn in the beam. Metres; the table top is y = 0; the bowl stands at the origin.
import { VESSEL_GLSL } from '/song/lib/x-vessel.js';
import { LENS_GLSL } from '/song/lib/x-salt.js';

export const ROOM_UNIFORMS = { uFocus: 0.8, uAper: 0.004, uBeam: 1.0, uFront: 1.0, uFill: 0.0 };

export const ROOM_GLSL = LENS_GLSL + VESSEL_GLSL + /* glsl */ `
uniform float uFocus, uAper, uBeam, uFront, uFill;
const vec3 GAP = vec3(0.62, 2.7, 0.55);           // the gap in the roof
const vec3 BOWL = vec3(0.0, 0.0, 0.0);
const vec3 BEAM_END = vec3(0.04, 0.0, 0.03);
const float BEAM_R = 0.13;
const vec3 GOLD = vec3(1.0, 0.78, 0.45);
vec3 beamDir() { return normalize(BEAM_END - GAP); }

float mapR(vec3 p, out int id) {
  float d = bowlSD(p, BOWL); id = 1;
  float tb = p.y - tableH(p.xz);
  tb = max(tb, max(abs(p.x) - 0.9, abs(p.z - 0.05) - 0.5));   // the table's extent
  if (tb < d) { d = tb; id = 2; }
  float wall = 0.95 - p.z + stoneBump(p);
  if (wall < d) { d = wall; id = 3; }
  float wl = p.x + 1.3 + stoneBump(p);
  if (wl < d) { d = wl; id = 3; }
  float fl = p.y + 0.78;
  if (fl < d) { d = fl; id = 4; }
  return d;
}
vec3 normR(vec3 p) {
  int i; const vec2 e = vec2(1.0, -1.0) * 0.0003;
  return normalize(e.xyy * mapR(p + e.xyy, i) + e.yyx * mapR(p + e.yyx, i) + e.yxy * mapR(p + e.yxy, i) + e.xxx * mapR(p + e.xxx, i));
}
float marchR(vec3 ro, vec3 rd, out int id) {
  float t = 0.02;
  for (int i = 0; i < 140; i++) {
    float d = mapR(ro + rd * t, id);
    if (d < 0.0002 * t + 0.00005) return t;
    t += d * 0.9;
    if (t > 8.0) break;
  }
  id = -1; return -1.0;
}

// how much of the beam's light reaches p (inside the shaft, below the gap, above the front)
float beamAt(vec3 p) {
  vec3 bd = beamDir();
  vec3 q = p - GAP;
  float s = dot(q, bd);
  float L = length(BEAM_END - GAP);
  float r = length(q - bd * s);
  float rad = BEAM_R * (0.8 + 0.35 * s / L);
  float inside = smoothstep(rad, rad * 0.82, r);
  float front = smoothstep(uFront * (L + 0.1) + 0.02, uFront * (L + 0.1) - 0.06, s);
  return inside * front * step(0.0, s);
}
// soft shadow of the bowl toward the gap
float shadowBowl(vec3 p) {
  vec3 L = -beamDir();
  float res = 1.0, t = 0.004;
  for (int i = 0; i < 24; i++) {
    float h = bowlSD(p + L * t, BOWL);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.003, 0.03);
    if (res < 0.01 || t > 0.4) break;
  }
  return sat(res);
}
// the light that fills the bowl: its level and the light it gives the room
float fillLevel() { return mix(0.006, 0.066, smoothstep(0.0, 1.0, uFill)); }
vec3 glowPos() { return vec3(0.0, fillLevel() + 0.012, 0.0); }
vec3 glowCol() { return GOLD * (0.15 * uFill + 0.6 * uFill * uFill) * (0.95 + 0.05 * vnoise(vec2(uTime * 2.0, 4.0))); }

vec3 shadeR(vec3 p, vec3 rd, int id) {
  vec3 n = normR(p), v = -rd;
  vec3 alb; float rough;
  if (id == 1) alb = bowlAlb(p, BOWL, rough);
  else if (id == 2) alb = tableAlb(p, rough) * 1.3;
  else if (id == 3) { alb = stoneAlb(p, n, rough) * 1.2; }
  else { alb = vec3(0.08, 0.07, 0.06); rough = 0.9; }
  // the beam
  vec3 col = vec3(0);
  float b = beamAt(p);
  if (b > 0.001) col += brdf(n, v, -beamDir(), alb, rough, GOLD * 5.0 * uBeam * b * shadowBowl(p));
  // the gold in the bowl: a light that rises with the fill
  vec3 gp = glowPos(); vec3 Lg = gp - p; float dg = length(Lg); Lg /= dg;
  vec3 gl = glowCol() * 0.012 / (dg * dg + 0.004);
  // the bowl's own wall shades the room from the light inside it, except over the rim
  float rimVis = smoothstep(-0.02, 0.06, p.y - 0.05 + 0.25 * length(p.xz));
  if (id == 1) {
    bool outer = length(p - vec3(0.0, 0.118, 0.0)) > 0.122 - 0.0065;
    rimVis = outer ? smoothstep(0.062, 0.071, p.y) : 1.0;
  }
  col += brdf(n, v, Lg, alb, rough, gl * rimVis);
  // the beam's pool on the table and in the bowl bounces a little warm light round the room
  vec3 bp = vec3(0.0, 0.03, 0.0); vec3 Lb = bp - p; float db = length(Lb); Lb /= db;
  col += alb * GOLD * uBeam * smoothstep(0.9, 1.0, uFront) * 0.035 / (db * db + 0.04) * (0.35 + 0.65 * sat(dot(n, Lb)));
  // warm light everywhere from the lit table and walls, a little AO down at the table
  float ao = id == 1 ? mix(0.35, 1.0, smoothstep(0.0, 0.06, p.y)) : (id == 2 ? mix(0.4, 1.0, smoothstep(0.08, 0.16, length(p.xz))) : 1.0);
  col += alb * GOLD * uBeam * (0.06 + 0.94 * smoothstep(0.9, 1.0, uFront)) * 0.14 * ao * (0.6 + 0.4 * n.y) * (id == 3 ? 0.5 : 1.0);
  // a faint cold night through the room, and a little moonlight from a slit window on the right
  col += alb * vec3(0.16, 0.19, 0.3) * (0.4 + 0.6 * n.y) * (id == 3 ? 0.5 : 1.0);
  vec3 Lm = normalize(vec3(-0.8, 0.5, -0.3));
  float slit = smoothstep(0.35, 0.0, abs(p.y - 0.3 - 0.35 * (p.x + 0.4))) * smoothstep(-1.3, -0.2, p.x);
  col += brdf(n, v, Lm, alb, rough, vec3(0.3, 0.38, 0.6) * (id == 3 ? slit * 1.5 : 1.0));
  // inside the bowl, below the level, the wood itself is drowned in the light
  if (id == 1) {
    float inside = smoothstep(0.004, -0.004, length(p - vec3(0.0, 0.118, 0.0)) - 0.11);
    float under = smoothstep(fillLevel() + 0.004, fillLevel() - 0.004, p.y);
    col += vec3(1.0, 0.66, 0.3) * inside * under * uFill * (0.5 + 0.8 * uFill);
  }
  return col;
}

vec3 room(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, uFocus, uAper, ro, rd0);
  int id;
  float t = marchR(ro, rd, id);
  vec3 col = vec3(0.002);
  float depth = 8.0;
  if (t > 0.0) { vec3 p = ro + rd * t; col = shadeR(p, rd, id); depth = t; }
  // the surface of the light inside the bowl: a soft bright meniscus
  if (uFill > 0.001 && rd.y < 0.0) {
    float tl = (fillLevel() - ro.y) / rd.y;
    vec3 q = ro + rd * tl;
    float r = length(q.xz);
    float rin = bowlInnerR(fillLevel());
    if (tl > 0.0 && tl < depth + 0.002 && r < rin) {
      float edge = smoothstep(rin, rin - 0.012, r);
      // liquid light: slow swirling brightness, hotter where the shaft falls in, a few sparks
      vec2 sq = q.xz * 45.0;
      float sw = fbm(sq + vec2(fbm(sq * 0.7 + uTime * 0.25, 3), fbm(sq * 0.7 - uTime * 0.2 + 4.0, 3)) * 2.0, 4);
      float hot = exp(-dot(q.xz - vec2(0.03, 0.02), q.xz - vec2(0.03, 0.02)) / 0.0025);
      vec3 lc = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.8, 0.5), sw * 0.8 + hot * 0.5);
      float spark = step(0.996, hash12(floor(q.xz * 900.0))) * (0.5 + 0.5 * sin(uTime * 6.0 + hash12(floor(q.xz * 900.0)) * 40.0));
      vec3 lit = lc * (0.25 + 0.7 * sw * sw + 0.7 * hot) * (0.25 + 0.55 * uFill) + vec3(1.0, 0.9, 0.7) * spark * 2.0 * uFill;
      col = mix(col, lit, edge * smoothstep(0.0, 0.25, uFill));
      depth = tl;
    }
  }
  // the shaft: in-scattering in the dust, sampled through the beam
  {
    vec3 bd = beamDir();
    float acc = 0.0;
    float L = length(BEAM_END - GAP);
    // the stretch of the ray near the beam axis
    vec3 w0 = ro - GAP;
    float a = 1.0 - pow(dot(rd, bd), 2.0);
    float bb = dot(w0, rd) - dot(w0, bd) * dot(rd, bd);
    float tc = -bb / max(a, 1e-4);
    float half_ = 0.12 / sqrt(max(a, 0.02));
    float t0 = max(0.0, tc - half_), t1 = min(depth, tc + half_);
    if (t1 > t0) {
      float dt = (t1 - t0) / 28.0;
      float j = hash12(fc + fract(uTime * 7.31));
      for (int i = 0; i < 28; i++) {
        vec3 q = ro + rd * (t0 + (float(i) + j) * dt);
        float b = beamAt(q);
        if (b < 0.001) continue;
        float f = fbm(q * vec3(22.0, 7.0, 22.0) + vec3(0.0, -uTime * 0.06, uTime * 0.03), 4);
        float dens = 0.1 + 3.6 * pow(f, 3.0) + 0.4 * smoothstep(0.62, 0.8, vnoise(q * vec3(60.0, 14.0, 60.0) + vec3(0.0, uTime * 0.1, 0.0)));
        // brighter at the shaft's edges where the dust catches it side-on
        vec3 bq = q - GAP; float rr = length(bq - bd * dot(bq, bd));
        dens *= 0.7 + 0.6 * smoothstep(0.4, 1.0, rr / BEAM_R);
        acc += b * dens * dt;
      }
    }
    // forward scattering: brighter looking up the beam
    float phase = 0.4 + 1.2 * pow(sat(dot(rd, -bd)), 4.0);
    col += GOLD * acc * 6.0 * uBeam * phase;
  }
  // motes turning slowly in the light
  for (int i = 0; i < 36; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 1.7, 9.1));
    float s = fract(h.x + uTime * (0.004 + 0.006 * h.z));    // drift slowly down the shaft
    vec3 bd = beamDir();
    vec3 u = normalize(cross(bd, vec3(1, 0, 0))), w = cross(bd, u);
    float ang = h.y * 6.2831 + uTime * (0.1 + 0.15 * h.z);
    vec3 mp = GAP + bd * (0.15 + 2.45 * s) + (u * cos(ang) + w * sin(ang)) * BEAM_R * 0.9 * sqrt(h.z);
    float b = beamAt(mp);
    if (b < 0.01) continue;
    vec3 oc = mp - uCamPos; float tcam = dot(oc, rd0);
    if (tcam < 0.05 || tcam > depth) continue;
    float hh = length(oc - rd0 * tcam);
    float coc = 0.0012 + uAper * abs(tcam - uFocus) / max(tcam, 0.05);
    float k = smoothstep(coc, coc * 0.6, hh) * (0.0000025 / (coc * coc + 0.000001));
    col += GOLD * k * b * uBeam * (0.5 + 0.5 * sin(uTime * 1.3 + fi * 3.0));
  }
  // the warm haze round the filled bowl
  if (uFill > 0.0) col += glowCol() * pointGlow(ro, rd, glowPos(), depth) * 0.0006;
  return col;
}
`;
