// s08's world: "Those who suffer for doing right have the kingdom." A tangle of thorn branches close to
// the lens, black against the night; far behind them a line of dark hills. A band of warm light rises
// behind the hills (uRise 0..1) and on "kingdom" breaks through (uBreak 0..1): it floods the gaps
// between the thorns, rims every spine with gold and blooms through the lens.
// Camera near the origin looking +z; the thorns stand in 0.35..1.3 m.
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const THORN_UNIFORMS = { ...NATURE_UNIFORMS, uRise: 0, uBreak: 0 };

export const THORN_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uRise, uBreak;
const vec3 WARM = vec3(1.0, 0.6, 0.25);
#define NB 9

// branch b's control points: a wandering line across the frame at its own depth
vec3 bpt(int b, int i) {
  float fb = float(b), fi = float(i);
  float side = mod(fb, 2.0) < 0.5 ? -1.0 : 1.0;
  float z = 0.42 + 0.1 * fb + 0.05 * hash11(fb * 3.3);
  float y0 = fb < 2.5 ? 0.3 + 0.1 * fb : mix(-0.06, 0.16, hash11(fb * 7.1));
  float u = fi / 8.0;
  float x = side * (-1.0 + 2.1 * u) * z;
  // a wandering, kinked stem: two octaves of smooth wiggle plus a gentle arc
  float y = y0 + 0.11 * sin(u * 5.0 + fb * 2.3) + 0.045 * sin(u * 13.0 + fb * 5.1) - 0.12 * (u - 0.5) * (u - 0.5) * (hash11(fb) - 0.3) * 4.0;
  vec3 p = vec3(x, y * z, z + 0.06 * sin(u * 4.0 + fb));
  // wind: a slow sway growing toward the free end
  p.xy += vec2(0.004, 0.008) * sin(uTime * (1.1 + 0.2 * fb) + fb) * u;
  return p;
}
float thornSeg(vec3 p, vec3 a, vec3 b, float r, float seed) {
  vec3 ba = b - a, pa = p - a;
  float L = length(ba); vec3 ax = ba / L;
  float h = clamp(dot(pa, ax), 0.0, L);
  float d = length(pa - ax * h) - r * (1.0 - 0.25 * h / L);
  if (d > 0.03) return d - 0.027;
  // spines every few centimetres, turning round the stem
  float sp = 0.045;
  float k = floor(h / sp);
  vec3 up = abs(ax.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);
  vec3 u = normalize(cross(ax, up)), w = cross(ax, u);
  for (int j = 0; j < 2; j++) {
    float kk = k + float(j);
    float hh = (kk + 0.5) * sp;
    if (hh > L) continue;
    float ang = kk * 2.4 + seed * 7.0;
    vec3 dir = normalize(u * cos(ang) + w * sin(ang) + ax * 0.45);
    vec3 base = a + ax * hh;
    float len = 0.016 + 0.01 * hash11(kk + seed * 31.0);
    d = min(d, sdRoundCone(p, base, base + dir * len, r * 0.75, 0.0004));
  }
  return d;
}
float mapT(vec3 p) {
  float d = 1e9;
  for (int b = 0; b < NB; b++) {
    vec3 a = bpt(b, 0);
    // a cheap bound on the whole branch
    float zb = a.z;
    float bz = abs(p.z - zb) - 0.17;
    if (bz > 0.0) { d = min(d, bz + 0.005); continue; }
    for (int i = 1; i < 9; i++) {
      vec3 c = bpt(b, i);
      float r = 0.0042 * (1.0 - abs(float(i) - 4.0) * 0.08) * (0.8 + 0.4 * hash11(float(b)));
      d = smin(d, thornSeg(p, a, c, r, float(b * 9 + i)), 0.003);
      a = c;
    }
    // side shoots, curving up
    for (int k = 0; k < 2; k++) {
      vec3 s0 = bpt(b, 2 + k * 3);
      float hk = hash11(float(b * 2 + k) * 9.0);
      float sx = (hk > 0.5 ? 1.0 : -1.0);
      vec3 s1 = s0 + vec3(0.035 * sx, 0.03 + 0.02 * hk, 0.01);
      vec3 s2 = s1 + vec3(0.03 * sx, 0.012, 0.0);
      d = min(d, thornSeg(p, s0, s1, 0.0026, float(b) * 3.0 + 50.0 + float(k)));
      d = min(d, thornSeg(p, s1, s2, 0.0018, float(b) * 3.0 + 70.0 + float(k)));
    }
  }
  return d;
}
vec3 normT(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0002;
  return normalize(e.xyy * mapT(p + e.xyy) + e.yyx * mapT(p + e.yyx) + e.yxy * mapT(p + e.yxy) + e.xxx * mapT(p + e.xxx));
}
float marchT(vec3 ro, vec3 rd) {
  float t = 0.05;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    float d = mapT(p);
    if (d < 0.00015 * t) return t;
    t += d * 0.9;
    if (t > 2.0) break;
  }
  return -1.0;
}

