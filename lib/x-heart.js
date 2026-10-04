// The heart (verse 3), s36: "the lamp of the body". A dark stone room at night; a small clay oil lamp
// (the pinched-nozzle kind of Herod's day) sits on an old wooden board against a rough ashlar wall.
// Its flame gutters: it ducks, tears and leans, and a thread of black soot smoke curls up out of it
// across the lit wall. On "heart" the light sinks to a dim, unsteady glow (uDim), and the smoke goes on
// rising into the dark. Units: metres; the board's top at y = 0, the lamp at the origin, nozzle to +x,
// the wall at z = WZ. Everything is a pure function of uTime.
//
// LENS_GLSL (a thin-lens camera ray from uFocus / uAper) is shared with the other heart worlds.

export const LENS_GLSL = /* glsl */ `
uniform float uFocus, uAper;
// a thin-lens ray: every sub-frame samples a point on the aperture and aims at the focus plane
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}
`;

export const HEART_UNIFORMS = {
  uFocus: 0.45, uAper: 0.004,
  uDim: 0.0,      // 0 the guttering flame .. 1 the dim, unsteady glow after "heart"
  uGut: 0.5,      // how hard the flame gutters (0 calm .. 1 tearing)
  uSoot: 0.5,     // how much black smoke it gives
};

