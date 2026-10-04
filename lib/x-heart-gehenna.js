// The heart (verse 3), s38: Gehenna. From the dark rim of the Valley of Hinnom, looking down and
// along the deep ravine in the cold grey-blue before dawn: on its floor, far below, low refuse fires
// smoulder red, their smoke rising slow and drifting down the valley; the sky is very dark, with a
// faint pale band low in the east. Distant and sober, not lurid. Units: metres; y up; the camera
// stands on the right-hand rim near the origin and looks along -z down the valley.
import { LENS_GLSL } from '/song/lib/x-heart.js';

export const GEHENNA_UNIFORMS = { uFocus: 200.0, uAper: 0.0 };

export const GEHENNA_GLSL = LENS_GLSL + /* glsl */ `
#define NF 24
const vec2 RIMC = vec2(118.0, 52.0);
const float FLOOR = -62.0;
// the valley's axis wanders as it runs away
float axisX(float z) { return -18.0 + 26.0 * sin(z * 0.0042 + 0.4) + 9.0 * sin(z * 0.011 + 1.3) + 10.0 * sin(z * 0.019 + 2.0) * smoothstep(0.0, -120.0, z); }
float halfW(float z) { return 38.0 + 10.0 * sin(z * 0.013 + 1.0) + 0.03 * max(-z, 0.0); }

float terrainH(vec2 xz, int oct) {
  float u = xz.x - axisX(xz.y);
  float au = abs(u), w = halfW(xz.y);
  // steep, ledged walls rising from a narrow floor to a rolling plateau
  // the wall steepens to a cliff at the top: the floor drops away just past the lip
  float wx = sat((au - w) / 60.0);
  float wall = mix(smoothstep(0.0, 1.0, wx) * 0.86, 1.0, smoothstep(0.9, 1.0, wx));
  float h = mix(FLOOR, -2.0, sat(wall));
  // the walls step up in terraces of limestone: flat ledges and short steep risers, the beds wavering
  if (wall > 0.0 && wall < 1.0) {
    const float TH = 6.5;
    float hn = (h - FLOOR) / TH + 0.7 * fbm(xz * 0.018 + 5.0, 2);
    float fi = floor(hn), fr = fract(hn);
    float step_ = fi + smoothstep(0.5, 0.92, fr);
    float ht = FLOOR + (step_ - 0.7 * fbm(xz * 0.018 + 5.0, 2)) * TH;
    float tk = 0.35 * smoothstep(0.0, 0.08, wall) * smoothstep(1.0, 0.85, wall) * smoothstep(0.25, 0.6, fbm(xz * 0.01 + 9.0, 2));
    h = mix(h, ht, tk);
    // broken rock on the faces
    float sl = sat(wall * 4.0) * sat((1.0 - wall) * 4.0);
    // gullies running down the faces (ridged noise across the slope) and broken blocks
    float gul = 1.0 - abs(2.0 * vnoise(vec2(xz.y * 0.05 + 3.0 * fbm(xz * 0.02, 2), u * 0.01)) - 1.0);
    h += (fbm(xz * 0.09 + 1.0, oct) - 0.5) * 6.0 * sl - 5.0 * gul * gul * sl;
  }
  float n = fbm(xz * 0.012, oct);
  float r = fbm(xz * 0.05 + 7.0, max(oct - 2, 1));
  // the rim where we stand is quieter (so the eye height is known), with a lip of rocks
  float nearC = smoothstep(14.0, 70.0, length(xz - RIMC));
  float plate = 1.0 - 0.8 * smoothstep(0.85, 1.0, wall) * smoothstep(0.0, 1.0, u / 100.0);   // our side's plateau is quiet
  h += ((n - 0.5) * 22.0 * smoothstep(w * 0.6, w + 30.0, au) + (r - 0.5) * 6.0 * sat(wall * 2.0)) * nearC * plate;
  if (nearC < 1.0) h += (1.0 - nearC) * (0.25 * fbm(xz * 1.5, 3) - 0.6);
  // the plateau beyond rolls into far hills
  float far = smoothstep(300.0, 1200.0, -xz.y);
  if (far > 0.0) h += 18.0 * far * (fbm(xz * 0.002 + 3.0, 3) - 0.3);
  // the floor: rubble and ash, nearly flat
  if (wall < 0.34) h += (0.8 * (fbm(xz * 0.2, 2) - 0.5) + 2.5 * smoothstep(0.5, 0.85, fbm(xz * 0.06 + 2.0, 3))) * (1.0 - sat(wall * 3.0));
  return h;
}
vec3 fireP0(int i) {
  float fi = float(i);
  float z = 150.0 - 340.0 * hash11(fi * 3.31 + 0.2);
  float u = (hash11(fi * 7.13 + 1.0) * 2.0 - 1.0) * (halfW(z) + 4.0);
  return vec3(axisX(z) + u, FLOOR + 0.4, z);
}
// refuse heaps scattered irregularly over the ravine floor: a few large, many small; most only
// embers under a crust, a few with low flames
vec3 fireP(int i) {
  float fi = float(i);
  float z = 150.0 - 340.0 * hash11(fi * 3.31 + 0.2);
  float u = (hash11(fi * 7.13 + 1.0) * 2.0 - 1.0) * (halfW(z) + 4.0);
  // some lie in loose clusters where carts tipped them
  if (i > 15) { vec3 o = fireP0(i - 9); z = o.z + (hash11(fi) - 0.5) * 18.0; u = o.x - axisX(o.z) + (hash11(fi * 1.7) - 0.5) * 14.0; }
  return vec3(axisX(z) + u, FLOOR + 0.4, z);
}
bool flaming(int i) { return hash11(float(i) * 4.37 + 0.5) > 0.78; }
float fireI(int i) {
  float fi = float(i);
  // each heap smoulders at its own pace; the flaming ones are brighter and livelier
  float base = (0.25 + 0.75 * hash11(fi * 5.7)) * (flaming(i) ? 1.6 : 1.0);
  float f = 0.72 + 0.28 * vnoise(vec2(uTime * (0.5 + 0.6 * hash11(fi)), fi * 17.0)) + (flaming(i) ? 0.2 : 0.06) * vnoise(vec2(uTime * 6.0, fi * 3.0));
  return base * f;
}
float fireR(int i) { float h = hash11(float(i) * 9.1); return 0.7 + 5.5 * h * h; }

float marchT(vec3 ro, vec3 rd) {
  float t = 0.5;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float h = terrainH(p.xz, t < 60.0 ? 5 : t < 200.0 ? 4 : 3);
    float d = p.y - h;
    if (d < 0.002 * t) return t;
    t += max(d * 0.4, 0.02 + 0.002 * t);
    if (t > 2500.0) break;
  }
  return -1.0;
}
vec3 normT(vec3 p, float t) {
  float e = 0.02 + 0.002 * t;
  int o = t < 100.0 ? 6 : 4;
  return normalize(vec3(terrainH(p.xz - vec2(e, 0.0), o) - terrainH(p.xz + vec2(e, 0.0), o), 2.0 * e, terrainH(p.xz - vec2(0.0, e), o) - terrainH(p.xz + vec2(0.0, e), o)));
}

// the sky before dawn: very dark blue-grey, a faint pale band low in the east (to the left here)
const vec3 EAST = normalize(vec3(-0.85, 0.0, -0.53));
vec3 skyG(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(vec3(0.016, 0.022, 0.036), vec3(0.006, 0.009, 0.018), sat(y * 2.2));
  float e = sat(dot(normalize(vec3(rd.x, 0.0, rd.z)), EAST) * 0.5 + 0.5);
  float band = exp(-max(y, 0.0) * 14.0) * pow(e, 3.0);
  c += vec3(0.12, 0.125, 0.13) * band + vec3(0.03, 0.022, 0.018) * exp(-max(y, 0.0) * 40.0) * pow(e, 6.0);
  // the last faint stars
  vec2 sp = rd.xz / max(rd.y, 0.05) * 60.0;
  vec2 cell = floor(sp); vec2 f = fract(sp) - 0.5;
  float st = step(0.985, hash12(cell)) * exp(-dot(f, f) * 160.0) * sat(y * 3.0 - 0.15);
  c += vec3(0.7, 0.75, 0.9) * st * 0.12 * (1.0 - band);
  // a bank of high thin cloud, faintly lit underneath by the band
  float cl = smoothstep(0.45, 0.8, fbm(rd.xz / max(rd.y + 0.08, 0.05) * 0.8 + vec2(uTime * 0.01, 0.0), 4));
  c = mix(c, vec3(0.025, 0.028, 0.036) + vec3(0.03, 0.028, 0.026) * band, cl * 0.7 * sat(y * 6.0));
  return c;
}

// light from the fires at a point (no shadows; they sit low on the floor)
vec3 fireLight(vec3 p, vec3 n) {
  vec3 acc = vec3(0);
  for (int i = 0; i < NF; i++) {
    vec3 L = fireP(i) + vec3(0.0, 1.0, 0.0) - p;
    float d2 = dot(L, L);
    float nl = n.y > -2.0 ? sat(dot(n, L * inversesqrt(d2)) * 0.8 + 0.2) : 1.0;
    acc += fireI(i) * fireR(i) * nl / (4.0 + d2);
  }
  return acc * vec3(1.0, 0.3, 0.07) * 60.0;
}

// smoke: slow plumes rising from each fire, leaning down-valley with the dawn air, and a low pall
float smokeD(vec3 p, out vec3 li) {
  li = vec3(0);
  float hgt = p.y - FLOOR;
  if (hgt < 0.0 || hgt > 75.0) return 0.0;
  float d = 0.0;
  float lsum = 0.0;
  vec3 wind = vec3(0.35, 0.0, -0.6);
  for (int i = 0; i < NF; i++) {
    vec3 f = fireP(i);
    float fi = fireI(i);
    vec3 Lf = f + vec3(0.0, 1.0, 0.0) - p;
    lsum += fi * fireR(i) / (4.0 + dot(Lf, Lf));
    vec2 c = f.xz + wind.xz * hgt * 0.7;
    float r = fireR(i) * 0.6 + hgt * 0.2 + hgt * hgt * 0.004;
    c += 3.0 * vec2(sin(hgt * 0.15 - uTime * 0.3 + float(i)), cos(hgt * 0.12 - uTime * 0.25 + float(i) * 2.0)) * hgt * 0.06;
    vec2 q = p.xz - c;
    float k = dot(q, q) / (r * r);
    if (k < 4.0) d += exp(-k) * fi * (2.2 / (1.0 + hgt * 0.03));
  }
  li = vec3(1.0, 0.3, 0.07) * 60.0 * lsum;
  // the pall: the whole ravine is filled with layered smoke, thick low down, thinning upward in
  // drifting banks, torn by gaps through which the embers show
  float inR = smoothstep(halfW(p.z) + 55.0, halfW(p.z) + 10.0, abs(p.x - axisX(p.z)));
  vec3 dq = p * vec3(0.022, 0.06, 0.022) + vec3(uTime * 0.05, -uTime * 0.03, -uTime * 0.08);
  float bank = fbm(dq + vec3(0.0, 0.6 * sin(p.y * 0.18 + p.x * 0.01), 0.0), 4);
  float strata = 0.6 + 0.4 * sin(hgt * 0.22 + 3.0 * bank);
  float pall = inR * smoothstep(0.32, 0.68, bank) * strata * (exp(-hgt / 24.0) * 1.5 + 0.3);
  // a red underglow over the whole floor where the many small fires light the smoke from beneath
  li += vec3(1.0, 0.28, 0.06) * 0.3 * exp(-hgt / 16.0) * inR * (0.6 + 0.8 * fbm(p.xz * 0.015 + 3.0, 2));
  float n = fbm(p * vec3(0.09, 0.05, 0.09) + vec3(-uTime * 0.1, -uTime * 0.3, uTime * 0.18), 3);
  return d * smoothstep(0.25, 0.7, n + 0.12) * 0.06 + pall * 0.075;
}

// ---------------- the rim in the foreground ----------------
// rocks and dry grass on the lip, a few metres in front of the camera, dark against the glow
const vec3 C0 = vec3(117.5, 3.0, 52.0);
const vec3 DH = vec3(-0.79, 0.0, -0.61);
const vec3 RR = vec3(0.61, 0.0, -0.79);
vec3 fgP(float s, float r, float y) { return C0 + DH * s + RR * r + vec3(0.0, y, 0.0); }
float rockSD(vec3 p, vec3 c, vec3 r, float seed) {
  vec3 q = p - c;
  q.xz = rot(seed * 2.1) * q.xz;
  q.xy = rot((hash11(seed) - 0.5) * 0.5) * q.xy;
  // a weathered limestone block: a box with chipped edges, split by cracks and pitted
  float d = sdBox(q, r * 0.55) - 0.32 * r.y;
  if (d > 0.6) return d;
  float lump = fbm(q * 1.6 / r.y + seed * 3.0, 4);
  d += 0.45 * r.y * (lump - 0.5);
  float crack = abs(vnoise(q.xz * 2.2 + seed * 5.0) - 0.5);
  d += 0.06 * smoothstep(0.05, 0.0, crack);
  d += 0.012 * vnoise(q * 30.0) + 0.02 * smoothstep(0.75, 1.0, sin(q.y * 14.0 + 2.0 * vnoise(q.xz * 2.0)));
  return d * 0.8;
}
float fgSD(vec3 p) {
  float d = rockSD(p, fgP(6.0, -3.0, -4.2), vec3(0.9, 0.6, 0.8), 1.0);
  d = min(d, rockSD(p, fgP(5.0, 2.6, -4.3), vec3(0.6, 0.45, 0.6), 2.0));
  d = min(d, rockSD(p, fgP(7.0, 4.6, -4.4), vec3(1.0, 0.55, 0.8), 3.0));
  d = min(d, rockSD(p, fgP(4.4, -0.8, -4.5), vec3(0.4, 0.3, 0.35), 4.0));
  d = min(d, rockSD(p, fgP(7.5, -6.2, -4.4), vec3(0.9, 0.65, 0.7), 5.0));
  d = min(d, rockSD(p, fgP(5.6, -4.6, -4.6), vec3(0.35, 0.25, 0.3), 6.0));
  // the lip itself: broken ground running across the bottom of the frame and ending in a ragged edge
  vec3 q = p - C0;
  float along = dot(q, DH), across = dot(q, RR);
  float edge = 7.2 + 1.6 * (fbm(vec2(across * 0.35, 1.0), 3) - 0.5) + 0.5 * vnoise(vec2(across * 2.0, 3.0));
  float top = -4.9 + 0.35 * fbm(vec2(across, along) * 0.8, 3) + 0.06 * vnoise(vec2(across, along) * 8.0);
  float lip = max(q.y - top, along - edge) ;
  lip = max(lip, -(q.y + 9.0));
  d = min(d, lip * 0.7);
  return d;
}
float marchFG(vec3 ro, vec3 rd) {
  float t = 1.0;
  for (int i = 0; i < 70; i++) {
    float d = fgSD(ro + rd * t);
    if (d < 0.001 * t) return t;
    t += d * 0.8;
    if (t > 16.0) break;
  }
  return -1.0;
}
vec3 normFG(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.004;
  return normalize(e.xyy * fgSD(p + e.xyy) + e.yyx * fgSD(p + e.yyx) + e.yxy * fgSD(p + e.yxy) + e.xxx * fgSD(p + e.xxx));
}
// dry grass: blades cut out of vertical planes across the view, swaying in the dawn air
float grassA(vec3 ro, vec3 rd, float s, float base, float seed, out float tz) {
  vec3 pc = C0 + DH * s;
  float dn = dot(rd, DH);
  tz = dot(pc - ro, DH) / dn;
  if (tz < 0.0) return 0.0;
  vec3 q = ro + rd * tz - pc;
  float x = dot(q, RR), y = q.y + pc.y - base;
  if (y < -0.2 || y > 1.3) return 0.0;
  float a = 0.0;
  for (int k = 0; k < 2; k++) {
    float xs = x * (14.0 + 8.0 * float(k)) + seed * 13.0 + float(k) * 7.0;
    float ci = floor(xs);
    for (int j = -1; j <= 1; j++) {
      float id = ci + float(j);
      float h = 0.45 + 0.8 * pow(hash11(id * 1.7 + seed), 1.5);
      // clumps: blades only where a slow noise says grass grows
      h *= smoothstep(0.25, 0.5, vnoise(vec2(id * 0.05 + seed, seed)));
      float yy = y / max(h, 0.01);
      if (yy < 0.0 || yy > 1.0) continue;
      float lean = (hash11(id * 3.1 + seed) - 0.5) * 1.2 + 0.25 * sin(uTime * 1.3 + id * 0.7) * yy;
      float cx = id + 0.5 + (hash11(id * 5.3) - 0.5) * 0.6 + lean * yy * yy * 3.0;
      float w = 0.2 * (1.0 - yy) + 0.03;
      a = max(a, smoothstep(w, w * 0.6, abs(xs - cx)));
    }
  }
  return a;
}

vec3 gehenna(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float t = marchT(ro, rd);
  vec3 col;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normT(p, t);
    float wall = sat(abs(p.x - axisX(p.z)) / (halfW(p.z) + 70.0));
    // limestone and dry earth, ash grey on the floor; scrub dark on the plateau
    float rk = fbm(p.xz * 0.15, 3);
    vec3 alb = mix(vec3(0.22, 0.2, 0.18), vec3(0.3, 0.27, 0.22), rk);
    alb = mix(alb, vec3(0.12, 0.11, 0.1), smoothstep(0.3, 0.0, wall));          // ash
    alb = mix(alb, vec3(0.08, 0.08, 0.06), smoothstep(0.55, 0.65, fbm(p.xz * 0.08 + 2.0, 3)) * smoothstep(0.7, 0.95, wall));
    // the sky's cold light from above, a little more from the east
    vec3 amb = vec3(0.2, 0.25, 0.36) * (0.3 + 0.7 * sat(n.y)) + vec3(0.32, 0.32, 0.32) * pow(sat(dot(n, EAST) * 0.7 + 0.3), 2.0);
    // strata in the limestone walls
    float bed = p.y * 0.95 + 4.0 * fbm(p.xz * 0.012, 3);
    alb *= 0.8 + 0.3 * (sin(bed) * 0.5 + 0.5) * smoothstep(0.08, 0.3, wall);
    alb = mix(alb, alb * vec3(1.15, 1.05, 0.9), smoothstep(0.6, 0.9, sin(bed * 0.37 + 1.0)) * smoothstep(0.08, 0.3, wall));
    // risers are bare pale rock, ledges carry dark scrub and scree
    float riser = smoothstep(0.55, 0.3, n.y);
    alb = mix(alb * vec3(0.7, 0.68, 0.62), alb * 1.1, riser);
    col = alb * (amb + fireLight(p, n));
    // the embers themselves: dull red cores with a dark crust that breathes
    for (int i = 0; i < NF; i++) {
      vec3 f = fireP(i);
      vec2 q = p.xz - f.xz;
      float r = fireR(i);
      float k = length(q) / r;
      if (k < 1.3) {
        float crust = fbm(q * 1.4 + float(i) * 7.0, 3);
        float ang = atan(q.y, q.x);
        k /= 0.75 + 0.5 * vnoise(vec2(ang * 1.6 + float(i) * 5.0, float(i)));
        float glow = smoothstep(1.2, 0.2, k) * smoothstep(0.3, 0.6, crust + 0.25 * vnoise(vec2(uTime * 0.8, float(i))));
        col += vec3(1.0, 0.22, 0.04) * glow * fireI(i) * 1.6 + vec3(1.0, 0.5, 0.15) * glow * glow * fireI(i) * 0.8 * smoothstep(0.5, 0.0, k);
      }
    }
    // the cold haze of distance
    float fog = 1.0 - exp(-t * 0.0011);
    col = mix(col, skyG(normalize(vec3(rd.x, 0.02, rd.z))) * 0.9, fog);
  } else {
    col = skyG(rd);
    t = 3000.0;
  }
  // march the smoke between the eye and the ground, lit red from below and cold from the sky
  {
    float t0 = 15.0, t1 = min(t, 700.0);
    // only where the ray is inside the smoke's height band
    if (rd.y < 0.0) {
      float tb = (FLOOR + 75.0 - ro.y) / rd.y;
      t0 = max(t0, tb);
    }
    if (t1 > t0) {
      const int NS = 30;
      float dt = (t1 - t0) / float(NS);
      float jit = hash12(fc + fract(uTime * 3.7) * 31.0);
      float T = 1.0; vec3 S = vec3(0);
      for (int i = 0; i < NS; i++) {
        vec3 p = ro + rd * (t0 + (float(i) + jit) * dt);
        vec3 fl;
        float d = smokeD(p, fl);
        if (d < 1e-4) continue;
        vec3 li = fl * 0.3 + vec3(0.075, 0.08, 0.1) * smoothstep(5.0, 40.0, p.y - FLOOR);
        float ext = d * dt * 2.6;
        S += T * li * vec3(0.55, 0.5, 0.48) * (1.0 - exp(-ext));
        T *= exp(-ext);
      }
      col = col * T + S;
    }
  }
  // low flames licking over the burning heaps (seen through nothing but the air)
  for (int i = 0; i < NF; i++) {
    if (!flaming(i)) continue;
    vec3 f = fireP(i);
    float H = fireR(i) * (0.5 + 0.35 * vnoise(vec2(uTime * 3.0, float(i) * 5.0)));
    vec3 a = f, b = f + vec3(0.6 * sin(uTime * 1.3 + float(i)), H, 0.0);
    // closest approach of the ray to the flame's axis
    vec3 ba = b - a, oa = ro - a;
    float bb = dot(ba, ba), bd = dot(ba, rd), od = dot(oa, rd), ob = dot(oa, ba);
    float den = bb - bd * bd;
    float s = sat((ob - bd * od) / max(den, 1e-6) * 1.0);
    s = sat((bd * od - ob) / -max(den, 1e-6));
    vec3 pa = a + ba * s;
    float tr = dot(pa - ro, rd);
    if (tr < 0.0 || tr > t + 3.0) continue;
    float dist = length(ro + rd * tr - pa);
    float w = fireR(i) * 0.14 * (1.0 - 0.6 * s) * (0.8 + 0.4 * vnoise(vec2(s * 6.0 - uTime * 4.0, float(i))));
    float g = exp(-dist * dist / (w * w)) * pow(1.0 - s, 1.5);
    col += vec3(1.0, 0.4, 0.1) * g * fireI(i) * 0.45;
  }
  // the foreground: rocks and grass, dark, rimmed faintly by the glow below and the cold sky
  float tf = marchFG(ro, rd);
  if (tf > 0.0) {
    vec3 p = ro + rd * tf, n = normFG(p);
    vec3 alb = vec3(0.3, 0.28, 0.25) * (0.5 + 0.7 * fbm(p.xz * 3.0 + p.y * 2.0, 3)) * (0.8 + 0.3 * vnoise(p.xz * 40.0 + p.y * 30.0));
    alb = mix(alb, vec3(0.12, 0.13, 0.1), smoothstep(0.55, 0.75, fbm(p.xy * 5.0, 3)) * 0.6);   // lichen
    vec3 glowDir = normalize(vec3(-0.5, -0.35, -0.8));
    vec3 c = alb * (vec3(0.05, 0.065, 0.1) * (0.4 + 0.6 * sat(n.y)) + vec3(0.07, 0.07, 0.075) * sat(dot(n, EAST) * 0.7 + 0.3) * 0.6);
    c += alb * vec3(0.5, 0.13, 0.035) * sat(dot(n, glowDir)) * 0.6;
    c += vec3(0.35, 0.1, 0.03) * pow(1.0 - sat(dot(n, -rd)), 3.0) * sat(dot(n, glowDir) + 0.4) * 0.35;
    col = c;
  }
  for (int k = 0; k < 2; k++) {
    float tz;
    float s = k == 0 ? 7.6 : 7.0;
    float a = grassA(ro, rd, s, -2.05, float(k) * 3.7 + 1.0, tz);
    if (a > 0.0 && (tf < 0.0 || tz < tf)) {
      vec3 gc = vec3(0.022, 0.02, 0.018);
      col = mix(col, gc, a);
    }
  }
  return col;
}
`;
