// s28's world: salt crust grown onto a dark basalt rock at the water's edge in the blue hour before
// dawn. The rock (units: about a centimetre) runs away from the lens to a lip; beyond it the still
// lake lies below in the cold first light, the dark line of the eastern hills across it and a pale
// band of dawn above them. The salt is a white crystalline encrustation that has grown where the
// water stood and dried: a crust along the old tide line, rims round the hollows and along the rock's
// edges, pooled crust in the hollows, with small clusters of clear cubic crystals standing out of it.
// The cold light along the horizon catches its facets in small sparks. Far off, two lamps still lit.
import { SALT_GLSL } from '/song/lib/x-salt.js';

export const SHORE_UNIFORMS = { uFocus: 20.0, uAper: 0.2, uDawn: 0.0 };

export const SHORE_GLSL = SALT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uDawn;
const vec3 EAST = normalize(vec3(0.25, 0.035, 1.0));     // where the dawn glows
const float LIP = 26.0;                                  // the rock's far edge (z)
const float WATER = -60.0;                               // the lake surface far below the lip

float rockBase(vec2 q) { return 1.6 * fbm(q * 0.07, 4); }
float rockH0(vec2 q) {
  float h = rockBase(q) + 0.35 * fbm(q * 0.35 + 3.0, 3);
  h += 0.08 * vnoise(q * 2.5);
  // falls away at the lip
  h -= 40.0 * smoothstep(LIP - 3.0, LIP + 6.0, q.y);
  return h;
}
// where the crust has grown (0..1): a band along the old tide line (a level of the rock), rims round
// the hollows' edges, and broken patches pooled in the hollows; none near the lip
float crustK(vec2 q) {
  if (q.y > LIP - 1.0) return 0.0;
  float base = rockBase(q);
  float d = 0.35 * fbm(q * 0.35 + 3.0, 3) + 0.08 * vnoise(q * 2.5);
  float h = base + d;
  float br = fbm(q * 0.5 + 11.0, 3);
  // the hollows (below the local mean) are pooled full of crust; their rims and a tide band above
  float rel = d - 0.35 * 0.5;
  float hollow = smoothstep(-0.1, -0.2, rel + 0.1 * (br - 0.5));
  float rim = exp(-pow((rel + 0.08 - 0.05 * br) / 0.025, 2.0));
  float tide = exp(-pow((h - 0.85 - 0.1 * (br - 0.5)) / 0.09, 2.0));
  // the old water line runs across the foreground: crust grown thick along it
  float line = exp(-pow((q.y - 7.5 - 2.0 * sin(q.x * 0.21) - 1.2 * (br - 0.5)) / 1.6, 2.0));
  float k = max(max(max(tide * 0.9, hollow), rim * 0.85), line);
  k *= smoothstep(0.42, 0.6, br + 0.2 * k + 0.25 * line);
  return sat(k) * smoothstep(LIP - 1.0, LIP - 6.0, q.y);
}
// the crust's own relief: a cobbled pavement of tiny crystal blocks over a thin layer
float crustRelief(vec2 q, out float edge) {
  vec2 w = q * 4.0 + 0.8 * vec2(vnoise(q * 2.0), vnoise(q * 2.0 + 7.0));
  vec2 v = voronoiEdge(w);
  vec2 v2 = voronoiEdge(w * 2.3 + 3.0);
  edge = min(v.x, v2.x * 0.6 + 0.04);
  float block = smoothstep(0.02, 0.14, v.x) * (0.3 + 0.7 * hash11(v.y * 17.0)) + 0.4 * smoothstep(0.02, 0.1, v2.x) * hash11(v2.y * 5.0);
  return 0.02 + 0.04 * block + 0.02 * vnoise(q * 10.0);
}
float rockH(vec2 q) {
  float k = crustK(q);
  float e;
  return rockH0(q) + (k > 0.01 ? k * crustRelief(q, e) * smoothstep(0.0, 0.3, k) * 2.0 : 0.0);
}
float saltBedH(vec2 q) { return rockH0(q) + 0.03; }   // grains sit on the crust's mean level
float saltKeep(vec3 c, float layer) {
  // small clusters of crystals standing out of the thickest crust (cheap test first)
  float cl = smoothstep(0.4, 0.55, vnoise(c.xz * 0.5 + 3.0));
  if (cl <= 0.0) return 0.0;
  float k = crustK(c.xz);
  return (layer > 0.5 ? 0.75 : 0.95) * smoothstep(0.35, 0.8, k) * cl;
}

