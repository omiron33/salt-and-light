// The nature worlds of the Beatitudes (s02 mourn, s03 gentle, s04 thirst, s07 peace, s08 thorns,
// s09 storm): shared GLSL for a thin lens, the night sky, oil-lamp flames and the glow a small light
// hangs in the air. Each scene's own world lives in lib/x-nature-<world>.js and is prefixed with this.
// Everything is a pure function of uTime.

export const NATURE_UNIFORMS = { uFocus: 1.0, uAper: 0.0 };

export const NATURE_GLSL = /* glsl */ `
uniform float uFocus, uAper;

// the camera basis
void camBasis(out vec3 ww, out vec3 uu, out vec3 vv) {
  ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  uu = normalize(cross(ww, up)); vv = cross(uu, ww);
}
// a thin lens: the eye moves across the aperture (one point per sub-frame) and keeps looking at the
// same point on the focus plane. rd0 is the pinhole ray (for sky and far bokeh).
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww, uu, vv; camBasis(ww, uu, vv);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * vec2(917.13, 331.71) + 3.1 + uFrame * 0.013), hash12(uJitter.yx * vec2(613.37, 271.93) + 7.7 + uFrame * 0.029));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

// GGX specular lobe (already multiplied by n.l)
float ggx(vec3 n, vec3 l, vec3 v, float rough) {
  vec3 h = normalize(l + v);
  float a = max(0.02, rough * rough), a2 = a * a;
  float nh = sat(dot(n, h)), nl = sat(dot(n, l));
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return nl * a2 / (PI * d * d) * 0.25;
}
float fresnel(vec3 n, vec3 v, float f0) { return f0 + (1.0 - f0) * pow(1.0 - sat(dot(n, v)), 5.0); }

// stars: a fine field of small soft points, a few brighter, twinkling slowly
vec3 starField(vec3 rd, float dens) {
  vec3 acc = vec3(0);
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 220.0 : 520.0;
    vec3 p = rd * sc;
    vec3 i = floor(p), f = fract(p) - 0.5;
    vec3 h = hash33(i + float(k) * 31.0);
    if (h.x > dens * (k == 0 ? 0.22 : 0.5)) continue;
    vec3 o = (hash33(i + 7.0) - 0.5) * 0.6;
    float d = length(f - o);
    float b = pow(h.y, 6.0) * (k == 0 ? 3.0 : 0.9) + 0.06;
    float tw = 0.75 + 0.25 * sin(uTime * (1.3 + 2.0 * h.z) + h.x * 60.0);
    vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), h.z);
    acc += tint * b * tw * exp(-d * d * (k == 0 ? 160.0 : 260.0));
  }
  return acc;
}

// an oil-lamp flame standing up from b (height h, vertical axis), drawn where the ray passes it.
// k grows it in (0..1+), flare brightens it, depth clips it behind geometry. Teardrop body, white
// core, blue root, sideways sway and lick from wind (sway in metres at the tip).
vec3 flameAt(vec3 ro, vec3 rd, vec3 b, float h, float k, float flare, float seed, float depth, float sway) {
  if (k <= 0.001) return vec3(0);
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = h * k * (0.9 + 0.2 * vnoise(vec2(uTime * 7.0 + seed, 1.0))) * (1.0 + 0.5 * flare);
  float y = q.y / hh;
  if (y < -0.4 || y > 1.6) return vec3(0);
  float sw = (vnoise(vec2(uTime * 1.7 + seed, 3.0)) - 0.5) * 0.5 + (vnoise(vec2(uTime * 6.3 + seed, 5.0)) - 0.5) * 0.18;
  vec2 side = normalize(vec2(-rd.z, rd.x) + 1e-5);
  vec2 rr = q.xz - side * (sw * hh * 0.25 + sway) * y * y;
  float x = length(rr) / (hh * 0.22);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.5) * pow(1.0 - yy, 0.75) * 1.9 + 0.08;
  float body = smoothstep(1.0, 0.55, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.15, 0.85, y);
  float core = smoothstep(0.55, 0.15, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.75, 0.35, y);
  float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.25, 0.0, y) * smoothstep(-0.25, 0.0, y);
  vec3 c = vec3(1.0, 0.52, 0.18) * body * 6.0 + vec3(1.0, 0.86, 0.62) * core * 22.0 + vec3(0.15, 0.3, 1.0) * root * 1.5;
  return c * min(k, 1.2) * (1.0 + 1.5 * flare);
}

// light a point light hangs in uniform haze along a ray (closed form), up to depth
float hazeGlow(vec3 ro, vec3 rd, vec3 c, float depth) {
  vec3 oc = c - ro; float tc = dot(oc, rd);
  float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-8));
  return (atan((depth - tc) / h) + atan(tc / h)) / h;
}
// the soft glow a lens sees round a small bright source (only in front of geometry)
float lensGlow(vec3 ro, vec3 rd, vec3 c, float depth, float r0, float r1) {
  vec3 oc = c - ro; float tc = dot(oc, rd);
  if (tc <= 0.0 || tc > depth + 0.05) return 0.0;
  float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
  return 0.45 * exp(-h / r0) + 0.035 * exp(-h / r1);
}
`;
