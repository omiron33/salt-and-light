// s09's world: "When they speak against you because of Me." A storm at night over the hills. We stand
// on a ridge in tall dry grass thrashing in the wind; dust streams past low over the ground. Below, a
// dark valley; far down in it one tiny lamp burns in a window and holds. Low storm cloud rolls fast
// overhead, lit from inside now and then by distant lightning. At the end the camera tilts up into the
// cloud (the next scene rises through it).
// World: metres, ground heightfield groundH; the ridge at the origin, the valley toward +z.
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const STORM_UNIFORMS = { ...NATURE_UNIFORMS, uFlash: 0, uFlashP: [0, 0, 0] };
export const LAMP_POS = [38.0, 0.0, 430.0];   // y filled from the ground in GLSL

export const STORM_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uFlash;
uniform vec3 uFlashP;
const vec2 WIND = vec2(1.0, 0.25);
const float CB = 45.0, CT = 230.0;   // cloud base and top
const vec3 MOON = normalize(vec3(-0.35, 0.8, 0.5));

float groundH(vec2 xz) {
  float z = xz.y;
  float valley = -110.0 * smoothstep(-5.0, 110.0, z) + 130.0 * smoothstep(650.0, 1400.0, z);
  float h = valley + 30.0 * (fbm(xz * 0.0035 + 1.7, 5) - 0.5) + 10.0 * (fbm(xz * 0.012, 3) - 0.5);
  // the ridge we stand on
  h += 6.0 * exp(-dot(xz, xz) / 900.0);
  return h;
}
vec3 lampP() { vec2 q = vec2(${LAMP_POS[0].toFixed(1)}, ${LAMP_POS[2].toFixed(1)}); return vec3(q.x, groundH(q) + 2.0, q.y); }

float marchGround(vec3 ro, vec3 rd) {
  float t = 0.5;
  for (int i = 0; i < 140; i++) {
    vec3 p = ro + rd * t;
    float d = p.y - groundH(p.xz);
    if (d < 0.002 * t) return t;
    t += max(d * 0.55, 0.02 * t * 0.05 + 0.05);
    if (t > 3000.0 || p.y > CT) break;
  }
  return -1.0;
}
vec3 normGround(vec3 p, float t) {
  float e = max(0.05, 0.003 * t);
  float h = groundH(p.xz);
  return normalize(vec3(h - groundH(p.xz + vec2(e, 0.0)), e, h - groundH(p.xz + vec2(0.0, e))));
}

// the storm cloud: a low churning deck, rolling with the wind
float cloudD(vec3 p) {
  vec3 q = p * 0.0055 + vec3(-WIND.x, 0.0, -WIND.y) * uTime * 0.11;
  float base = smoothstep(CB, CB + 40.0, p.y) * smoothstep(CT, CT - 90.0, p.y);
  float n = fbm(q + vec3(0.0, uTime * 0.04, 0.0), 5);
  float roll = vnoise(q * 0.35 + vec3(uTime * 0.03, 0.0, 0.0));
  float d = (n * 0.8 + roll * 0.45 - 0.5) * 3.6;
  d -= 0.35 * (vnoise(q * 9.0 + vec3(uTime * 0.2, 0.0, 0.0)) - 0.5);
  // the deck's underside hangs in lumps
  d += 0.25 * smoothstep(CB + 50.0, CB, p.y) * (vnoise(q * 2.0) - 0.5);
  return sat(d) * base;
}
vec4 clouds(vec3 ro, vec3 rd, float tmax) {
  // march only through the slab
  float t0, t1;
  if (abs(rd.y) < 1e-3) return vec4(0, 0, 0, 1);
  float ta = (CB - ro.y) / rd.y, tb = (CT - ro.y) / rd.y;
  t0 = max(min(ta, tb), 0.0); t1 = min(max(ta, tb), tmax);
  t1 = min(t1, t0 + 2500.0);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 44;
  float dt = (t1 - t0) / float(N);
  float t = t0 + dt * hash12(gl_FragCoord.xy + uFrame * 7.3);
  vec3 acc = vec3(0); float T = 1.0;
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * t;
    float d = cloudD(p);
    if (d > 0.002) {
      // light: the night sky above (dim), the lightning inside, the lamp from far below (none)
      float up = smoothstep(CB, CT, p.y);
      vec3 amb = vec3(0.035, 0.04, 0.06) * (0.2 + 0.8 * up);
      vec3 fl = uFlashP - p; float f2 = dot(fl, fl);
      float sh = exp(-cloudD(p + normalize(fl) * 40.0) * 3.0 - cloudD(p + normalize(fl) * 100.0) * 3.0);
      vec3 flash = vec3(0.7, 0.75, 1.0) * uFlash * 2.2e5 / (f2 + 4.0e4) * sh;
      // the moon above the deck: light filtering down through it, silvering the thin parts
      float tm = exp(-cloudD(p + MOON * 35.0) * 2.5 - cloudD(p + MOON * 90.0) * 2.5);
      vec3 moon = vec3(0.32, 0.36, 0.48) * tm * (0.4 + 0.6 * up);
      vec3 S = (amb + moon + flash) * d * 0.012;
      float tr = exp(-d * 0.012 * dt);
      acc += T * S * (1.0 - tr) / max(d * 0.012, 1e-5);
      T *= tr;
      if (T < 0.02) break;
    }
    t += dt;
  }
  return vec4(acc, T);
}

