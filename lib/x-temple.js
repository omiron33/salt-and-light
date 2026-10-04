// The temple world's shared GLSL (s25-altar, s26-grievance, s27-go): the lens, the night and
// blue-hour sky, cheap cell noise for stones, a clay-lamp flame, and the two small clay oil lamps that
// stand for the two estranged brothers (no people are ever drawn, nor their shadows).
// Units are metres, y up. Every frame is a pure function of uTime.
export const TEMPLE_BASE = /* glsl */ `
uniform float uFocus, uAper;

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

// 3x3 cell noise: x = F2 - F1 (0 on the joints between cells), y = cell id
vec2 cells(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j), o = hash22(n + g), r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(n + g); } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}

// night sky: deep indigo, stars, a faint warm glow low where the city lamps are
vec3 nightSky(vec3 rd) {
  float h = rd.y;
  vec3 c = mix(vec3(0.028, 0.04, 0.09), vec3(0.01, 0.016, 0.045), sat(h * 1.3));
  c += vec3(0.02, 0.012, 0.006) * exp(-max(h, 0.0) * 9.0);
  vec2 sp = vec2(atan(rd.x, rd.z), asin(clamp(rd.y, -1.0, 1.0))) * 260.0;
  vec2 cell = floor(sp); vec2 f = fract(sp) - 0.5;
  float s = hash12(cell);
  float star = step(0.993, s) * smoothstep(0.32, 0.0, length(f + (hash22(cell) - 0.5) * 0.4));
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + 6.0 * hash12(cell + 3.0)) + s * 40.0);
  c += vec3(0.85, 0.9, 1.0) * star * tw * (0.15 + 0.8 * pow(hash12(cell + 1.0), 6.0)) * smoothstep(0.0, 0.2, h);
  return c;
}
// blue hour: the deep blue before dawn, the east just warming low on the horizon
vec3 blueSky(vec3 rd, vec3 east) {
  float h = rd.y;
  vec3 zen = vec3(0.020, 0.040, 0.105), hor = vec3(0.10, 0.13, 0.22);
  vec3 c = mix(hor, zen, pow(sat(h), 0.55));
  float e = sat(dot(normalize(rd.xz + 1e-5), normalize(east.xz)) * 0.5 + 0.5);
  c += vec3(0.36, 0.17, 0.09) * pow(e, 2.0) * exp(-max(h, 0.0) * 14.0) + vec3(0.10, 0.07, 0.08) * pow(e, 1.5) * exp(-max(h, 0.0) * 4.0);
  vec2 sp = vec2(atan(rd.x, rd.z), asin(clamp(rd.y, -1.0, 1.0))) * 220.0;
  vec2 cell = floor(sp); vec2 f = fract(sp) - 0.5;
  float star = step(0.996, hash12(cell)) * smoothstep(0.3, 0.0, length(f));
  c += vec3(0.8, 0.88, 1.0) * star * 0.12 * smoothstep(0.25, 0.6, h);
  return c;
}

// a small oil-lamp or wick flame standing at b, height h, flicker seed
vec3 wickFlame(vec3 ro, vec3 rd, vec3 b, float h, float seed, float depth) {
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = h * (0.9 + 0.2 * vnoise(vec2(uTime * 6.0 + seed, 1.0)));
  float y = q.y / hh;
  if (y < -0.4 || y > 1.5) return vec3(0);
  float sw = (vnoise(vec2(uTime * 1.9 + seed, 3.0)) - 0.5) * 0.6;
  vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.25 * y * y;
  float x = length(rr) / (hh * 0.24);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.5) * pow(1.0 - yy, 0.75) * 1.9 + 0.08;
  float body = smoothstep(1.0, 0.55, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.15, 0.85, y);
  float core = smoothstep(0.55, 0.15, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.75, 0.35, y);
  float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.25, 0.0, y) * smoothstep(-0.25, 0.0, y);
  return vec3(1.0, 0.55, 0.22) * body * 6.0 + vec3(1.0, 0.88, 0.66) * core * 20.0 + vec3(0.15, 0.3, 1.0) * root * 1.5;
}
// the soft glow a lens sees round a small light at c
vec3 glowAt(vec3 ro, vec3 rd, vec3 c, float depth, vec3 col, float r1, float r2) {
  vec3 oc = c - ro; float tc = dot(oc, rd);
  if (tc < 0.0 || tc > depth + 0.1) return vec3(0);
  float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
  return col * (0.5 * exp(-h / r1) + 0.05 * exp(-h / r2));
}

// ---- the two small clay oil lamps (s26, s27) ----
// A wheel-made clay lamp sitting at base b, its nozzle pointing along +x times dir (+1 or -1).
float lampSD(vec3 p, vec3 b, float dir) {
  vec3 l = p - b; l.x *= dir;
  float d = sdEllipsoid(l - vec3(0.0, 0.03, 0.0), vec3(0.068, 0.031, 0.062));            // round body
  d = smin(d, sdEllipsoid(l - vec3(0.07, 0.036, 0.0), vec3(0.044, 0.016, 0.022)), 0.022); // nozzle
  d = smin(d, sdEllipsoid(l - vec3(-0.07, 0.04, 0.0), vec3(0.018, 0.012, 0.008)), 0.012); // little handle
  d = max(d, -sdEllipsoid(l - vec3(-0.006, 0.066, 0.0), vec3(0.03, 0.011, 0.03)));       // filling hole
  d = max(d, -sdEllipsoid(l - vec3(0.098, 0.052, 0.0), vec3(0.011, 0.009, 0.009)));      // wick hole
  d = max(d, -l.y);                                                                      // flat foot
  return d;
}
vec3 lampWick(vec3 b, float dir) { return b + vec3(0.1 * dir, 0.05, 0.0); }
// the light a lamp casts: the point a little up in its flame
vec3 lampLight(vec3 b, float dir) { return b + vec3(0.1 * dir, 0.078, 0.0); }
vec3 lampClay(vec3 p) { return vec3(0.4, 0.2, 0.1) * (0.82 + 0.25 * fbm(p.xz * 60.0 + p.y * 40.0, 3)) * (0.9 + 0.2 * vnoise(p.xz * 300.0)); }
`;
