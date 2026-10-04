// The cracked pavement (s26-grievance): the great flagstones of the temple court at night, split by a
// deep crack that runs away from the lens. A low moon behind the camera lays two long human shadows
// down the pavement, one on either side of the crack, apart; the people who cast them stand behind
// the camera and are never seen. Dust drifts in the moonlight. Pavement at y = 0; crack along +z.
import { TEMPLE_BASE } from './x-temple.js';

export const CRACK_UNIFORMS = {
  uFocus: 3.0, uAper: 0.012,
  uP1: [0.75, 0.0, -1.6], uP2: [-0.8, 0.0, -1.7],   // the two people's feet (behind the camera)
  uPA: [0.0, 0.0, 0.0],                              // yaw 1, yaw 2, arms
  uMoon: [0.0, 0.34, -1.0],                          // towards the moon (low, behind the camera)
};

export const CRACK_GLSL = TEMPLE_BASE + /* glsl */ `
uniform vec3 uP1, uP2, uPA, uMoon;
const vec3 MOONC = vec3(0.52, 0.58, 0.7);

// the crack's centre line and half width at z
float crackX(float z) { return 0.05 * sin(z * 0.9) + 0.12 * (fbm(vec2(z * 0.35, 3.0), 3) - 0.5) + 0.02 * (vnoise(vec2(z * 6.0, 1.0)) - 0.5); }
float crackW(float z) { return (0.03 + 0.05 * fbm(vec2(z * 0.8, 7.0), 3)) * smoothstep(-2.5, 0.5, z) * smoothstep(40.0, 20.0, z); }

// flagstones: big rectangles in staggered courses; x = distance to a joint, y = stone id
vec2 flag(vec2 xz) {
  float row = floor(xz.y / 0.95);
  float wdt = 0.9 + 0.8 * hash11(row * 3.7);
  vec2 g = vec2(xz.x / wdt + hash11(row * 1.3) * 7.0, xz.y / 0.95);
  vec2 gi = floor(g), gf = fract(g) - 0.5;
  return vec2(min((0.5 - abs(gf.x)) * wdt, (0.5 - abs(gf.y)) * 0.95), hash12(gi));
}
float mapK(vec3 p, out float id) {
  id = 1.0;
  vec2 f = flag(p.xz);
  // each stone a little tilted and worn round its edges
  float d = p.y - 0.004 * (f.y - 0.5) + 0.006 * (1.0 - smoothstep(0.0, 0.02, f.x));
  d -= 0.0025 * fbm(p.xz * 5.0, 2);
  // the crack: a jagged trench, deep and dark
  float cx = crackX(p.z), cw = crackW(p.z);
  float jag = 0.006 * (vnoise(p.zy * vec2(14.0, 30.0)) - 0.5);
  float trench = abs(p.x - cx + jag) - cw * (1.0 - 0.6 * smoothstep(-0.02, -0.5, p.y));
  d = max(d, -trench);
  d = max(d, -p.y - 0.8);
  // the far wall of the court
  float wall = 34.0 - p.z;
  if (wall < d) { d = wall; id = 2.0; }
  return d;
}
float mapKD(vec3 p) { float i; return mapK(p, i); }
vec3 normK(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.0008, 0.0006 * t);
  return normalize(e.xyy * mapKD(p + e.xyy) + e.yyx * mapKD(p + e.yyx) + e.yxy * mapKD(p + e.yxy) + e.xxx * mapKD(p + e.xxx));
}
float marchK(vec3 ro, vec3 rd, out float id) {
  float t = 0.05;
  for (int i = 0; i < 160; i++) {
    float d = mapK(ro + rd * t, id);
    if (abs(d) < 0.0004 * t + 0.0002) return t;
    t += d * 0.8;
    if (t > 60.0) break;
  }
  id = 0.0; return -1.0;
}
float shadowK(vec3 p, vec3 l) {
  float r = 1.0, t = 0.004 + 0.01 * hash12(gl_FragCoord.xy + uJitter * 71.0);
  for (int i = 0; i < 24; i++) {
    float h = mapKD(p + l * t);
    r = min(r, 12.0 * h / t);
    t += clamp(h, 0.004, 0.15);
    if (r < 0.01 || t > 1.2) break;
  }
  return sat(r);
}
float peopleK(vec3 p, vec3 l) {
  float r = 1.0, t = 0.05;
  for (int i = 0; i < 56; i++) {
    vec3 q = p + l * t;
    float b1 = sin(uTime * 0.9) * 0.5, b2 = sin(uTime * 0.77 + 2.0) * 0.5;
    float h = min(personSD(q, uP1, uPA.x, uPA.z, b1), personSD(q, uP2, uPA.y, uPA.z, b2));
    r = min(r, 22.0 * h / t);
    t += clamp(h, 0.02, 0.8);
    if (r < 0.01 || t > 14.0) break;
  }
  return sat(r);
}
float aoK(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.012 * float(i); o += (h - mapKD(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - o * 12.0);
}

// far torches on the court wall, out of focus
vec3 farTorches(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0);
  for (int i = 0; i < 3; i++) {
    float f = float(i);
    vec3 c = vec3(-7.0 + 7.5 * f, 2.3, 33.6);
    acc += glowAt(ro, rd, c, depth + 1.0, vec3(1.0, 0.5, 0.18) * (0.8 + 0.2 * vnoise(vec2(uTime * 5.0, f * 3.0))), 0.05, 0.6) * 0.6;
  }
  return acc;
}

vec3 pavement(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float id; float t = marchK(ro, rd, id);
  vec3 L = normalize(uMoon);
  vec3 col; float depth = 80.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normK(p, t), v = -rd;
    depth = t;
    vec3 alb; float rough = 0.8;
    if (id < 1.5) {
      vec2 f = flag(p.xz);
      alb = vec3(0.46, 0.42, 0.36) * (0.8 + 0.3 * f.y) * (0.75 + 0.35 * fbm(p.xz * 3.0 + f.y * 9.0, 4)) * (0.9 + 0.2 * vnoise(p.xz * 90.0));
      // grime in the joints, darker stone down in the crack
      alb *= 1.0 - 0.6 * smoothstep(0.03, 0.0, f.x);
      alb = mix(alb, vec3(0.2, 0.19, 0.15), smoothstep(0.55, 0.8, fbm(p.xz * 1.3 + 5.0, 4)) * 0.6);
      rough = 0.85;
      alb *= mix(1.0, 0.35, smoothstep(-0.005, -0.12, p.y));
      // hairline cracks running off the main one
      vec2 ce = cells(p.xz * vec2(2.2, 1.0) + 4.0);
      float hair = smoothstep(0.035, 0.0, ce.x) * smoothstep(0.5, 0.05, abs(p.x - crackX(p.z))) ;
      alb *= 1.0 - 0.55 * hair;
      rough = 0.7;
    } else {
      vec2 g = p.xy / vec2(1.2, 0.5); g.x += 0.5 * mod(floor(g.y), 2.0);
      vec2 gf = fract(g) - 0.5;
      alb = vec3(0.2, 0.18, 0.15) * (0.8 + 0.3 * hash12(floor(g))) * (1.0 - 0.5 * smoothstep(0.46, 0.5, max(abs(gf.x), abs(gf.y))));
    }
    float ao = aoK(p, n);
    float nl = sat(dot(n, L));
    float sh = nl > 0.0 ? shadowK(p + n * 0.003, L) : 0.0;
    float ps = nl > 0.0 ? peopleK(p + n * 0.003, L) : 1.0;
    vec3 h = normalize(L + v);
    float spec = pow(sat(dot(n, h)), 40.0) * 0.15 * (1.0 - rough);
    col = MOONC * (alb * nl / PI + spec) * sh * ps * 5.5;
    // sky fill, and the warm far torches on the end wall
    col += vec3(0.010, 0.012, 0.02) * alb * ao * (0.4 + 0.6 * n.y);
    vec3 tl = vec3(0.5, 2.3, 33.6) - p; float td2 = dot(tl, tl);
    col += vec3(1.0, 0.5, 0.2) * 7.0 * alb * sat(dot(n, tl * inversesqrt(td2))) / (1.0 + td2) * ao;
  } else {
    col = nightSky(rd);
  }
  // night air, a little moonlit haze
  float fogd = 1.0 - exp(-depth * 0.05);
  col = mix(col, vec3(0.012, 0.014, 0.022), fogd);
  col += farTorches(ro, rd, depth);
  // dust motes drifting through the moonlight
  for (int i = 0; i < 24; i++) {
    float f = float(i);
    vec3 m = vec3((hash11(f * 3.1) - 0.5) * 3.0, 0.2 + 1.2 * hash11(f * 5.7), 0.8 + 5.0 * hash11(f * 7.9));
    m += vec3(sin(uTime * 0.3 + f) * 0.15 + uTime * 0.03, sin(uTime * 0.21 + f * 2.0) * 0.1, cos(uTime * 0.25 + f) * 0.15);
    m.x = mod(m.x + 1.5, 3.0) - 1.5;
    col += glowAt(ro, rd, m, depth, MOONC * 0.012 * (0.5 + hash11(f * 2.2)), 0.004, 0.02);
  }
  if (!(abs(col.x + col.y + col.z) < 1e6)) col = vec3(0.0);
  return col;
}
`;
