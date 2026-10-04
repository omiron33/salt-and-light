// The storm deck over the lake (s10-rejoice): a thick layer of night storm cloud above the hills of
// Galilee, lit only from above. A rift opens in it and widens; through the rift the clear night of
// stars and the Father's light, which pours down through the opening in shafts and silvers the cloud
// walls. Raymarched volume: one march through the slab, a short march toward the light per sample.
// Requires GAL_GLSL (lib/x-galilee.js) before it. Units are metres.

import { GAL_GLSL, GAL_UNIFORMS } from '/song/lib/x-galilee.js';

export const CLOUD_UNIFORMS = {
  ...GAL_UNIFORMS,
  uHole: [0.0, 600.0, 120.0],   // rift centre x, z and radius (m)
  uDrift: 0.0,                  // the deck's slow travel
  uFlash: 0.0,                  // a far flash inside the deck
};

export const CLOUD_GLSL = GAL_GLSL + /* glsl */ `
uniform vec3 uHole;
uniform float uDrift, uFlash;
const float CB = 1200.0, CT = 2700.0;   // cloud base and top

float cloudDens(vec3 p, int oct) {
  float h = (p.y - CB) / (CT - CB);
  if (h < 0.0 || h > 1.0) return 0.0;
  float prof = smoothstep(0.0, 0.08, h) * smoothstep(1.0, 0.7, h);
  vec3 q = p * 0.0024 + vec3(uDrift, 0.0, uDrift * 0.4);
  float n = fbm(q, 3);
  // the rift: a funnel widening upward, its walls torn by the noise
  float r = length(p.xz - uHole.xy);
  float wall = (r - uHole.z * (0.6 + 0.8 * h)) / (120.0 + 100.0 * h);
  float hole = sat(wall + (n - 0.5) * 2.0);
  float d = n * 1.1 + 0.25 * prof - 0.62 + 0.25 * (hole - 1.0);
  if (d < -0.25) return 0.0;
  if (oct > 2) {
    vec3 w = p + vec3(0.0, -uTime * 6.0, uDrift * 1500.0);
    float e = sat(1.0 - d * 3.0);
    d -= 0.34 * (fbm(w * 0.009, 3) - 0.45) * e;
    d -= 0.10 * (vnoise(w * 0.05) - 0.5) * e;
    d -= 0.06 * (vnoise(w * 0.16) - 0.5) * e;
  }
  return smoothstep(0.0, 0.12, d) * prof * 0.03;
}

vec3 cloudShot(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  vec3 L = normalize(uGloryDir);
  // march the slab
  float t0, t1;
  if (abs(rd.y) < 1e-4) { t0 = 0.0; t1 = 4000.0; }
  else {
    float ta = (CB - ro.y) / rd.y, tb = (CT - ro.y) / rd.y;
    t0 = max(min(ta, tb), 0.0); t1 = min(max(ta, tb), 6000.0);
  }
  vec3 acc = vec3(0); float trans = 1.0;
  if (t1 > t0) {
    const int N = 56;
    float dt = (t1 - t0) / float(N);
    float j = hash12(fc + fract(uTime * 13.7) * 91.0 + uJitter * 53.0);
    for (int i = 0; i < N; i++) {
      float t = t0 + (float(i) + j) * dt;
      vec3 p = ro + rd * t;
      float d = cloudDens(p, 4);
      // light from above: how much cloud lies between this point and the light
      float od = 0.0;
      for (int k = 1; k <= 3; k++) od += cloudDens(p + L * (60.0 * float(k * k)), 2) * 60.0 * float(2 * k - 1);
      float lightT = max(exp(-od * 1.3), 0.015 * exp(-od * 0.15));
      float powder = 1.0 - exp(-od * 2.0 - d * 60.0);
      // phase: strong forward scattering toward the light, a little back
      float mu = dot(rd, L);
      float ph = 0.6 * (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5) + 0.4;
      vec3 sun = mix(vec3(0.75, 0.8, 0.95), vec3(1.0, 0.86, 0.62), sat(lightT * 1.5)) * uGlory * 0.14 * lightT * ph * (0.15 + 0.85 * powder);
      // ambient: the faint night from above, more toward the top of the deck
      vec3 amb = vec3(0.0026, 0.0040, 0.0105) * (0.25 + 0.75 * (p.y - CB) / (CT - CB)) * (0.6 + 0.4 * uGlory);
      vec3 flash = vec3(0.6, 0.65, 0.8) * uFlash * exp(-length(p - vec3(-900.0, 1500.0, 400.0)) / 400.0) * 0.4;
      vec3 S = (sun + amb + flash) * d;
      // the clear air in the rift catches the shafts
      float air = 0.0000035 * uGlory * lightT * smoothstep(1.1, 0.3, length(p.xz - uHole.xy) / max(uHole.z, 1.0)) * (0.5 + vnoise(p.xz * 0.015 + uTime * 0.04));
      float a = exp(-d * dt);
      acc += trans * S * (1.0 - a) / max(d, 1e-7);
      acc += trans * vec3(1.0, 0.88, 0.66) * air * ph * dt;
      trans *= a;
      if (trans < 0.01) break;
    }
  }
  // above or through: the clear starry heaven and the light
  float ga = acos(clamp(dot(rd, L), -1.0, 1.0));
  // rays streaming out from the light
  vec3 lu = normalize(cross(L, vec3(1.0, 0.0, 0.0))), lv = cross(L, lu);
  float ang = atan(dot(rd, lv), dot(rd, lu));
  float rays = 0.85 + 0.15 * smoothstep(0.25, 0.85, vnoise(vec2(ang * 4.0 + 3.0, uTime * 0.12)) * 0.7 + vnoise(vec2(ang * 9.0, -uTime * 0.15)) * 0.3);
  vec3 heaven = vec3(1.0, 0.84, 0.6) * uGlory * (exp(-ga * ga / 0.12) * 0.1 * rays + exp(-ga * ga / 0.02) * 0.22 + exp(-ga * ga / 0.003) * 0.6 + exp(-ga / 0.8) * 0.025 * rays);
  float wash = 1.0 - 0.85 * exp(-ga * ga / 0.08) * sat(uGlory);
  vec3 sky = skyBase(rd) + stars(rd) * smoothstep(-0.02, 0.1, rd.y) * 0.6 * wash + heaven;
  return acc + trans * sky;
}
`;