// tall dry grass on the ridge, as layers of blades close to the lens, thrashing in the wind
vec4 grassLayers(vec3 ro, vec3 rd, float depth, vec3 light) {
  vec4 acc = vec4(0);
  for (int k = 0; k < 9; k++) {
    float zp = 0.7 + 0.45 * float(k);
    float t = (zp - ro.z) / rd.z;
    if (t <= 0.1 || t > depth) continue;
    vec3 p = ro + rd * t;
    float gy = groundH(p.xz);
    float hgt = p.y - gy;
    if (hgt > 1.2 || hgt < -0.05) continue;
    float cw = 0.05;
    float gust = 0.5 + 0.5 * sin(uTime * 2.3 - p.x * 0.8 + float(k)) * vnoise(vec2(uTime * 1.5 + p.x * 0.3, float(k)));
    float bend = (0.12 + 0.35 * gust) * hgt * hgt;
    float x = p.x - bend + 0.03 * sin(uTime * 9.0 + p.x * 20.0 + float(k)) * hgt;
    float c = floor(x / cw);
    float h = hash12(vec2(c, float(k) * 7.1));
    float bh = 0.45 + 0.65 * h;
    if (hgt > bh) continue;
    float fx = (x - (c + 0.5) * cw) / cw;
    float wdt = 0.14 * (1.0 - hgt / bh) + 0.03;
    float cov = smoothstep(wdt, wdt * 0.4, abs(fx - (h - 0.5) * 0.6));
    // seed heads at the tips
    float head = smoothstep(bh - 0.12, bh - 0.02, hgt) * smoothstep(0.12, 0.05, abs(fx - (h - 0.5) * 0.6));
    cov = max(cov, head);
    if (cov <= 0.0) continue;
    vec3 gc = vec3(0.01, 0.009, 0.008) + light * (1.2 + 1.0 * h) * (0.25 + 0.75 * hgt / bh);
    acc.rgb += (1.0 - acc.a) * cov * gc;
    acc.a += (1.0 - acc.a) * cov;
    if (acc.a > 0.98) break;
  }
  return acc;
}

