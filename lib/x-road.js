// The road world of the bridge ("the other way"): a Roman road in the cold grey-blue before dawn.
// The paved road runs away east across rolling dry hills toward a low band of coming dawn on the
// horizon; no sun yet, so the land is lit by the sky alone, cold above and faintly warm from the east.
// Shared by s42-cloak (a cloak on the stones by the road) and s43-mile (the milestone and the second
// mile); s41-cheek uses the lens and helpers only. Road along +z (east), centred on roadX(z), ground
// near y = 0. Everything is a pure function of uTime.

export const ROAD_UNIFORMS = { uFocus: 4.0, uAper: 0.0, uDawn: 0.0 };

export const ROAD_GLSL = /* glsl */ `
uniform float uFocus, uAper, uDawn;

void camBasis(out vec3 ww, out vec3 uu, out vec3 vv) {
  ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  uu = normalize(cross(ww, up)); vv = cross(uu, ww);
}
// thin lens: one aperture point per sub-frame, aimed at the same point on the focus plane
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww, uu, vv; camBasis(ww, uu, vv);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1 + uFrame * 0.013), hash12(uJitter * 613.0 + 7.7 + uFrame * 0.029));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}
float ggx(vec3 n, vec3 l, vec3 v, float rough) {
  vec3 h = normalize(l + v);
  float a = max(0.02, rough * rough), a2 = a * a;
  float nh = sat(dot(n, h)), nl = sat(dot(n, l));
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return nl * a2 / (PI * d * d) * 0.25;
}
float fresnel(vec3 n, vec3 v, float f0) { return f0 + (1.0 - f0) * pow(1.0 - sat(dot(n, v)), 5.0); }

// ---------------- the pre-dawn sky ----------------
// the coming sun, below the eastern horizon, a little right of the road
const vec3 DAWN_DIR = normalize(vec3(0.16, -0.035, 1.0));
// the bright eastern sky, as a soft light just above the horizon (what lights the land before dawn)
const vec3 GLOW_DIR = normalize(vec3(0.14, 0.09, 1.0));

vec3 skyCol(vec3 rd) {
  float y = rd.y;
  float yy = max(y, 0.0);
  vec2 az = normalize(rd.xz + 1e-5), daz = normalize(DAWN_DIR.xz);
  float ca = dot(az, daz);                       // 1 toward the coming sun
  float east = pow(0.5 + 0.5 * ca, 3.0);
  // cold grey-blue dome, a little deeper overhead
  vec3 zen = vec3(0.020, 0.032, 0.070);
  vec3 hor = vec3(0.075, 0.090, 0.130);
  vec3 c = mix(hor, zen, pow(yy, 0.5));
  // the band of the coming dawn: a pale gold-rose line low in the east, fading up into cool green-grey
  float band = exp(-yy * mix(26.0, 9.0, east)) * east;
  vec3 bandC = mix(vec3(0.95, 0.55, 0.32), vec3(1.0, 0.78, 0.55), exp(-yy * 40.0));
  c += bandC * band * (0.55 + 0.35 * uDawn);
  c += vec3(0.25, 0.32, 0.36) * exp(-yy * 5.0) * east * 0.18;
  // the brightest point, where the sun will rise
  float s = max(dot(rd, DAWN_DIR), 0.0);
  c += vec3(1.0, 0.62, 0.34) * pow(s, 60.0) * (1.2 + 0.8 * uDawn) * exp(-yy * 12.0);
  // high thin cloud streaks, their undersides catching the dawn
  if (y > 0.0) {
    vec2 cp = rd.xz / (y + 0.06) * 1.6 + vec2(uTime * 0.012, 0.0);
    float cl = fbm(cp * vec2(0.5, 2.2), 5);
    cl = smoothstep(0.5, 0.78, cl) * smoothstep(0.0, 0.12, y) * smoothstep(0.85, 0.2, y);
    vec3 under = mix(vec3(0.05, 0.06, 0.09), vec3(0.75, 0.42, 0.3), east * exp(-yy * 3.0));
    c = mix(c, under, cl * 0.75);
  }
  // a few last stars, high in the west
  vec3 p = rd * 300.0; vec3 i = floor(p), f = fract(p) - 0.5;
  vec3 h = hash33(i);
  if (h.x < 0.05) c += vec3(0.8, 0.85, 1.0) * pow(h.y, 4.0) * 0.6 * exp(-dot(f, f) * 90.0) * smoothstep(0.15, 0.5, y) * (1.0 - east);
  return c;
}
// the light the sky throws on a surface with normal n (hemisphere, with the warm east)
vec3 skyLight(vec3 n) {
  vec3 c = mix(vec3(0.04, 0.042, 0.048), vec3(0.13, 0.16, 0.23), 0.5 + 0.5 * n.y);
  c += vec3(0.02, 0.025, 0.04) * (1.0 - abs(n.y)) * sat(-n.z * 0.6 + 0.4);   // the paler western sky on upright faces
  c += vec3(0.30, 0.20, 0.13) * pow(sat(dot(n, GLOW_DIR) * 0.7 + 0.3), 2.0) * (0.45 + 0.25 * uDawn);
  return c;
}
// haze along a ray of length d: the cold air, warm toward the dawn
vec3 hazeCol(vec3 rd) {
  float s = max(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(DAWN_DIR.x, 0.0, DAWN_DIR.z))), 0.0);
  return mix(vec3(0.060, 0.075, 0.105), vec3(0.42, 0.28, 0.20), pow(s, 8.0) * (0.6 + 0.3 * uDawn));
}
vec3 applyHaze(vec3 col, vec3 rd, float d, float dens) {
  float f = 1.0 - exp(-d * dens);
  return mix(col, hazeCol(rd), f);
}

// ---------------- the land and the road ----------------
float roadX(float z) { return 9.0 * (1.0 - cos(z * 0.005)); }
const float RW = 2.3;                 // half width of the paving

float undul(vec2 xz, int oct) { return 0.7 * (fbm(xz * 0.045 + 3.7, oct) - 0.5); }
float farRidge(vec2 xz, float ax) {
  if (xz.y < 200.0 || xz.y > 2600.0) return 0.0;
  float far = smoothstep(200.0, 1100.0, xz.y) * smoothstep(2600.0, 1700.0, xz.y);
  float saddle = mix(0.45, 1.0, smoothstep(40.0, 380.0, ax));
  return far * saddle * (18.0 + 60.0 * fbm(xz * vec2(0.003, 0.0018) + 8.0, 3));
}
// the land's height. oct: detail octaves (fewer for marching far away)
float terrH(vec2 xz, int oct) {
  float rx = xz.x - roadX(xz.y), ax = abs(rx);
  float h = undul(xz, oct);
  if (ax > 5.0) h += smoothstep(5.0, 70.0, ax) * min(ax, 700.0) * 0.09 * (0.4 + 1.1 * fbm(xz * 0.004 + 1.3, 3)) * smoothstep(2600.0, 1700.0, xz.y);
  h += farRidge(xz, ax);
#ifdef MILE
  // the near fields roll and rise into rough hillsides with shoulders of rock
  if (ax > 7.0) {
    float k = smoothstep(7.0, 45.0, ax);
    h += k * (7.0 * (fbm(xz * vec2(0.025, 0.012) + 2.0, oct) - 0.4) + 3.5 * (1.0 - abs(2.0 * vnoise(xz * 0.04 + 7.0) - 1.0)));
    if (oct > 3) h += k * 0.35 * (fbm(xz * 0.4, 2) - 0.5);
  }
#endif
  if (ax > RW + 1.6) return h;
  // the road's bed: levelled across, with a crown and kerb stones
  vec2 rc = vec2(roadX(xz.y), xz.y);
  float hr = undul(rc, oct) + farRidge(rc, 0.0);
  float bed = hr + 0.05 * (1.0 - (ax * ax) / (RW * RW));
  float kerb = 0.06 * smoothstep(RW - 0.05, RW + 0.02, ax) * smoothstep(RW + 0.4, RW + 0.32, ax);
  float m = smoothstep(RW + 1.6, RW + 0.6, ax);
  return mix(h, max(bed, hr) + kerb, m);
}
float marchTerr(vec3 ro, vec3 rd, float tmax) {
  float t = 0.05, tp = 0.05;
  for (int i = 0; i < 320; i++) {
    vec3 p = ro + rd * t;
    if (p.y > 110.0 && rd.y > 0.0) return -1.0;
    int oct = t < 30.0 ? 4 : (t < 300.0 ? 3 : 2);
    float h = p.y - terrH(p.xz, oct);
    if (h < 0.0012 * t) {
      // refine between the last point above and this one
      float a = tp, b = t;
      for (int k = 0; k < 5; k++) { float m = 0.5 * (a + b); vec3 q = ro + rd * m; if (q.y - terrH(q.xz, oct) < 0.0012 * m) b = m; else a = m; }
      return b;
    }
    tp = t;
    t += max(h * 0.5, 0.012 * t + 0.01);
    if (t > tmax) return rd.y < 0.0 ? tmax : -1.0;   // the land beyond, lost in the haze
  }
  vec3 p = ro + rd * t;
  return (p.y - terrH(p.xz, 2)) < 0.004 * t ? t : -1.0;
}

// a cheap cellular pattern: x = F2 - F1 (0 on the joints), y = cell id
vec2 cells(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j), o = 0.15 + 0.7 * hash22(n + g), r = g + o - f; float d = length(r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(n + g); } else if (d < d2) d2 = d;
  }
  return vec2(d2 - d1, id);
}
vec2 paving(vec2 xz) { return cells(xz * 2.1); }

// sandal prints in the dust of the left verge, walking east, on past the milestones
const float FPX = -2.95;
float footprint(vec2 xz) {
  float lx = xz.x - roadX(xz.y) - FPX;
  float z = xz.y;
  if (abs(lx) > 0.4 || z < -30.0 || z > 400.0) return 0.0;
  float i = floor(z / 0.37 + 0.5);
  float d = 0.0;
  for (int k = -1; k <= 1; k++) {
    float j = i + float(k);
    float side = mod(j, 2.0) < 0.5 ? -1.0 : 1.0;
    vec2 c = vec2(side * 0.1 + (hash11(j * 3.1) - 0.5) * 0.04, j * 0.37 + (hash11(j * 7.7) - 0.5) * 0.05);
    vec2 q = vec2(lx, z) - c;
    q = rot((hash11(j) - 0.5) * 0.2 + side * 0.06) * q;
    // a sandal sole: round heel, a narrower waist, a broad rounded toe; strap marks across it
    float w = 0.04 + 0.012 * smoothstep(-0.02, 0.07, q.y) - 0.008 * exp(-(q.y + 0.02) * (q.y + 0.02) * 900.0);
    float e = length(vec2(q.x / w, q.y / 0.13));
    float dep = mix(1.0, 0.55, smoothstep(-0.11, -0.02, q.y)) + 0.45 * smoothstep(0.03, 0.1, q.y);   // heel and ball press deeper
    dep *= 1.0 - 0.3 * smoothstep(0.006, 0.0, abs(q.y - 0.04)) - 0.3 * smoothstep(0.006, 0.0, abs(q.y + 0.07));
    float kk = smoothstep(1.0, 0.86, e) * dep - 0.4 * smoothstep(1.3, 1.05, e) * smoothstep(0.92, 1.05, e);   // a rim of pushed dust
    d = abs(kk) > abs(d) ? kk * (0.7 + 0.3 * hash11(j * 2.3)) : d;
  }
  return d;
}
// fine height for shading (stone faces, joints, dust, pebbles, prints) on top of terrH
float detailH(vec2 xz, float t) {
  float fade = smoothstep(45.0, 6.0, t);
  if (fade <= 0.0) return 0.0;
  float rx = xz.x - roadX(xz.y), ax = abs(rx);
  float h = 0.0;
  if (ax < RW) {
    vec2 v = paving(xz);
    // each stone a worn dome, the joints filled with dust
    h += 0.022 * sqrt(smoothstep(0.0, 0.4, v.x)) + 0.004 * (fbm(xz * 11.0, 2) - 0.5) - 0.008 * v.y;
  } else if (ax < RW + 0.4) {
    h += -0.012 * smoothstep(0.03, 0.0, abs(fract(xz.y * 1.3 + hash11(floor(xz.y * 1.3)) * 0.2) - 0.5) - 0.46) + 0.004 * (fbm(xz * 12.0, 2) - 0.5);
  } else {
    h += 0.008 * (fbm(xz * 14.0, 2) - 0.5);
    float g = smoothstep(RW + 1.0, RW + 2.0, ax);
    h += g * 0.03 * (vnoise(xz * 45.0) - 0.5) + g * 0.04 * smoothstep(0.5, 0.75, vnoise(xz * 9.0));
    h -= 0.02 * footprint(xz);
  }
  return h * fade;
}
vec3 terrNormal(vec3 p, float t) {
  float e = 0.004 + 0.0015 * t;
  vec2 xz = p.xz;
  int oct = t < 30.0 ? 5 : 3;
  float h0 = terrH(xz, oct) + detailH(xz, t);
  float hx = terrH(xz + vec2(e, 0.0), oct) + detailH(xz + vec2(e, 0.0), t);
  float hz = terrH(xz + vec2(0.0, e), oct) + detailH(xz + vec2(0.0, e), t);
  return normalize(vec3(h0 - hx, e, h0 - hz));
}

// shading of the land at p (vis: how much of the eastern glow reaches it)
vec3 shadeLand(vec3 p, vec3 rd, float t, float vis) {
  vec3 n = terrNormal(p, t), v = -rd;
  float rx = p.x - roadX(p.z), ax = abs(rx);
  vec3 alb; float rough = 0.9, spec = 0.04, ao = 1.0;
  if (ax < RW) {
    vec2 v2 = paving(p.xz);
    float g = v2.y;
    alb = vec3(0.10, 0.10, 0.105) * (0.6 + 0.8 * g) * (0.75 + 0.5 * fbm(p.xz * 6.0, 3));
    alb *= 1.0 - 0.35 * smoothstep(0.55, 0.75, fbm(p.xz * 14.0 + g * 7.0, 3));   // vesicles and pitting in the basalt
    float joint = smoothstep(0.09, 0.0, v2.x) * smoothstep(40.0, 5.0, t);
    alb = mix(alb, vec3(0.17, 0.14, 0.11), joint * 0.85);         // dust and grit in the joints
    rough = mix(0.62, 0.95, joint) + 0.2 * fbm(p.xz * 3.0, 2);    // worn smooth by feet and wheels
    ao = 1.0 - 0.5 * joint;
    spec = 0.05;
  } else if (ax < RW + 0.4) {
    alb = vec3(0.12, 0.115, 0.105) * (0.8 + 0.4 * fbm(p.xz * 4.0, 2)); rough = 0.7;
  } else {
    float dust = smoothstep(RW + 1.4, RW + 0.6, ax);
    float clump = fbm(p.xz * 0.6, 3);
    vec3 grass = mix(vec3(0.24, 0.20, 0.12), vec3(0.11, 0.12, 0.08), clump);
    float tuft = vnoise(p.xz * 45.0);
    grass *= 0.8 + 0.35 * tuft * (0.7 + 0.6 * fbm(p.xz * 7.0, 2));
    vec3 dirt = vec3(0.30, 0.26, 0.21) * (0.85 + 0.3 * fbm(p.xz * 5.0, 3));
    alb = mix(grass, dirt, dust);
    // a scatter of pale stones in the grass
    float peb = smoothstep(0.66, 0.8, vnoise(p.xz * 9.0)) * smoothstep(RW + 1.0, RW + 2.0, ax);
    alb = mix(alb, vec3(0.22, 0.20, 0.17), peb * 0.6);
    float fp = footprint(p.xz);
    alb *= 1.0 - 0.12 * max(fp, 0.0);
    ao = mix(0.75 + 0.35 * tuft, 1.0, dust) * (1.0 - 0.45 * max(fp, 0.0));
  }
  vec3 col = alb * skyLight(n) * ao;
  col += alb * vec3(0.55, 0.36, 0.24) * sat(dot(n, GLOW_DIR)) * (0.3 + 0.15 * uDawn) * vis * ao;
  // a low raking light across the dust from the east, so prints and stones stand out
  col += alb * vec3(0.5, 0.33, 0.22) * sat(dot(n, normalize(vec3(0.3, 0.12, 1.0))) * 3.0 - 0.3) * (ax > RW + 0.4 ? 0.12 : 0.25) * smoothstep(15.0, 2.0, t);
  float sp = ggx(n, normalize(DAWN_DIR + vec3(0.0, 0.06, 0.0)), v, rough);
  col += vec3(1.0, 0.62, 0.38) * sp * fresnel(n, v, spec) * 1.1 * (0.6 + 0.4 * uDawn) * vis * ao * (ax < RW + 0.4 ? 1.0 : 0.15);
  col += vec3(0.07, 0.09, 0.13) * fresnel(n, v, spec) * (1.0 - rough) * 0.4 * (ax < RW + 0.4 ? 1.0 : 0.0);
#ifdef MILE
  if (ax > RW + 1.0) {
    // dry grass: straw-pale blades combed by the wind, darker earth between, scrub on the hills
    float near = smoothstep(25.0, 2.0, t);
    vec2 g = p.xz * vec2(70.0, 18.0) + vec2(sin(p.z * 3.0 + uTime * 1.5) * 0.3, 0.0);
    float blade = vnoise(g) * vnoise(g * 1.9 + 3.0);
    col *= mix(1.0, 0.55 + 1.2 * blade, near * smoothstep(RW + 1.2, RW + 2.0, ax));
    col += vec3(0.28, 0.2, 0.11) * smoothstep(0.35, 0.6, blade) * near * 0.012 * sat(dot(n, GLOW_DIR) + 0.5);
    vec2 bc = p.xz / 2.2; vec2 bi = floor(bc); vec2 bf = fract(bc) - 0.5 - (hash22(bi) - 0.5) * 0.6;
    float bush = smoothstep(0.32, 0.12, length(bf) + 0.1 * (vnoise(p.xz * 3.0) - 0.5)) * step(0.62, hash12(bi + 5.0)) * smoothstep(9.0, 16.0, ax);
    col *= 1.25;   // the hillsides catch more of the open sky
    col = mix(col, vec3(0.012, 0.016, 0.012), bush * 0.85);
    float rock = smoothstep(0.66, 0.78, fbm(p.xz * 0.08 + 3.0, 3)) * smoothstep(10.0, 25.0, ax);
    col = mix(col, vec3(0.3, 0.29, 0.27) * skyLight(n) * 1.6 * (0.6 + 0.6 * vnoise(p.xz * 2.0)), rock * 0.8);
  }
#endif
  // dry grass glows a little where it is backlit, and stirs
  if (ax > RW + 1.0) col += vec3(0.30, 0.18, 0.09) * pow(sat(dot(rd, GLOW_DIR) + 0.1), 4.0) * 0.025 * vnoise(p.xz * 30.0 + uTime * vec2(1.6, 0.4)) * smoothstep(60.0, 5.0, t);
  return col;
}
`;
