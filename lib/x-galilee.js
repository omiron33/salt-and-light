// The Galilee night world, shared by s00-title, s06-pure, s10-rejoice, s19-night-sea and s52-end.
// Units are metres. The lake surface is y = 0. We stand on the near (west) shore, which runs roughly
// along x near z = 1 (it curves away towards -z on both sides); the lake opens towards -z, about
// 11 km across, to the steep eastern escarpment (the Golan), where the dawn comes up. Behind the near
// shore the land rises to the Mount (around z = 1150), and the hills close the lake at its far ends.
// One sky (night indigo, stars and the Milky Way, the blue hour, dawn, and the Father's light), one
// lake (swell, ripple rings, glass), one terrain, low mist, a point light (the lamp or the lantern)
// and a thin lens. Each shot file adds its own near objects and its shade() function.
// Everything is a pure function of uTime.

export const GAL_UNIFORMS = {
  uFocus: 6.0, uAper: 0.0,
  uDawn: 0.0,            // 0 deep night .. 1 the blue hour turning rose in the east
  uDay: 0.0,             // 0 night .. 1 early daylight (sun just up)
  uSunDir: [0.25, 0.06, -0.97],
  uSwell: 0.5,           // 0 glass .. 1 a light breeze on the water
  uStars: 1.0,
  uGloryDir: [0.0, 0.6, -0.8], uGlory: 0.0,   // the great soft light opening in the heavens
  uRing: [0.0, 0.0, -1e4],                     // ripple ring: centre x, z and start time
  uMist: 0.0,
  uL1Pos: [0.0, 0.5, 0.0], uL1Col: [0.0, 0.0, 0.0],   // the point light (lamp flame / lantern)
  uSkyLift: 1.0,
  uMoonDir: [0.35, 0.42, -0.84], uMoon: 0.0,   // faint moonlight from behind the camera
};