// the blue-hour sky: deep indigo overhead, cold blue-grey lower, a pale rose-gold band along the east
vec3 skyShore(vec3 d) {
  float y = d.y;
  vec3 c = mix(vec3(0.035, 0.05, 0.1), vec3(0.008, 0.013, 0.035), pow(sat(y * 2.2), 0.5));
  float e = pow(sat(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(EAST.x, 0.0, EAST.z)))), 3.0);
  float band = exp(-max(y - 0.015, 0.0) / (0.07 + 0.03 * uDawn));
  c += (vec3(0.2, 0.26, 0.38) + vec3(0.22, 0.1, 0.04) * uDawn) * band * (0.3 + 0.7 * e) * (0.8 + 0.4 * uDawn);
  c += vec3(0.5, 0.36, 0.3) * exp(-max(y, 0.0) / 0.02) * e * e * (0.3 + 0.7 * uDawn);
  // a few last stars high up
  vec2 sp = d.xz / max(d.y, 0.05) * 60.0;
  float st = step(0.997, hash12(floor(sp))) * smoothstep(0.25, 0.6, y);
  c += vec3(0.6, 0.7, 1.0) * st * 0.5 * (1.0 - uDawn);
  return c;
}
// the far hills across the lake: a dark ridge below the band
float hillsAt(vec3 d) {
  float az = atan(d.x, d.z);
  return 0.006 + 0.012 * fbm(vec2(az * 5.0, 0.0), 4) + 0.004 * sin(az * 3.0 + 1.0);
}
vec3 farView(vec3 d) {
  float hy = hillsAt(d);
  if (d.y > hy) return skyShore(d);
  if (d.y > -0.004) {
    // the hills: near-black, a little lifted by the haze; two lamps still lit on the far shore
    vec3 c = skyShore(vec3(d.x, hy, d.z)) * 0.07 + vec3(0.003, 0.004, 0.008);
    for (int i = 0; i < 2; i++) {
      float az = atan(d.x, d.z) - (-0.12 + 0.31 * float(i));
      float el = d.y - (0.002 + 0.003 * float(i));
      c += vec3(1.0, 0.6, 0.3) * exp(-(az * az + el * el) / 0.0000025) * 2.0;
    }
    return c;
  }
  // the lake: the sky mirrored, darkened, broken by a faint slow swell
  float dist = (-WATER) / max(-d.y, 1e-3);
  vec2 wp = uCamPos.xz + d.xz * dist;
  float amp = 0.025 / (1.0 + dist * 0.0004);
  vec2 g = vec2(vnoise(wp * vec2(0.03, 0.12) + vec2(uTime * 0.08, 0.0)) - 0.5, vnoise(wp * vec2(0.05, 0.2) + 9.0 - vec2(0.0, uTime * 0.06)) - 0.5);
  vec3 n = normalize(vec3(g.x * amp, 1.0, g.y * amp * 2.0));
  vec3 r = reflect(d, n);
  float fr = 0.02 + 0.98 * pow(1.0 - sat(-d.y), 5.0);
  vec3 refl = r.y > hillsAt(r) ? skyShore(r) : skyShore(vec3(r.x, hillsAt(r), r.z)) * 0.18;
  return refl * fr * 0.9 + vec3(0.004, 0.007, 0.012);
}

vec3 saltKeyDir(vec3 p, out vec3 col) { col = vec3(0.35, 0.42, 0.6) * (1.0 + 0.6 * uDawn); return normalize(EAST + vec3(0.0, 0.25, 0.0)); }
vec3 saltLight(vec3 p, vec3 d) {
  // the bright band of the dawn sky is the light the crystals mirror
  float y = d.y;
  float e = pow(sat(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(EAST.x, 0.0, EAST.z)))), 6.0);
  float band = exp(-abs(y - 0.03) / 0.025) * e;
  return (vec3(0.8, 0.85, 1.0) + vec3(0.6, 0.3, 0.1) * uDawn) * band * 7.0;
}
vec3 saltEnv(vec3 p, vec3 d) {
  if (d.y > 0.0) return skyShore(d) * 2.4;
  // below: the dark rock
  return vec3(0.03, 0.035, 0.05) + skyShore(reflect(d, vec3(0, 1, 0))) * 0.2;
}

