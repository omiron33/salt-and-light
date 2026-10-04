// The clay oil lamp of the house scenes and its living flame (shared by s15, s16, s17, s32, s34, s44).
// A wheel-made Herodian lamp: a round body with a sunken filling hole and a short spatulate nozzle,
// a twisted flax wick standing out of the nozzle. The flame is a small volume, ray-marched: a blue
// root, a dark zone round the wick, a white-gold core, an orange envelope and a soft red tip, licked
// upward by rising turbulence, swaying in the draught, its height breathing and now and then leaping.
// The light the lamp gives breathes with the same flame, so the room flickers with it.
// Local frame: base centre at the origin, nozzle along +x, up +y (metres). Pure function of uTime.
export const LAMP_GLSL = /* glsl */ `
const vec3 LAMP_WICK = vec3(0.071, 0.040, 0.0);   // flame root (top of the wick), lamp-local
const float FLAME_H0 = 0.034;                      // flame height at rest

// lamp-local frame: rotation by yaw about y (nozzle direction (cos yaw, 0, sin yaw))
vec3 toLampLocal(vec3 p, vec3 base, float yaw) {
  vec3 q = p - base; float c = cos(yaw), s = sin(yaw);
  return vec3(c * q.x + s * q.z, q.y, -s * q.x + c * q.z);
}
vec3 fromLampLocal(vec3 q, vec3 base, float yaw) {
  float c = cos(yaw), s = sin(yaw);
  return base + vec3(c * q.x - s * q.z, q.y, s * q.x + c * q.z);
}

// the clay body; id 1 = clay, 2 = wick
float sdLampLocal(vec3 q, out int part) {
  part = 1;
  // round body, flat foot
  float body = sdEllipsoid(q - vec3(0.0, 0.021, 0.0), vec3(0.043, 0.021, 0.043));
  body = max(body, -q.y + 0.002);
  // a low foot ring
  float foot = max(length(q.xz) - 0.024, abs(q.y - 0.002) - 0.003);
  body = min(body, foot);
  // nozzle: tapering, its tip squared off a little
  float noz = sdRoundCone(q, vec3(0.022, 0.022, 0.0), vec3(0.068, 0.027, 0.0), 0.0135, 0.0105);
  noz = max(noz, q.x - 0.078);
  float d = smin(body, noz, 0.014);
  // the sunken discus and filling hole on top
  d = smax(d, -sdEllipsoid(q - vec3(0.0, 0.047, 0.0), vec3(0.031, 0.011, 0.031)), 0.004);
  d = max(d, -(length(q.xz - vec2(-0.004, 0.0)) - 0.0085));
  // the wick hole in the nozzle
  d = max(d, -(length(q.xz - vec2(0.068, 0.0)) - 0.0042));
  // the wick: a twisted strand rising out of the hole and bending over
  vec3 w = q - vec3(0.068, 0.028, 0.0);
  float wk = sdCapsule(w, vec3(0.0), vec3(0.0035, 0.012, 0.0), 0.0019 + 0.0003 * sin(w.y * 900.0));
  if (wk < d) { part = 2; return wk; }
  return d;
}

// flame breathing: a slow height wander, a quick shiver and an occasional leap
float flameBreath(float seed) {
  float t = uTime;
  float n = vnoise(vec2(t * 2.6 + seed, seed * 1.7)) - 0.5;
  float m = vnoise(vec2(t * 9.5 + seed * 3.0, 2.0 + seed)) - 0.5;
  float lick = smoothstep(0.66, 0.92, vnoise(vec2(t * 1.1 + seed * 5.0, 7.0)));
  return 1.0 + 0.2 * n + 0.08 * m + 0.32 * lick;
}
// sideways sway of the tip (draught), in flame-heights
vec2 flameSway(float seed) {
  float t = uTime;
  return vec2(vnoise(vec2(t * 1.2 + seed, 4.0)) - 0.5 + 0.45 * (vnoise(vec2(t * 4.7 + seed, 9.0)) - 0.5),
              vnoise(vec2(t * 1.0 + seed, 12.0)) - 0.5 + 0.45 * (vnoise(vec2(t * 5.3 + seed, 5.0)) - 0.5));
}

// emission density at q (relative to the flame root), for a flame of height H
vec3 flameEmit(vec3 q, float H, vec2 sway, float seed) {
  float y = q.y / H;
  if (y < -0.15 || y > 1.5) return vec3(0);
  vec2 xz = q.xz - sway * H * 0.6 * y * y;
  // turbulence rising through the flame (stronger toward the tip)
  vec3 nq = vec3(q.x / H * 3.2, q.y / H * 2.0 - uTime * 3.4, q.z / H * 3.2) + seed;
  float tur = (vnoise(nq) - 0.5) + 0.5 * (vnoise(nq * 2.17 + 5.0) - 0.5);
  float yy = clamp(y, 0.0, 1.0);
  float W = H * 0.21;
  float prof = pow(yy + 0.02, 0.58) * pow(max(1.0 - yy, 0.0), 0.95) * 1.95 + 0.02;
  float r = length(xz) / (W * prof);
  r += tur * 0.55 * smoothstep(0.05, 1.0, y);
  float yt = y + tur * 0.25 * smoothstep(0.4, 1.0, y);
  float env = smoothstep(1.0, 0.5, r) * smoothstep(-0.14, 0.04, y) * smoothstep(1.25, 0.7, yt);
  float core = smoothstep(0.7, 0.05, r) * smoothstep(0.08, 0.3, y) * smoothstep(0.9, 0.42, yt);
  float blue = smoothstep(1.15, 0.75, r) * smoothstep(0.35, 0.75, r) * smoothstep(0.2, 0.0, y) * smoothstep(-0.15, 0.0, y);
  float dark = smoothstep(0.55, 0.0, r) * smoothstep(0.24, 0.02, y);
  vec3 c = vec3(1.0, 0.33, 0.06) * env * 1.6 + vec3(1.0, 0.74, 0.4) * core * 4.0 + vec3(0.1, 0.22, 1.0) * blue * 1.8;
  c *= 1.0 - 0.75 * dark;
  // the tip cools to red and thins
  c *= mix(vec3(1.0), vec3(1.0, 0.45, 0.25), smoothstep(0.75, 1.2, yt));
  return c;
}

// the flame volume along a ray, up to maxT. root: world position of the flame root; k: 0..1+ lit
vec3 flameRay(vec3 ro, vec3 rd, vec3 root, float k, float seed, float maxT) {
  if (k <= 0.001) return vec3(0);
  float H = FLAME_H0 * k * flameBreath(seed);
  vec2 sway = flameSway(seed) * (0.6 + 0.4 * k);
  vec3 c = root + vec3(0.0, H * 0.55, 0.0);
  float R = H * 0.95;
  vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - R * R; float h = b * b - cc;
  if (h < 0.0) return vec3(0);
  h = sqrt(h);
  float t0 = max(-b - h, 0.0), t1 = min(-b + h, maxT);
  if (t1 <= t0) return vec3(0);
  const int N = 26;
  float dt = (t1 - t0) / float(N);
  float t = t0 + dt * hash12(gl_FragCoord.xy + uJitter * 131.0);
  vec3 acc = vec3(0);
  for (int i = 0; i < N; i++) {
    acc += flameEmit(ro + rd * t - root, H, sway, seed);
    t += dt;
  }
  // brightness independent of flame size: emission per metre scales as 1/H
  return acc * dt * (7.0 / H) * min(k, 1.3);
}

// where the lamp's light comes from, and how strong (it breathes with the flame)
vec3 flameLightPos(vec3 root, float k, float seed) {
  float H = FLAME_H0 * k * flameBreath(seed);
  return root + vec3(flameSway(seed).x * H * 0.15, H * 0.38, flameSway(seed).y * H * 0.15);
}
float flameLightI(float k, float seed) { return 0.35 * k * (0.82 + 0.18 * flameBreath(seed)); }
const vec3 FLAME_COL = vec3(1.0, 0.64, 0.34);

// the glow a lens sees round a flame (halo), for a ray passing the flame at depth limit maxT
vec3 flameHalo(vec3 ro, vec3 rd, vec3 root, float k, float seed, float maxT) {
  if (k <= 0.001) return vec3(0);
  vec3 c = flameLightPos(root, k, seed);
  vec3 oc = c - ro; float tc = dot(oc, rd);
  if (tc < 0.0 || tc > maxT + 0.03) return vec3(0);
  float hd = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
  float ang = hd / tc;   // angular distance, so the halo is the same size at any distance
  float I = flameLightI(k, seed);
  return vec3(1.0, 0.62, 0.32) * I * (0.1 * exp(-ang / 0.003) + 0.02 * exp(-ang / 0.015) + 0.008 * exp(-ang / 0.08));
}

// clay: a warm terracotta with slip, wheel lines and soot round the nozzle
vec3 clayAlbedo(vec3 q) {
  float wheel = 0.5 + 0.5 * sin(length(q.xz) * 1400.0 + fbm(q.xz * 300.0, 2) * 4.0);
  vec3 a = vec3(0.46, 0.25, 0.14) * (0.93 + 0.07 * wheel) * (0.85 + 0.3 * fbm(q * 260.0, 3));
  float soot = smoothstep(0.045, 0.075, q.x) * smoothstep(0.02, 0.03, q.y);
  a = mix(a, vec3(0.06, 0.045, 0.04), soot * 0.75);
  // oil darkening in the discus
  float oil = smoothstep(0.03, 0.02, length(q.xz)) * smoothstep(0.03, 0.04, q.y);
  return mix(a, vec3(0.08, 0.05, 0.02), oil * 0.8);
}
`;