export const GAL_GLSL = /* glsl */ `
uniform float uFocus, uAper, uDawn, uDay, uSwell, uStars, uGlory, uMist, uSkyLift;
uniform vec3 uSunDir, uGloryDir, uRing, uL1Pos, uL1Col, uMoonDir;
uniform float uMoon;
const vec3 MOONC = vec3(0.55, 0.65, 0.95);

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float pxAng() { return 2.0 * tan(radians(uFov) * 0.5) / uRes.y; }

// ---------------- the lens ----------------
// camera ray through a thin lens (aperture radius uAper, focus distance uFocus); rd0 is the pinhole ray
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  // a per-pixel lens sample, decorrelated across sub-frames (a soft grain, not a pattern)
  vec2 j = hash22(fc * 0.913 + uJitter * 371.0 + fract(uTime * 7.13) * 97.0);
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

// ---------------- the sky ----------------
const vec3 EAST = vec3(0.0, 0.0, -1.0);
vec3 SUND() { return normalize(uSunDir); }

// stars on a cube map of the sky: one candidate per cell, a gaussian a pixel or so wide
vec3 starLayer(vec3 rd, float sc, float dens, float seed) {
  vec3 a = abs(rd);
  vec2 uv; float face;
  if (a.x > a.y && a.x > a.z) { uv = rd.yz / a.x; face = sign(rd.x); }
  else if (a.y > a.z) { uv = rd.xz / a.y; face = 2.0 + sign(rd.y); }
  else { uv = rd.xy / a.z; face = 4.0 + sign(rd.z); }
  vec2 q = uv * sc; vec2 c = floor(q);
  vec2 h = hash22(c + face * 131.0 + seed);
  float e = hash12(c * 1.37 + face * 17.0 + seed * 3.1);
  if (e > dens) return vec3(0);
  vec2 sp = c + 0.2 + 0.6 * h;
  float dpx = length(q - sp) / sc / pxAng() * (1.0 / max(a.x, max(a.y, a.z)));
  float b = pow(hash11(e * 91.7 + seed), 7.0) * 14.0 + 0.25;
  float tw = 0.8 + 0.2 * sin(uTime * (7.0 + 9.0 * h.x) + 40.0 * h.y);
  vec3 tint = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.78, 0.55), hash11(e * 13.3 + seed));
  tint = mix(tint, vec3(1.0), 0.5);
  return tint * b * tw * exp(-dpx * dpx * 0.9);
}
vec3 milkyWay(vec3 rd) {
  vec3 nmw = normalize(vec3(0.55, 0.42, 0.72));
  float d = dot(rd, nmw);
  float band = exp(-d * d / 0.03);
  float core = exp(-d * d / 0.006);
  float n1 = fbm(rd * 7.0 + 2.0, 5);
  float dust = smoothstep(0.45, 0.75, fbm(rd * 11.0 + 9.0, 4)) * exp(-d * d / 0.004);
  vec3 c = vec3(0.55, 0.55, 0.65) * band * (0.4 + 0.9 * n1) + vec3(0.9, 0.75, 0.55) * core * 0.5 * n1;
  return c * (1.0 - 0.8 * dust) * 0.04;
}
vec3 stars(vec3 rd) {
  if (uStars <= 0.001) return vec3(0);
  vec3 nmw = normalize(vec3(0.55, 0.42, 0.72));
  float band = exp(-pow(dot(rd, nmw), 2.0) / 0.04);
  vec3 s = starLayer(rd, 70.0, 0.55, 1.0) * 0.1
         + starLayer(rd, 160.0, 0.45, 7.0) * 0.04
         + starLayer(rd, 330.0, 0.25 + 0.6 * band, 13.0) * 0.02;
  return (s + milkyWay(rd)) * uStars;
}

// the Father's light: a great soft glow with a bright heart
vec3 glory(vec3 rd) {
  if (uGlory <= 0.0) return vec3(0);
  float c = dot(rd, normalize(uGloryDir));
  float a = acos(clamp(c, -1.0, 1.0));
  vec3 col = vec3(1.0, 0.82, 0.55) * (exp(-a * a / 0.025) * 0.22 + exp(-a * a / 0.005) * 1.0 + exp(-a / 0.02) * 0.8)
           + vec3(0.9, 0.85, 1.0) * exp(-a / 0.35) * 0.025;
  return col * uGlory;
}

// sky colour (no stars), night through dawn to early day
vec3 skyBase(vec3 rd) {
  float y = rd.y;
  float hz = exp(-max(y, 0.0) * 9.0);                     // close to the horizon
  float east = sat(dot(normalize(vec3(rd.x * 0.6, 0.0, rd.z)), EAST) * 0.5 + 0.5);
  // night: deep indigo with a faint airglow along the horizon
  vec3 c = mix(vec3(0.008, 0.0105, 0.028), vec3(0.036, 0.046, 0.088), pow(hz, 1.3)) * uSkyLift;
  c += vec3(0.028, 0.032, 0.052) * exp(-max(y, 0.0) * 30.0) * uSkyLift;
  // the blue hour: deep blue all over, brighter and greener-blue in the east, a rose band low
  vec3 bh = mix(vec3(0.010, 0.018, 0.050), vec3(0.030, 0.050, 0.110), hz * (0.4 + 0.6 * east));
  bh += vec3(0.08, 0.035, 0.04) * pow(east, 4.0) * exp(-max(y, 0.0) * 22.0) * smoothstep(0.4, 1.0, uDawn);
  c = mix(c, bh, smoothstep(0.0, 1.0, uDawn));
  // early day: a clean pale sky, gold near the sun
  if (uDay > 0.0) {
    vec3 sd = SUND();
    float s = max(dot(rd, sd), 0.0);
    float sw = pow(s, 3.0);
    vec3 hor = mix(vec3(0.62, 0.40, 0.42), vec3(1.25, 0.70, 0.38), sw);
    vec3 zen = vec3(0.045, 0.085, 0.22);
    vec3 mid = mix(vec3(0.20, 0.20, 0.36), vec3(0.45, 0.32, 0.36), sw);
    float yy = sat(y);
    vec3 day = mix(hor, mid, smoothstep(0.0, 0.12, yy));
    day = mix(day, zen, smoothstep(0.05, 0.32, yy));
    day += vec3(1.0, 0.62, 0.32) * (pow(s, 12.0) * 0.8 + pow(s, 90.0) * 2.0);
    day += vec3(1.0, 0.85, 0.6) * smoothstep(0.99985, 0.99992, s) * 40.0;   // the sun's disc
    // high streaks of cloud catching the dawn
    if (y > 0.0) {
      vec2 uv = rd.xz / (y + 0.06);
      float cl = fbm(uv * vec2(0.6, 1.1) + vec2(uTime * 0.004, 0.0), 5);
      float dens = smoothstep(0.52, 0.85, cl) * smoothstep(0.0, 0.06, y) * 0.6;
      vec3 cc = mix(vec3(0.95, 0.55, 0.5), vec3(1.4, 0.85, 0.55), sw) * (0.6 + 0.6 * sw);
      day = mix(day, cc, dens * (1.0 - smoothstep(0.12, 0.3, yy)));
    }
    c = mix(c, day, uDay);
  }
  return c;
}
vec3 skyFull(vec3 rd) {
  vec3 c = skyBase(rd);
  float hzFade = smoothstep(-0.01, 0.06, rd.y);
  c += stars(rd) * hzFade * (1.0 - 0.85 * uDawn) * (1.0 - uDay);
  c += glory(rd);
  return c;
}

// ---------------- the land ----------------
float shoreZ(float x) { return 5.5 - x * x / 12000.0 + 0.45 * sin(x * 0.37) + 0.25 * sin(x * 1.3 + 1.0) + 14.0 * sin(x * 0.004); }
float eastZ(float x) { return -10900.0 + x * x / 16000.0 + 280.0 * sin(x / 900.0); }
float landH(vec2 p, int oct) {
  float x = p.x, z = p.y;
  float s = z - shoreZ(x);
  float det = fbm(p / 260.0, oct);
  float det2 = fbm(p / 60.0 + 3.0, max(oct - 1, 1));
  // the near shore: stony, rising gently, then the hills and the Mount behind
  float nearL = s * 0.06;
  if (s > 0.0) {
    nearL = s * 0.012 + 12.0 * (1.0 - exp(-max(s - 25.0, 0.0) / 200.0)) * (0.7 + 0.6 * det) + 6.0 * det2 * smoothstep(8.0, 150.0, s)
          + 25.0 * smoothstep(300.0, 1800.0, s) * (0.6 + 0.8 * det)
          + (oct >= 4 ? 5.0 * smoothstep(0.5, 0.8, vnoise(p / 6.0)) * smoothstep(0.35, 0.6, fbm(p / 90.0 + 11.0, 2)) * smoothstep(40.0, 120.0, s) : 0.0)
          + 165.0 * exp(-pow(length(vec2(x + 885.0, s - 520.0) * vec2(0.8, 1.0)) / 430.0, 2.0)) * (0.85 + 0.3 * det) * smoothstep(0.0, 60.0, s)
          + 90.0 * smoothstep(2500.0, 7000.0, s);
  }
  // the eastern escarpment, flat-topped
  float e = eastZ(x) - z;
  float eastL = e * 0.06;
  if (e > 0.0) eastL = 400.0 * smoothstep(0.0, 1700.0, e) * (0.85 + 0.3 * det) + e * 0.02 + 30.0 * fbm(p / 90.0, max(oct - 2, 1));
  // the hills that close the lake north and south
  float endL = 330.0 * (smoothstep(7000.0, 13000.0, abs(x)) * (0.75 + 0.5 * det)) - 30.0;
  return max(max(nearL, eastL), endL);
}

// heightfield march for the far land (from t0 out to tmax)
float marchLand(vec3 ro, vec3 rd, float t0, float tmax) {
  if (t0 >= tmax) return -1.0;
  float t = t0;
  float hPrev = 1.0, h = 1.0;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    h = p.y - landH(p.xz, 4);
    if (h < 0.0015 * t) {
      // refine between the last two samples
      float ta = t - max(hPrev * 0.5, 0.01 * t), tb = t;
      for (int j = 0; j < 6; j++) { float tm = 0.5 * (ta + tb); vec3 q = ro + rd * tm; if (q.y - landH(q.xz, 4) < 0.0015 * tm) tb = tm; else ta = tm; }
      return tb;
    }
    if (p.y > 700.0 && rd.y > 0.0) return -1.0;
    hPrev = h;
    t += max(h * 0.55, 0.013 * t);
    if (t > tmax) return -1.0;
  }
  // out of steps while grazing the land: call it a hit
  return h < 0.03 * t ? t : -1.0;
}
vec3 landNormal(vec2 p, float t) {
  float e = max(0.05, 0.002 * t);
  float h = landH(p, 6);
  return normalize(vec3(h - landH(p + vec2(e, 0), 6), e, h - landH(p + vec2(0, e), 6)));
}
// colour of the far land at night / dawn / day; haze toward the horizon colour
vec3 landShade(vec3 p, vec3 rd, float t) {
  vec3 n = landNormal(p.xz, t);
  float g = fbm(p.xz / 40.0, 3);
  vec3 alb = mix(vec3(0.07, 0.065, 0.05), vec3(0.11, 0.10, 0.07), g);
  vec3 skyAmb = skyBase(normalize(n + vec3(0.0, 0.6, 0.0))) * 1.6 * (0.6 + 0.4 * n.y);
  vec3 c = alb * skyAmb;
  c += alb * MOONC * uMoon * sat(dot(n, normalize(uMoonDir)));
  // the east glow catches west-facing slopes a little, dawn picks out the ridges
  if (uDay > 0.0) {
    vec3 sd = SUND();
    c += alb * vec3(1.0, 0.72, 0.48) * 2.2 * sat(dot(n, sd)) * uDay;
  }
  // the lamp (or lantern) lights the near ground
  vec3 L = uL1Pos - p; float d2 = dot(L, L);
  c += alb * uL1Col * sat(dot(n, L * inversesqrt(d2))) / (d2 + 0.01);
  float fog = 1.0 - exp(-t * max(0.00012 + 0.0001 * uDawn - 0.00016 * uDay, 0.00004));
  vec3 hzc = skyBase(normalize(vec3(rd.x, 0.03, rd.z)));
  return mix(c, hzc * 0.85, fog);
}

// ---------------- the lake ----------------
float waveH(vec2 p, float t, int oct) {
  float h = 0.0;
  vec2 d = normalize(vec2(0.6, 1.0));
  float k = 0.9, a = 0.045;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    float ph = dot(p, d) * k - t * sqrt(9.8 * k) * 0.9 + 1.7 * vnoise(p * k * 0.15 + float(i));
    h += a * sin(ph);
    d = rot2(1.1 + float(i) * 0.7) * d;
    k *= 1.9; a *= 0.52;
  }
  h += 0.006 * (vnoise(p * 9.0 + vec2(t * 0.7, -t * 0.5)) - 0.5) * step(4.0, float(oct));
  return h;
}
// the ripple ring: expanding, decaying rings from a drop at (uRing.x, uRing.y) at time uRing.z
float ringH(vec2 p) {
  float age = uTime - uRing.z;
  if (age < 0.0 || age > 6.0) return 0.0;
  float r = length(p - uRing.xy);
  float front = age * 0.55;
  float x = r - front;
  float env = exp(-x * x / (0.12 + 0.08 * age)) * exp(-age * 1.1) / (1.0 + r * 0.6);
  return 0.03 * env * sin(x * 22.0);
}
vec3 waterNormal(vec2 p, float dist) {
  float e = 0.004 + dist * 0.0012;
  int oct = dist < 30.0 ? 6 : dist < 200.0 ? 4 : 3;
  float sw = uSwell;
  float h0 = waveH(p, uTime, oct) * sw + ringH(p);
  float hx = waveH(p + vec2(e, 0), uTime, oct) * sw + ringH(p + vec2(e, 0));
  float hz = waveH(p + vec2(0, e), uTime, oct) * sw + ringH(p + vec2(0, e));
  vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
  // far water flattens (the swell averages out into a soft sheen)
  return normalize(mix(n, vec3(0, 1, 0), smoothstep(150.0, 2500.0, dist) * 0.7));
}
float fresnelW(vec3 n, vec3 v) { return 0.02 + 0.98 * pow(1.0 - sat(dot(n, v)), 5.0); }

// point light highlight on a surface (GGX-ish), used for the lamp on water and wet stone
vec3 pointSpec(vec3 p, vec3 n, vec3 v, float rough, vec3 lpos, vec3 lcol) {
  vec3 L = lpos - p; float d2 = dot(L, L); L *= inversesqrt(d2);
  vec3 h = normalize(L + v);
  float a = max(0.002, rough * rough), a2 = a * a;
  float nh = sat(dot(n, h));
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * dd * dd);
  return lcol * D * sat(dot(n, L)) / (d2 + 0.01) * 0.25;
}

// ---------------- an oil-lamp flame ----------------
// a flame standing at b (its root), height h, drawn where the ray passes its axis; k 0..1.2 size,
// flare a brightening; sway leans it in the breeze
vec3 flameAt(vec3 ro, vec3 rd, vec3 b, float h, float k, float seed, float depth) {
  if (k <= 0.001) return vec3(0);
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.02) return vec3(0);
  vec3 q = ro + rd * t - b;
  float tm = uTime;
  float hh = h * k * (0.86 + 0.28 * vnoise(vec2(tm * 6.5 + seed, 1.0)));
  float y = q.y / hh;
  if (y < -0.4 || y > 1.6) return vec3(0);
  // the flame licks: a lean that grows to the tip and a travelling wobble
  float lean = (vnoise(vec2(tm * 1.3 + seed, 3.0)) - 0.5) * 0.7 + 0.15;
  float wob = sin(y * 6.0 - tm * 13.0 + seed) * 0.12 * y;
  vec2 side = normalize(vec2(-rd.z, rd.x) + 1e-5);
  vec2 rr = q.xz - side * (lean + wob) * hh * 0.35 * y * y;
  float x = length(rr) / (hh * 0.24);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.45) * pow(1.0 - yy, 0.9) * 1.9 + 0.06;
  float body = smoothstep(1.0, 0.5, x / prof) * smoothstep(-0.12, 0.06, y) * smoothstep(1.15, 0.8, y);
  float core = smoothstep(0.6, 0.12, x / prof) * smoothstep(0.02, 0.22, y) * smoothstep(0.8, 0.35, y);
  float root = smoothstep(1.0, 0.4, length(rr) / (hh * 0.09)) * smoothstep(0.16, 0.02, y) * smoothstep(-0.06, 0.02, y);
  vec3 c = vec3(1.0, 0.42, 0.1) * body * 2.2 + vec3(1.0, 0.8, 0.45) * core * 6.0 + vec3(0.15, 0.3, 1.0) * root * 0.8;
  return c * min(k, 1.2);
}
// the soft glow a lens and the night air hang round a light at c (strength s)
vec3 glowAt(vec3 ro, vec3 rd, vec3 c, float depth, vec3 col, float r1, float r2) {
  vec3 oc = c - ro; float tc = dot(oc, rd);
  if (tc <= 0.0) return vec3(0);
  float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
  float vis = tc < depth + 0.05 ? 1.0 : 0.15;
  float ang = h / tc;
  return col * vis * (exp(-ang / r1) * 0.5 + exp(-ang / r2) * 0.06);
}

// ---------------- mist ----------------
// thin sheets of mist lying on the water; returns in-scattered light, multiplies trans
vec3 mistLayers(vec3 ro, vec3 rd, float tmax, inout float trans) {
  if (uMist <= 0.0 || rd.y > -0.004) return vec3(0);   // mist lies on the water, below the horizon
  vec3 acc = vec3(0);
  for (int i = 0; i < 5; i++) {
    float y = 0.12 + float(i) * 0.14;
    if (abs(rd.y) < 1e-4) continue;
    float t = (y - ro.y) / rd.y;
    if (t <= 0.0 || t > tmax || y > ro.y - 0.05) continue;
    vec3 p = ro + rd * t;
    vec2 q = p.xz * 0.18 + vec2(uTime * 0.05, uTime * 0.02) * (1.0 + float(i) * 0.3);
    float m = fbm(q + float(i) * 7.1, 4);
    float dens = smoothstep(0.38, 0.8, m) * uMist * exp(-float(i) * 0.35) / (1.0 + abs(rd.y) * 5.0);
    dens *= smoothstep(0.0, 4.0, t) * exp(-t * 0.012);
    // lit by the sky and by the point light
    vec3 L = uL1Pos - p; float d2 = dot(L, L);
    vec3 lit = skyBase(vec3(0.0, 1.0, 0.0)) * 0.8 + skyBase(normalize(vec3(rd.x, 0.05, rd.z))) * 0.7 + uL1Col * 0.25 / (d2 + 0.3);
    float a = sat(dens * 0.55);
    acc += trans * a * lit;
    trans *= 1.0 - a;
  }
  return acc;
}
// in-scattering round a point light through the night air (analytic, homogeneous)
vec3 airGlow(vec3 ro, vec3 rd, float depth, vec3 c, vec3 col, float k) {
  vec3 oc = c - ro; float tc = dot(oc, rd);
  float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-6));
  float g = (atan((min(depth, 200.0) - tc) / h) + atan(tc / h)) / h;
  return col * g * k;
}
`;