// the basalt: near-black, vesicular, damp, with a little lichen-grey and the sky's sheen
vec3 rockShade(vec3 p, vec3 rd, vec3 n) {
  float ves = smoothstep(0.55, 0.75, vnoise(p.xz * 3.0 + p.y));
  float g = fbm(p.xz * 0.8, 3);
  vec3 alb = mix(vec3(0.05, 0.05, 0.055), vec3(0.11, 0.11, 0.115), g) * (1.0 - 0.6 * ves);
  // basalt is rough: pitted bump on the bare stone
  n = normalize(n + (vec3(vnoise(p.xz * 14.0), 0.0, vnoise(p.xz * 14.0 + 4.0)) - 0.5) * 0.6 + (vec3(vnoise(p.xz * 45.0), 0.0, vnoise(p.xz * 45.0 + 9.0)) - 0.5) * 0.4);
  float k = crustK(p.xz);
  float edge; float rel = crustRelief(p.xz, edge);
  // salt: bright white crystal blocks, greyer in the cracks between them; thin crust lets the
  // stone show through grey
  float cov = smoothstep(0.08, 0.45, k);
  vec3 salt = vec3(0.86, 0.88, 0.9) * mix(0.45, 1.0, smoothstep(0.0, 0.1, edge)) * (0.85 + 0.25 * vnoise(p.xz * 9.0));
  alb = mix(alb, salt, cov);
  vec3 kc; vec3 kd = saltKeyDir(p, kc);
  vec3 amb = skyShore(normalize(n + vec3(0, 0.6, 0)));
  amb = mix(vec3(dot(amb, vec3(0.3, 0.5, 0.2))), amb, 0.55);
  vec3 col = alb * (amb * 6.0 * (0.5 + 0.5 * n.y) + kc * sat(dot(n, kd) * 0.8 + 0.2) * 1.6);
  // light scattered inside the crust glows a little in its shadowed sides
  col += salt * cov * amb * 0.8;
  // damp sheen on the bare stone: the sky band glancing off it
  vec3 r = reflect(rd, n);
  float fr = 0.03 + 0.97 * pow(1.0 - sat(dot(n, -rd)), 5.0);
  col += skyShore(r) * 0.08 * fr * (1.0 - 0.7 * ves) * (1.0 - cov);
  // the crust's facets: each tiny crystal face that mirrors the band of dawn flashes
  if (cov > 0.05) {
    vec2 gq = p.xz * 12.0; vec2 id = floor(gq);
    vec3 h = hash33(vec3(id, 5.0));
    vec3 fnrm = normalize(n + vec3(h.x - 0.5, 0.0, h.y - 0.5) * 1.6);
    float spot = smoothstep(0.35, 0.15, length(fract(gq) - 0.25 - 0.5 * h.yz));
    col += saltLight(p, reflect(rd, fnrm)) * 0.8 * spot * step(0.4, h.z) * cov;
  }
  return col;
}

vec3 shore(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, uFocus, uAper, ro, rd0);
  vec3 col; float depth = 1e4;
  // the rock surface
  float tb = -1.0;
  {
    float tt = 0.3;
    for (int i = 0; i < 70; i++) {
      vec3 q = ro + rd * tt;
      float h = q.y - rockH0(q.xz);
      if (h < 0.25) h = q.y - rockH(q.xz);
      if (h < 0.002 * tt) { tb = tt; break; }
      tt += max(h * 0.6, 0.01);
      if (tt > 90.0 || q.y < -30.0) break;
    }
  }
  vec3 cell;
  float t = saltMarch(ro, rd, 0.3, min(tb > 0.0 ? tb : 90.0, 30.0), cell);
  if (t > 0.0) {
    float oc;
    col = saltShade(ro + rd * t, rd, cell, oc);
    depth = t;
  } else if (tb > 0.0) {
    vec3 q = ro + rd * tb;
    vec2 e = vec2(0.012, 0.0);
    vec3 n = normalize(vec3(rockH(q.xz - e.xy) - rockH(q.xz + e.xy), 2.0 * e.x, rockH(q.xz - e.yx) - rockH(q.xz + e.yx)));
    col = rockShade(q, rd, n);
    depth = tb;
  } else {
    col = farView(rd0);
  }
  // cold mist hanging over the water beyond the lip
  float fog = 1.0 - exp(-max(depth - 25.0, 0.0) * 0.01);
  col = mix(col, vec3(0.03, 0.045, 0.075) * (1.0 + 0.5 * uDawn), fog * 0.6);
  // drifting mist: a soft moving veil low over the lake
  float m = fbm(vec2(atan(rd0.x, rd0.z) * 8.0 + uTime * 0.04, rd0.y * 40.0), 3);
  col += vec3(0.03, 0.04, 0.06) * smoothstep(0.45, 0.8, m) * exp(-abs(rd0.y - 0.005) / 0.02) * (depth > 100.0 ? 1.0 : 0.0);
  return col;
}
`;