vec3 storm(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float t = marchGround(ro, rd);
  vec3 L = lampP();
  vec3 lampC = vec3(1.0, 0.55, 0.2) * (0.85 + 0.15 * vnoise(vec2(uTime * 11.0, 1.0)));
  vec3 col; float depth = 5000.0;
  // the flash lights the land too
  vec3 flashSky = vec3(0.6, 0.66, 0.9) * uFlash;
  if (t > 0.0) {
    depth = t;
    vec3 p = ro + rd * t; vec3 n = normGround(p, t);
    vec3 alb = vec3(0.1, 0.095, 0.075) * (0.55 + 0.9 * fbm(p.xz * 0.04, 4)) * mix(0.25, 1.0, smoothstep(10.0, 60.0, t));
    // the sky light and the flash, from above
    // light through the deck: patches of moonlight sliding over the hills with the cloud
    vec3 cp = p + MOON * ((CB + 60.0 - p.y) / MOON.y);
    float gap = exp(-cloudD(cp) * 3.0);
    col = alb * (vec3(0.22, 0.25, 0.34) * (0.4 + 0.6 * n.y) + vec3(1.1, 1.2, 1.5) * gap * sat(dot(n, MOON)) + flashSky * 0.35 * sat(dot(n, normalize(uFlashP - p))));
    // the lamp's small pool of light round the house
    vec3 ld = L - p; float l2 = dot(ld, ld);
    col += alb * lampC * 40.0 / (l2 + 4.0) * sat(dot(n, ld * inversesqrt(l2)));
    // dust and rain haze far off
    float fog = 1.0 - exp(-t * 0.0009);
    col = mix(col, vec3(0.012, 0.014, 0.022) + flashSky * 0.08, fog);
  } else {
    col = vec3(0.01, 0.012, 0.02) + flashSky * 0.06;
  }
  // mist lying in the valley bottom, faintly lit from the sky (and the lamp near it)
  {
    float tm = min(depth, 2500.0);
    float acc = 0.0;
    for (int i = 0; i < 10; i++) {
      float tt = tm * (float(i) + hash12(gl_FragCoord.xy + float(i))) / 10.0;
      vec3 q = ro + rd * tt;
      acc += exp(-max(q.y + 95.0, 0.0) / 14.0) * (0.6 + 0.8 * vnoise(q.xz * 0.01 + vec2(uTime * 0.15, 0.0)));
    }
    float m = 1.0 - exp(-acc / 10.0 * tm * 0.0025);
    vec3 mc = vec3(0.05, 0.058, 0.08) + flashSky * 0.2;
    vec3 Lq = L - ro; float tl = clamp(dot(Lq, rd), 0.0, tm);
    float dl = length(ro + rd * tl - L);
    mc += lampC * 0.6 * exp(-dl / 22.0);
    col = mix(col, mc, m);
  }
  // the clouds over everything they are in front of
  vec4 cl = clouds(ro, rd0, depth);
  col = col * cl.a + cl.rgb;
  // the lamp: a tiny steady point and its halo in the wet air
  vec3 oc = L - ro; float tc = dot(oc, rd);
  if (tc > 0.0 && tc < depth + 3.0) {
    float h = length(oc - rd * tc);
    float px = tc * 0.0007;
    col += lampC * (8.0 * exp(-h * h / (px * px * 2.0)) + 0.25 * exp(-h / (px * 8.0)) + 0.015 * exp(-h / 30.0));
  }
  // dust driven across the ground near us: streaks along the wind
  float dz = 0.0;
  for (int k = 0; k < 5; k++) {
    float zp = 3.0 + 7.0 * float(k);
    float tt = (zp - ro.z) / rd.z;
    if (tt <= 0.0 || tt > depth) continue;
    vec3 p = ro + rd * tt;
    float hgt = p.y - groundH(p.xz);
    vec2 q = vec2(p.x * 0.35 - uTime * 6.0, hgt * 2.2) + float(k) * 3.7;
    dz += smoothstep(0.55, 0.9, fbm(q, 4)) * exp(-max(hgt, 0.0) * 0.5) * 0.12;
  }
  col += dz * (vec3(0.022, 0.022, 0.024) + flashSky * 0.15);
  // the grass in front
  vec3 gl = vec3(0.03, 0.032, 0.04) + flashSky * 0.25;
  vec4 gr = grassLayers(ro, rd, depth, gl);
  col = col * (1.0 - gr.a) + gr.rgb;
  return col;
}
`;