// the far scene: dark hills, the night sky, and the band of light rising behind the hills
float hillLine(float x) { return 0.035 + 0.05 * fbm(vec2(x * 2.2 + 3.0, 0.5), 4) + 0.03 * smoothstep(0.6, -0.4, abs(x + 0.15)); }
vec3 farLight(vec3 rd) {
  float x = rd.x / max(rd.z, 0.1), y = rd.y / max(rd.z, 0.1);
  float hl = hillLine(x) - 0.06;
  // the band: a horizontal glow whose centre climbs, brightest behind the middle
  float by = mix(0.02, 0.09, uRise) + 0.02 * uBreak;
  float core = exp(-x * x * mix(14.0, 6.0, uBreak));
  float band = exp(-pow((y - by) / mix(0.03, 0.05, uBreak), 2.0)) * (0.25 + 0.75 * core);
  float inten = 0.1 + 0.6 * uRise + 0.9 * uBreak;
  vec3 sky = mix(vec3(0.06, 0.065, 0.12), vec3(0.025, 0.03, 0.065), sat((y - 0.05) * 2.0));
  sky += starField(rd, 0.8) * smoothstep(0.1, 0.35, y) * (1.0 - uBreak);
  sky += WARM * band * inten;
  sky += WARM * 0.12 * inten * exp(-max(y - by, 0.0) * 9.0) * (0.2 + 0.8 * core);
  // the source itself on the crest once it breaks through
  float sd = length(vec2(x, (y - by - 0.01) * 1.6));
  sky += vec3(1.0, 0.8, 0.5) * uBreak * (6.0 * exp(-sd * sd * 1500.0) + 0.6 * exp(-sd * 14.0));
  if (y < hl) {
    // hills: black, their crest catching the band
    float rim = exp(-(hl - y) * 120.0) * band * inten * 0.6;
    return vec3(0.004, 0.004, 0.006) + WARM * rim + WARM * inten * 0.05 * core * exp(-(hl - y) * 10.0);
  }
  return sky;
}

vec3 thorns(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float t = marchT(ro, rd);
  vec3 col;
  if (t > 0.0) {
    vec3 p = ro + rd * t; vec3 n = normT(p); vec3 v = -rd;
    // the light is behind: thorns are silhouettes with gold rims where their edges turn to it
    vec3 L = normalize(vec3(-p.x * 0.3, 0.02 - p.y * 0.3, 1.0));
    float inten = 0.1 + 0.6 * uRise + 1.6 * uBreak;
    float rim = pow(1.0 - sat(dot(n, v)), 3.0) * sat(dot(n, L) + 0.2) * exp(-pow((p.y / p.z - 0.06) / 0.25, 2.0));
    vec3 alb = vec3(0.05, 0.035, 0.025) * (0.7 + 0.6 * vnoise(p.xy * 300.0));
    col = alb * vec3(0.03, 0.035, 0.06) * (0.5 + 0.5 * n.y);
    col += WARM * rim * inten * 0.8 * (0.6 + 0.4 * exp(-p.x * p.x * 4.0));
    col += alb * WARM * inten * 0.2 * sat(dot(n, L));
  } else {
    col = farLight(rd);
  }
  // warm haze in the air in front of the light
  float inten = 0.1 + 0.6 * uRise + 1.6 * uBreak;
  float x = rd0.x / max(rd0.z, 0.1);
  col += WARM * 0.02 * inten * exp(-x * x * 4.0) * exp(-abs(rd0.y - mix(0.02, 0.09, uRise)) * 8.0);
  return col;
}
`;