export const HEART_GLSL = LENS_GLSL + /* glsl */ `
uniform float uDim, uGut, uSoot;
const float WZ = 0.24;                       // the wall
const vec3 NOZ = vec3(0.078, 0.036, 0.0);    // the wick's mouth

// ---------------- the flame's state ----------------
// a slow erratic gutter: dips, recoveries and sideways tears
float gutterN(float s) { return vnoise(vec2(uTime * s, 3.7)); }
float flameK() {
  float g = 0.75 + 0.25 * gutterN(5.0) - uGut * 0.45 * smoothstep(0.35, 0.9, gutterN(1.3)) - uGut * 0.2 * smoothstep(0.55, 0.95, gutterN(3.1));
  float dimK = mix(1.0, 0.36 + 0.12 * gutterN(4.0) + 0.06 * gutterN(11.0), uDim);
  return max(0.08, g) * dimK;
}
vec2 flameLean() {
  return vec2((gutterN(1.9) - 0.5) * 1.2 + 0.25, (vnoise(vec2(uTime * 1.6, 8.1)) - 0.5) * 0.7) * (0.5 + uGut);
}
vec3 flameBase() { return NOZ + vec3(0.003, 0.004, 0.0); }
float flameH() { return 0.034 * flameK(); }
// the light the flame gives (colour * strength), a little redder and fainter as it dims
vec3 flameLight() {
  float k = flameK();
  vec3 c = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.36, 0.1), uDim);
  return c * k * (0.9 + 0.1 * vnoise(vec2(uTime * 13.0, 1.0)));
}
vec3 lightPos() { vec2 l = flameLean(); return flameBase() + vec3(l.x * 0.007, 0.016 * max(flameK(), 0.75) + 0.008, l.y * 0.007); }

// ---------------- the world ----------------
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

// the lamp: a wheel-made round body, a filling hole with a sunken rim, a pinched nozzle
float lampSD(vec3 p) {
  vec3 q = p - vec3(0.0, 0.022, 0.0);
  float body = sdEllipsoid(q, vec3(0.05, 0.022, 0.05));
  body = smin(body, sdCylY(p - vec3(0.0, 0.004, 0.0), 0.026, 0.004) - 0.002, 0.008);     // foot
  // nozzle: a flattened cone running out to the wick
  vec3 a = vec3(0.02, 0.024, 0.0), b = NOZ - vec3(0.004, 0.004, 0.0);
  float noz = sdRoundCone(p * vec3(1.0, 1.25, 1.0), a * vec3(1.0, 1.25, 1.0), b * vec3(1.0, 1.25, 1.0), 0.018, 0.0105) / 1.25;
  body = smin(body, noz, 0.014);
  // a small loop handle at the back
  vec3 h = p - vec3(-0.052, 0.03, 0.0);
  float han = length(vec2(length(h.xy) - 0.011, h.z)) - 0.0042;
  han = max(han, -h.x - 0.002);
  body = smin(body, han, 0.004);
  // the filling hole, in a dished top
  body = smax(body, -sdSphere(p - vec3(0.0, 0.071, 0.0), 0.031), 0.003);
  float hole = sdCylY(p - vec3(0.0, 0.04, 0.0), 0.009, 0.02);
  body = smax(body, -hole, 0.002);
  // the wick hole at the nozzle's mouth
  float wh = sdCylY(p - (NOZ - vec3(0.003, 0.0, 0.0)), 0.0055, 0.01);
  body = smax(body, -wh, 0.0015);
  // the grain of the clay and the potter's wheel
  body += 0.00007 * vnoise(p * 380.0) + 0.00005 * sin(length(p.xz) * 900.0 + vnoise(p.xz * 60.0) * 3.0);
  return body;
}
// the charred wick: a little twist of flax standing out of the mouth, leaning forward
float wickSD(vec3 p) {
  vec3 a = NOZ - vec3(0.004, 0.006, 0.0), b = NOZ + vec3(0.003, 0.004, 0.0);
  return sdCapsule(p, a, b, 0.0022);
}
// the board: old planks, a little sunken at the joints
float boardSD(vec3 p) {
  float j = abs(fract((p.z + 0.4) * 5.5) - 0.5);
  float y = p.y + 0.0008 * smoothstep(0.47, 0.5, j) + 0.0005 * fbm(p.xz * vec2(6.0, 60.0), 2);
  return max(y, p.z - WZ + 0.002);
}
// the wall: rough ashlar, blocks proud of their mortar
float wallSD(vec3 p, out vec2 cell) {
  vec2 uv = vec2(p.x, p.y + 0.12);
  float row = floor(uv.y / 0.115);
  uv.x += row * 0.09 + 0.05 * hash11(row);
  vec2 c = vec2(floor(uv.x / 0.2), row);
  vec2 f = vec2(fract(uv.x / 0.2) * 0.2, fract(uv.y / 0.115) * 0.115);
  float e = min(min(f.x, 0.2 - f.x), min(f.y, 0.115 - f.y)) + 0.006 * (fbm(p.xy * 35.0, 3) - 0.5);
  cell = c;
  float face = 0.004 * fbm(p.xy * 18.0 + c * 7.0, 3) + 0.0015 * vnoise(p.xy * 90.0);
  float bulge = 0.006 * smoothstep(0.0, 0.03, e);
  return (WZ - p.z) - bulge + face;
}

float mapH(vec3 p, out int id) {
  float d = boardSD(p); id = 1;
  vec2 cell; float w = wallSD(p, cell);
  if (w < d) { d = w; id = 2; }
  float l = lampSD(p);
  if (l < d) { d = l; id = 3; }
  float k = wickSD(p);
  if (k < d) { d = k; id = 4; }
  return d;
}
float mapHd(vec3 p) { int i; return mapH(p, i); }
vec3 normH(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.00025;
  return normalize(e.xyy * mapHd(p + e.xyy) + e.yyx * mapHd(p + e.yyx) + e.yxy * mapHd(p + e.yxy) + e.xxx * mapHd(p + e.xxx));
}
float marchH(vec3 ro, vec3 rd, out int id) {
  float t = 0.01;
  for (int i = 0; i < 140; i++) {
    float d = mapH(ro + rd * t, id);
    if (abs(d) < 0.0001 * t + 0.00003) return t;
    t += d * 0.85;
    if (t > 3.0) break;
  }
  id = -1; return -1.0;
}
// soft shadow toward the flame (a flame is a small, wide source)
float shadowH(vec3 p, vec3 lp) {
  vec3 L = lp - p; float dl = length(L); L /= dl;
  float res = 1.0, t = 0.003;
  for (int i = 0; i < 28; i++) {
    float h = mapHd(p + L * t);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.002, 0.03);
    if (res < 0.01 || t > dl - 0.006) break;
  }
  return smoothstep(0.0, 1.0, res);
}
float aoH(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.006 * float(i); o += (h - mapHd(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - o * 22.0);
}

// ---------------- the smoke ----------------
// a thread of soot rising from the flame tip, wavering and curling, widening as it climbs
vec3 smokeAxis(float y) {
  float h = max(y - NOZ.y, 0.0);
  float s = uTime;
  // a laminar thread low down that starts to waver, then breaks into wide slow curls
  float wv = smoothstep(0.03, 0.12, h), cu = smoothstep(0.08, 0.3, h);
  return vec3(NOZ.x + 0.004 + 0.008 * sin(h * 30.0 - s * 4.0) * wv + 0.04 * sin(h * 9.0 - s * 1.3 + 1.0) * cu - 0.12 * h + 0.06 * (vnoise(vec2(h * 5.0 - s * 0.4, 1.0)) - 0.5) * cu,
              y,
              0.006 * sin(h * 24.0 - s * 3.3 + 2.0) * wv + 0.025 * sin(h * 7.0 - s * 1.1) * cu);
}
float smokeDen(vec3 p) {
  float h = p.y - NOZ.y - 0.022;
  if (h < 0.0) return 0.0;
  vec3 ax = smokeAxis(p.y);
  vec2 d = p.xz - ax.xz;
  float w = 0.0015 + 0.05 * h + 0.25 * h * h;
  float r2 = dot(d, d) / (w * w);
  if (r2 > 9.0) return 0.0;
  // a thin curtain of soot that folds over on itself (smoke is a sheet, not a cone): the sheet's
  // offset in z swings across the plume, and streaks run along it
  float u = d.x / w, hz = h * 26.0 - uTime * 2.4;
  float zf = w * (0.9 * sin(u * 2.6 + hz * 0.55 + 1.3 * vnoise(vec2(hz * 0.3, 2.0))) + 0.35 * sin(u * 5.3 - hz * 0.8));
  float th = w * (0.22 + 0.3 * smoothstep(0.05, 0.4, h));
  float sheet = exp(-pow((d.y - zf) / th, 2.0));
  float streak = 0.35 + 0.65 * smoothstep(0.3, 0.7, fbm(vec2(u * 2.2 + 0.4 * sin(hz * 0.3), hz * 0.35), 3));
  float lam = smoothstep(0.045, 0.012, h);
  float body = mix(sheet * streak * streak * 2.2, exp(-u * u * 3.0) * 1.4, lam) * exp(-u * u * 0.7);
  float puff = 0.5 + 0.5 * smoothstep(0.25, 0.75, vnoise(vec2(h * 7.0 - uTime * 1.3, 5.0)));
  return body * puff * uSoot * sqrt(0.002 / w) * smoothstep(0.0, 0.015, h) * smoothstep(0.55, 0.2, h);
}

// the guttering flame, drawn where the ray passes its axis
vec3 flameAtH(vec3 ro, vec3 rd, float depth) {
  vec3 b = flameBase();
  float k = flameK();
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = flameH();
  float y = q.y / hh;
  if (y < -0.5 || y > 1.8) return vec3(0);
  // lean and tear: the top is pushed sideways and wavers
  vec2 ln = flameLean();
  float sw = (vnoise(vec2(uTime * 9.0, 3.0)) - 0.5) * 0.6 * uGut;
  vec2 side = normalize(vec2(-rd.z, rd.x) + 1e-5);
  vec2 rr = q.xz - side * (ln.x + sw) * hh * 0.6 * y * y - vec2(0.0, ln.y) * hh * 0.1 * y;
  float x = length(rr) / (hh * 0.24);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.5) * pow(1.0 - yy, 0.7) * 1.9 + 0.08;
  // a torn, flickering upper edge
  float tear = 0.85 + 0.3 * vnoise(vec2(y * 6.0 - uTime * 14.0, 2.0)) * uGut;
  float body = smoothstep(1.0, 0.5, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.15 * tear, 0.8 * tear, y);
  float core = smoothstep(0.55, 0.12, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.7, 0.3, y);
  float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.25, 0.0, y) * smoothstep(-0.3, 0.0, y);
  // the sooty top: deep orange going to a smoky red where it tears
  float sooty = smoothstep(0.45, 1.0, y) * (0.4 + 0.6 * uGut);
  vec3 bodyC = mix(vec3(1.0, 0.5, 0.18), vec3(0.7, 0.16, 0.03), sooty);
  vec3 c = bodyC * body * 5.0 + vec3(1.0, 0.86, 0.62) * core * 18.0 * (1.0 - 0.6 * uDim) + vec3(0.15, 0.3, 1.0) * root * 1.6;
  return c * (0.45 + 0.55 * k / max(0.3, 1.0 - 0.6 * uDim));
}

// a faint cold spill from a high window off to the left: night, so the room is never crushed black
vec3 moonFill(vec3 n) { return vec3(0.022, 0.03, 0.05) * (0.35 + 0.65 * sat(dot(n, normalize(vec3(-0.7, 0.6, -0.4))))); }

vec3 heart(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  vec3 LP = lightPos();
  vec3 LC = flameLight();
  int id;
  float t = marchH(ro, rd, id);
  vec3 col = vec3(0.0); float depth = 4.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normH(p), v = -rd;
    depth = t;
    vec3 alb; float rough = 0.8, spec = 0.04;
    if (id == 1) {
      // old wood: dark walnut grain running along x, worn pale at the front edge, a ring of old oil
      float g = fbm(vec2(p.x * 4.0, p.z * 90.0 + 3.0 * fbm(p.xz * vec2(3.0, 9.0), 2)), 4);
      alb = mix(vec3(0.16, 0.09, 0.05), vec3(0.32, 0.2, 0.11), g);
      float stain = smoothstep(0.09, 0.06, length(p.xz - vec2(0.02, 0.0))) * 0.4;
      alb *= 1.0 - stain;
      float j = abs(fract((p.z + 0.4) * 5.5) - 0.5);
      alb *= mix(1.0, 0.35, smoothstep(0.47, 0.5, j));
      rough = 0.55 - 0.15 * stain;
    } else if (id == 2) {
      // limestone ashlar, warm grey, darker mortar, soot-streaked above the lamp
      vec2 cell; wallSD(p, cell);
      float h = hash12(cell);
      alb = vec3(0.36, 0.31, 0.26) * (0.7 + 0.4 * h) * (0.7 + 0.45 * fbm(p.xy * 12.0 + h * 9.0, 4));
      float rw = floor((p.y + 0.12) / 0.115);
      vec2 uv = vec2(p.x + rw * 0.09 + 0.05 * hash11(rw), p.y + 0.12);
      vec2 f = vec2(fract(uv.x / 0.2) * 0.2, fract(uv.y / 0.115) * 0.115);
      float e = min(min(f.x, 0.2 - f.x), min(f.y, 0.115 - f.y)) + 0.006 * (fbm(p.xy * 35.0, 3) - 0.5);
      alb *= mix(0.4, 1.0, smoothstep(0.0, 0.01, e));
      alb *= 0.75 + 0.5 * fbm(p.xy * 50.0 + 3.0, 3) * smoothstep(0.3, 0.6, fbm(p.xy * 9.0 + h * 5.0, 3));
      float soot = exp(-pow((p.x - 0.1 - 0.15 * (p.y - 0.1)) / (0.05 + 0.25 * max(p.y, 0.0)), 2.0)) * smoothstep(0.05, 0.3, p.y);
      alb *= 1.0 - 0.55 * soot;
      rough = 0.9;
    } else if (id == 3) {
      // fired clay: buff-orange, burnished, blackened round the nozzle
      float cl = fbm(p.xz * 70.0 + p.y * 40.0, 3);
      alb = vec3(0.42, 0.25, 0.15) * (0.7 + 0.45 * cl) * (0.85 + 0.15 * vnoise(p.xz * 400.0));
      alb *= 1.0 - 0.35 * smoothstep(0.55, 0.75, fbm(p.xz * 25.0 + 5.0, 3));
      float burn = exp(-length(p - NOZ) / 0.016);
      alb = mix(alb, vec3(0.05, 0.035, 0.03), sat(burn * 1.3));
      // oil glistening in the filling hole
      float oil = smoothstep(0.012, 0.007, length(p.xz)) * smoothstep(0.046, 0.03, p.y);
      alb = mix(alb, vec3(0.08, 0.05, 0.01), oil);
      rough = mix(0.5, 0.12, oil);
      spec = mix(0.05, 0.08, oil);
    } else {
      alb = vec3(0.04, 0.03, 0.025); rough = 0.9;
    }
    vec3 L = LP - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float nl = sat(dot(n, L));
    float sh = nl > 0.0 ? shadowH(p + n * 0.0015, LP) : 0.0;
    vec3 lc = LC * 0.05 / (0.0004 + d2);
    vec3 h = normalize(L + v); float nh = sat(dot(n, h));
    float a = max(0.04, rough * rough), a2 = a * a;
    float D = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
    float F = spec + (1.0 - spec) * pow(1.0 - sat(dot(h, v)), 5.0);
    float ao = aoH(p, n);
    col = (alb / PI * nl + D * F * nl * 0.25) * lc * sh;
    col += alb * moonFill(n) * ao;
    // light bounced off the warm board onto everything low
    col += alb * LC * 0.0009 / (0.002 + d2) * ao * (0.4 + 0.6 * sat(n.y + 0.3));
    // the wick: a live coal where it meets the flame
    if (id == 4) col += vec3(1.0, 0.25, 0.04) * 2.5 * flameK() * smoothstep(0.0, 0.006, p.y - NOZ.y + 0.004);
    // the room beyond falls away
    col *= exp(-max(t - 1.2, 0.0) * 1.5);
  }

  // the smoke: a ribbon of soot in a thin sheet through the flame, facing the lens. It leaves the
  // tip as a narrow laminar thread, breaks into curling filaments a hand's breadth up, and widens
  // into slow folds that drift off up the wall; it is lit warm from below by the flame.
  {
    // three layered sheets a little apart in depth give it body
    for (int k = 0; k < 3; k++) {
      float zk = -0.003 + 0.003 * float(k);
      float tz = (zk - ro.z) / rd.z;
      if (tz <= 0.0 || tz > depth) continue;
      vec3 p = ro + rd * tz;
      float h = p.y - NOZ.y - 0.006 - flameH() * 0.55;
      if (h < 0.0 || h > 0.42) continue;
      float s = uTime * 0.85 + float(k) * 1.7;
      // the centreline wavers more as it climbs, and leans with the room's draught
      float wv = smoothstep(0.015, 0.06, h), cu = smoothstep(0.03, 0.16, h);
      float xc = NOZ.x + 0.004 + 0.012 * sin(h * 45.0 - s * 5.0) * wv + 0.05 * sin(h * 13.0 - s * 1.8 + float(k)) * cu - 0.25 * h * h + 0.06 * (vnoise(vec2(h * 7.0 - s * 0.7, float(k))) - 0.5) * cu;
      // the plume is a bundle of thin strands: together in a laminar thread at the tip, then
      // wavering apart and folding over one another as they climb
      float spread = 0.002 + 0.05 * h + 0.25 * h * h;
      float dens = 0.0;
      for (int j = 0; j < 7; j++) {
        float fj = float(j) + float(k) * 7.0;
        float ph = hash11(fj * 3.7) * 6.2832;
        float off = spread * (0.9 * sin(h * (20.0 + 12.0 * hash11(fj)) - s * (2.0 + 1.5 * hash11(fj * 1.3)) + ph)
                    + 0.5 * sin(h * (47.0 + 20.0 * hash11(fj * 2.1)) - s * 3.7 + ph * 2.0)) * smoothstep(0.0, 0.08, h);
        float th = 0.0008 + 0.02 * h * (0.5 + hash11(fj * 5.1));
        float d = p.x - xc - off;
        // each strand thins and breaks up as it rises
        float life = smoothstep(0.42, 0.1 + 0.2 * hash11(fj * 8.3), h) * (0.55 + 0.45 * smoothstep(0.3, 0.7, vnoise(vec2(h * 18.0 - s * 2.2, fj))));
        dens += exp(-d * d / (th * th)) * life * (0.0035 / (th + 0.0008));
      }
      // a faint haze the strands leave behind
      float u = (p.x - xc) / max(spread, 1e-4);
      dens += 0.08 * exp(-u * u * 0.4) * smoothstep(0.03, 0.15, h) * smoothstep(0.45, 0.2, h);
      float puff = 0.6 + 0.4 * smoothstep(0.25, 0.8, vnoise(vec2(h * 6.0 - s * 1.4, 5.0 + float(k))));
      float a = sat(dens * puff * uSoot * 1.0);
      // soot: near black, warm where the flame lights it from below
      vec3 L = LP - p; float d2 = dot(L, L);
      vec3 lit = LC * 0.03 / (0.004 + d2) * 0.02 * (1.0 + 4.0 * exp(-h / 0.04)) + vec3(0.006, 0.0062, 0.007);
      // the core of a thick strand is darker (soot absorbs); its edges catch the flame
      col = mix(col, lit * vec3(0.75, 0.55, 0.42) * (1.2 - 0.6 * a), a * 0.9);
    }
  }

  // the flame and the glow it hangs in the room's dusty air
  col += flameAtH(ro, rd, depth);
  vec3 FC = flameBase() + vec3(0.0, 0.4 * flameH(), 0.0);
  vec3 oc = FC - ro; float tc = dot(oc, rd);
  float hg = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
  if (tc > 0.0 && tc < depth + 0.05) {
    col += LC * vec3(1.0, 0.75, 0.5) * (0.12 * exp(-hg / 0.008) + 0.05 * exp(-hg / 0.03) + 0.012 * exp(-hg / 0.12));
  }
  // dust in the air: a faint in-scatter from the flame along the ray
  float g = (atan((min(depth, 4.0) - tc) / max(hg, 1e-4)) + atan(tc / max(hg, 1e-4))) / max(hg, 1e-4);
  col += LC * vec3(1.0, 0.7, 0.45) * g * 0.00012;
  return col;
}
`;
