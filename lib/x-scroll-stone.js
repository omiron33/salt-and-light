// s23's world: a stone field at night under a cold, moving sky. One rough limestone block lies in cold
// moonlight: sharp broken facets, pitted, flecked with lichen, a crisp rim of light along its far
// edges and a long dark stain of shadow beside it. Round it: dry grass that stirs in the wind, gravel
// and small stones in focus; beyond, a few larger stones falling away into low drifting mist.
// Cut into the block's flat top is one small mark, the same yod the scroll's macro held (the same
// glyph from the same font is the carving's depth map), so the film cuts from the ink to the stone on
// the shape, then pulls back to reveal the field.
// World: ground near y = 0, the stone at the origin, the moon low behind it and to the right of the
// final view, so its shadow runs toward the camera's left. Everything is a pure function of uTime.
export const STONE_UNIFORMS = { uFocus: 1.0, uAper: 0.0 };
// the carving: centre on the stone's top face and its size (metres)
export const CARVE = { c: [0.02, 0.305, -0.07], w: 0.06 };

export const STONE_GLSL = /* glsl */ `
uniform sampler2D uYodTex;
uniform float uFocus, uAper;
const vec3 KEY = normalize(vec3(-0.9, 0.42, 0.14));     // toward the moon: behind the stone, right of the final view
const vec3 KEYC = vec3(0.6, 0.72, 1.0) * 1.7;
const vec3 CC = vec3(${CARVE.c.join(', ')});
const float CW = ${CARVE.w.toFixed(3)};

// ---------------- the ground ----------------
float baseH(vec2 xz) {
  float h = 0.3 * (fbm(xz * 0.12, 3) - 0.5) + 0.035 * (fbm(xz * 1.4, 2) - 0.5);
  // a low rise far off, so the field has a horizon line
  if (xz.y > 14.0) h += 2.2 * smoothstep(14.0, 40.0, xz.y) * fbm(xz * 0.03 + 3.0, 3);
  return h;
}
// pebbles: one per cell, a low dome; two sizes
float pebbles(vec2 xz, float cell, float rmin, float rmax) {
  vec2 g = floor(xz / cell), f = xz / cell - g;
  vec3 h = hash33(vec3(g, cell * 31.0));
  float r = mix(rmin, rmax, h.z * h.z) / cell;
  vec2 c = 0.5 + (h.xy - 0.5) * max(0.0, 1.0 - 2.0 * r);
  vec2 dv = (f - c) * vec2(1.0, 1.0 + 0.5 * h.x);
  float x = sat(1.0 - dot(dv, dv) / (r * r));
  if (h.y < 0.4) return 0.0;                                    // not every cell holds a stone
  return pow(x, 0.6) * r * cell * (0.22 + 0.3 * (h.y - 0.4));
}
float groundHB(vec2 xz, float lod, float h) {
  if (lod < 7.0) {
    float k = smoothstep(7.0, 4.0, lod);
    h += k * (pebbles(xz, 0.11, 0.012, 0.045) + pebbles(xz + 0.37, 0.035, 0.004, 0.015));
  }
  return h;
}
float groundH(vec2 xz, float lod) { return groundHB(xz, lod, baseH(xz)); }

// ---------------- dry grass ----------------
// tufts in some cells; each blade two tapered segments, bending and stirring with the wind
float grassSD(vec3 p, float gy0, out float shadeK) {
  shadeK = 0.0;
  if (p.y > 0.45) return p.y - 0.4;
  const float CS = 0.32;
  vec2 g = floor(p.xz / CS);
  vec3 h = hash33(vec3(g, 5.3));
  if (h.z < 0.58) return 1e9;
  vec2 c = (g + 0.25 + 0.5 * h.xy) * CS;
  if (length(c) < 0.62) return 1e9;                      // nothing grows hard against the block
  float gy = gy0;
  if (p.y - gy > 0.32) return p.y - gy - 0.3;
  float d = 1e9;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 r = hash33(vec3(g * 7.1, fi));
    vec3 b = vec3(c.x + (r.x - 0.5) * 0.07, gy - 0.01, c.y + (r.y - 0.5) * 0.07);
    float ht = 0.06 + 0.16 * r.z * r.z;
    float a = 6.2831 * hash11(fi * 3.7 + h.x * 9.0);
    vec2 dir = vec2(cos(a), sin(a));
    float lean = 0.25 + 0.55 * hash11(fi * 1.3 + h.y * 4.0);
    float w = 0.035 * sin(uTime * 1.25 + c.x * 1.7 + c.y * 0.9 + fi * 0.6) + 0.015 * sin(uTime * 2.7 + fi * 1.9 + c.y);
    vec2 sway = vec2(0.8, 0.35) * w;
    vec3 m = vec3(b.x + dir.x * lean * ht * 0.25 + sway.x * 0.3, b.y + ht * 0.55, b.z + dir.y * lean * ht * 0.25 + sway.y * 0.3);
    vec3 tp = vec3(b.x + dir.x * lean * ht + sway.x, b.y + ht * (1.0 - 0.35 * lean), b.z + dir.y * lean * ht + sway.y);
    float s1 = sdCapsule(p, b, m, 0.0016);
    float s2 = sdCapsule(p, m, tp, 0.0009);
    float s = min(s1, s2);
    if (s < d) { d = s; shadeK = r.z; }
  }
  return d;
}

// ---------------- stones ----------------
float carveMask(vec3 p, float lod) {
  // the glyph's up is away from the opening view (+z), as on the page; screen right is -x
  vec2 uv = vec2(CC.x - p.x, p.z - CC.z) / CW + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return textureLod(uYodTex, uv, lod).r;
}
vec3 stoneQ(vec3 p) { vec3 q = p - vec3(0.0, 0.03, 0.0); q.xz = mat2(0.9, -0.44, 0.44, 0.9) * q.xz; return q; }
float stoneSD(vec3 p) {
  vec3 q = stoneQ(p);
  float d = sdEllipsoid(q, vec3(0.52, 0.4, 0.4));
  if (d > 0.1) return d;
  // broken faces, sharp where they meet
  const float K = 0.03;
  d = smax(d, q.y - 0.27, K);
  d = smax(d, dot(q, normalize(vec3(0.8, 0.3, -0.2))) - 0.36, K);
  d = smax(d, dot(q, normalize(vec3(-0.7, 0.35, -0.6))) - 0.33, K);
  d = smax(d, dot(q, normalize(vec3(-0.5, 0.2, 0.8))) - 0.33, K);
  d = smax(d, dot(q, normalize(vec3(0.3, 0.45, 0.85))) - 0.34, K);
  d = smax(d, dot(q, normalize(vec3(0.9, -0.1, 0.45))) - 0.41, K);
  d = smax(d, dot(q, normalize(vec3(-0.95, 0.05, 0.1))) - 0.43, K);
  d = smax(d, dot(q, normalize(vec3(0.1, 0.2, -1.0))) - 0.33, K);
  d = smax(d, dot(q, normalize(vec3(0.55, 0.6, -0.55))) - 0.31, K);
  d = smax(d, dot(q, normalize(vec3(-0.45, 0.7, 0.4))) - 0.33, K);
  d = smax(d, dot(q, normalize(vec3(-0.6, -0.1, -0.8))) - 0.36, K);
  d = smax(d, dot(q, normalize(vec3(-0.75, 0.55, -0.35))) - 0.35, K);
  d = smax(d, dot(q, normalize(vec3(0.2, -0.05, -1.0))) - 0.36 + 0.03 * sin(q.x * 9.0), K);
  if (d < 0.09) {
    float flatF = smoothstep(0.03, 0.0, abs(p.y - CC.y + 0.004)) * smoothstep(0.17, 0.09, length(p.xz - CC.xz));
    d += (0.07 * (fbm(p * 2.2, 2) - 0.5) + 0.008 * (fbm(p * 11.0, 2) - 0.5)) * (1.0 - 0.8 * flatF);
  }
  return d;
}
// larger stones out in the field, falling into the haze
const int NB = 6;
vec4 boulder(int i) {
  if (i == 0) return vec4(-2.6, 0.0, 5.5, 0.3);
  if (i == 1) return vec4(2.9, 0.0, 7.8, 0.42);
  if (i == 2) return vec4(-5.5, 0.0, 12.0, 0.6);
  if (i == 3) return vec4(0.6, 0.0, 15.5, 0.55);
  if (i == 4) return vec4(7.5, 0.0, 19.0, 0.8);
  return vec4(-2.5, 0.0, 24.0, 1.0);
}
float bouldersSD(vec3 p) {
  float d = 1e9;
  for (int i = 0; i < NB; i++) {
    vec4 b = boulder(i);
    float hd = length(p.xz - b.xz) - b.w * 1.4;
    if (hd > 0.05) { d = min(d, max(hd, p.y - b.w * 1.5 - 0.3)); continue; }
    vec3 q = p - vec3(b.x, baseH(b.xz) + b.w * 0.25, b.z);
    float r = b.w;
    float e = sdEllipsoid(q, vec3(r * 1.25, r * 0.75, r));
    if (e > 0.3) { d = min(d, e); continue; }
    {
      float fi = float(i);
      vec3 a1 = normalize(vec3(hash11(fi) - 0.5, 0.6, hash11(fi + 3.0) - 0.8));
      vec3 a2 = normalize(vec3(hash11(fi + 5.0) - 0.2, 0.3, hash11(fi + 7.0) - 0.5));
      e = smax(e, dot(q, a1) - r * 0.55, 0.02 * r);
      e = smax(e, dot(q, a2) - r * 0.7, 0.02 * r);
      e = smax(e, dot(q, normalize(vec3(a2.z, 0.2, -a1.x))) - r * 0.75, 0.02 * r);
      e += 0.12 * r * (fbm(q * 2.5 / r + fi, 3) - 0.5);
    }
    d = min(d, e);
  }
  return d;
}

float mapF(vec3 p, out int id) {
  float lod = length(p - uCamPos);
  float s = stoneSD(p);
  float bh = baseH(p.xz);
  float gh = p.y - groundHB(p.xz, lod, bh);
  float g = max(gh * 0.6, (gh - 0.03) * 0.95);   // steep only in the last few centimetres (pebbles)
  id = 1; float d = g;
  if (s < d) { id = 2; d = s; }
  if (p.z > 4.0) { float b = bouldersSD(p); if (b < d) { id = 3; d = b; } }
  if (lod < 9.0 && p.y - bh < 0.32) { float k; float gr = grassSD(p, bh, k); if (gr < d) { id = 4; d = gr; } }
  return d;
}
float mapFD(vec3 p) { int i; return mapF(p, i); }
vec3 normF(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * mapFD(p + k.xyy * e) + k.yyx * mapFD(p + k.yyx * e) + k.yxy * mapFD(p + k.yxy * e) + k.xxx * mapFD(p + k.xxx * e));
}
float marchF(vec3 ro, vec3 rd, out int id) {
  float t = 0.0, d = 1.0;
  for (int i = 0; i < 170; i++) {
    vec3 p = ro + rd * t;
    d = mapF(p, id);
    if (abs(d) < 0.00006 + 0.0006 * t) return t;
    t += d * 0.85 + t * 0.0015;
    if (t > 120.0 || p.y > 3.5 && rd.y > 0.0) { id = 0; return -1.0; }
  }
  // out of steps while creeping along a surface: that is a hit
  if (abs(d) < 0.004 + 0.004 * t) return t;
  id = 0; return -1.0;
}
float shadowF(vec3 p, vec3 L) {
  float res = 1.0, t = 0.015;
  for (int i = 0; i < 26; i++) {
    vec3 q = p + L * t;
    float d = min(stoneSD(q), (q.y - groundH(q.xz, 8.0)) * 0.6);
    if (t < 0.5) { float k; d = min(d, grassSD(q, baseH(q.xz), k) + 0.001); }
    res = min(res, 8.0 * d / t);
    t += clamp(d * 0.85, 0.01, 0.3);
    if (res < 0.01 || t > 5.0) break;
  }
  return sat(res);
}
float aoF(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 3; i++) { float h = 0.03 * float(i * i); o += w * (h - mapFD(p + n * h)); w *= 0.6; }
  return sat(1.0 - 2.5 * o);
}

// ---------------- the sky ----------------
const vec3 MOON = normalize(vec3(-0.62, 0.36, 0.7));   // the moon itself, hidden behind cloud
float cloudD(vec3 rd) {
  vec2 uv = rd.xz / (rd.y + 0.07);
  vec2 drift = vec2(uTime * 0.035, uTime * 0.012);
  float c = fbm(uv * vec2(0.22, 0.6) + drift, 5);
  float c2 = fbm(uv * 1.3 + drift * 1.8 + 5.0, 3);
  return smoothstep(0.38, 0.75, c * 0.85 + c2 * 0.3) * smoothstep(0.0, 0.1, rd.y);
}
vec3 skyF(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 top = vec3(0.006, 0.009, 0.02), hor = vec3(0.045, 0.055, 0.08);
  vec3 c = mix(hor, top, pow(sat(y * 2.4), 0.6));
  float ang = acos(clamp(dot(rd, MOON), -1.0, 1.0));
  float dens = cloudD(rd);
  float glow = exp(-ang / 0.06) * 1.2 + exp(-ang / 0.3) * 0.14;
  vec3 moonC = vec3(0.6, 0.7, 0.95);
  c += moonC * glow * (1.0 - 0.75 * dens);
  // the clouds: dark undersides, silvered at their thin edges near the moon
  float edge = dens * (1.0 - dens) * 4.0;
  vec3 cloudC = vec3(0.018, 0.022, 0.035) + moonC * (exp(-ang / 0.25) * (0.15 + 0.5 * edge) + 0.02);
  c = mix(c, cloudC, dens * 0.9);
  return c;
}

// low mist drifting over the field: a few samples along the ray
vec4 mistF(vec3 ro, vec3 rd, float tmax) {
  float T = 1.0; vec3 L = vec3(0);
  float tm = min(tmax, 40.0);
  for (int k = 0; k < 5; k++) {
    float s = tm * (float(k) + 0.5 + 0.5 * hash12(gl_FragCoord.xy + float(k) + uJitter * 31.0)) / 5.0;
    vec3 p = ro + rd * s;
    float hgt = p.y + 0.08;
    float n = fbm(vec3(p.x * 0.35 - uTime * 0.18, hgt * 1.5, p.z * 0.35 + uTime * 0.05), 3);
    float dens = exp(-max(hgt, 0.0) / 0.45) * smoothstep(0.35, 0.75, n) * 0.22 + 0.006;
    float a = 1.0 - exp(-dens * tm / 5.0);
    vec3 lc = vec3(0.07, 0.085, 0.12) + KEYC * 0.012 * (1.0 + 2.0 * pow(sat(dot(rd, MOON)), 6.0));
    L += T * a * lc;
    T *= 1.0 - a;
  }
  return vec4(L, T);
}

vec3 stoneField(vec2 fc) {
  vec3 ro; vec3 rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  vec3 rd = normalize(fp - ro);

  int id;
  float t = marchF(ro, rd, id);
  vec3 col;
  float tm = t > 0.0 ? t : 60.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    vec3 n = normF(p, (id == 2 ? 0.0012 : 0.00015) + 0.0008 * t);
    vec3 alb; float rough = 0.85, spec = 0.0;
    float cav = 1.0, carveEdge = 0.0;
    if (id == 2) {
      // limestone: pale grey, pitted, flecked with crustose lichen
      alb = vec3(0.36, 0.345, 0.31) * (0.85 + 0.25 * fbm(p * 6.0, 3));
      // pits: small dark hollows at two scales (in the shading: normal and cavity)
      float e = 0.002;
      e = 0.001;
      float pk = 0.35 + 0.65 * smoothstep(0.3, 0.6, fbm(p * 4.0 + 2.0, 2));                 // pitting comes in patches
      float p0 = (smoothstep(0.66, 0.82, vnoise(p * 110.0)) + 0.7 * smoothstep(0.68, 0.86, vnoise(p * 300.0 + 3.0))) * pk;
      vec3 gp = vec3(vnoise((p + vec3(e, 0, 0)) * 110.0), vnoise((p + vec3(0, e, 0)) * 110.0), vnoise((p + vec3(0, 0, e)) * 110.0)) - vnoise(p * 110.0);
      n = normalize(n + gp / e * 0.0022 * pk);
      // weathering: darker streaks run down the faces, grime in the hollows
      alb *= 0.75 + 0.35 * fbm(vec3(p.x * 9.0, p.y * 1.5, p.z * 9.0), 3);
      cav = 1.0 - 0.5 * sat(p0);
      // fine grain
      alb *= 0.85 + 0.3 * fbm(p * 120.0, 2);
      float glint = 0.0;
      // seen close: crystalline grain, small pits and old tool marks
      if (t < 1.0) {
        float gk = smoothstep(1.0, 0.35, t);
        vec3 pr = mat3(0.8, 0.36, -0.48, -0.6, 0.48, -0.64, 0.0, 0.8, 0.6) * p;   // rotated, so no lattice shows
        // crystals: grains about half a millimetre, each its own tone, a few catching the light
        vec3 cid = floor(pr * 2200.0 + 0.6 * vnoise(pr * 700.0));
        float hc = hash13(cid);
        alb *= 1.0 + gk * (0.32 * (hc - 0.5) + 0.12 * (hash13(floor(pr * 5200.0)) - 0.5));
        glint = gk * smoothstep(0.93, 0.99, hc);
        // small pits: sharp-edged dark hollows
        float pit = smoothstep(0.74, 0.78, vnoise(pr * 520.0 + 4.0)) * (0.5 + 0.5 * smoothstep(0.4, 0.6, fbm(p * 30.0, 2)));
        float e3 = 0.00025;
        vec3 gpit = vec3(vnoise((pr + vec3(e3, 0, 0)) * 520.0 + 4.0), vnoise((pr + vec3(0, e3, 0)) * 520.0 + 4.0), vnoise((pr + vec3(0, 0, e3)) * 520.0 + 4.0)) - vnoise(pr * 520.0 + 4.0);
        n = normalize(n + gk * (gpit / e3) * 0.0011 * smoothstep(0.7, 0.78, vnoise(pr * 520.0 + 4.0)));
        alb *= 1.0 - 0.55 * pit * gk;
        cav *= 1.0 - 0.4 * pit * gk;
        // chisel marks dressing the top face round the cut: fine parallel strokes in short runs
        if (abs(p.y - CC.y) < 0.03) {
          vec2 dirT = normalize(vec2(0.82, 0.57));
          float run = smoothstep(0.35, 0.6, fbm(p.xz * 40.0 + 3.0, 2));
          float ph = dot(p.xz, dirT) / 0.0022 + 0.5 * vnoise(p.xz * 120.0);
          float tool = cos(6.2831 * ph);
          vec2 tg = -sin(6.2831 * ph) * 6.2831 / 0.0022 * dirT;
          n = normalize(n - vec3(tg.x, 0.0, tg.y) * 0.00004 * run * gk);
          alb *= 1.0 - 0.06 * run * gk * (0.5 + 0.5 * tool);
        }
      }
      // lichen: small speckled colonies (crusts made of many dots), grey-green and ochre, and dark spots
      vec3 pl = p * 1.0;
      float colony = smoothstep(0.47, 0.62, fbm(pl * 14.0 + 11.0, 3));
      float dots = smoothstep(0.62, 0.72, vnoise(pl * 420.0)) + smoothstep(0.7, 0.78, vnoise(pl * 170.0 + 5.0));
      float lich = sat(colony * (0.35 + dots) * (0.6 + 0.6 * smoothstep(0.6, 0.66, fbm(pl * 14.0 + 11.0, 3))));
      alb = mix(alb, vec3(0.62, 0.66, 0.52) * (0.85 + 0.3 * vnoise(pl * 300.0)), sat(lich) * 0.8);
      float colY = smoothstep(0.58, 0.68, fbm(pl * 18.0 + 31.0, 3)) * smoothstep(0.1, 0.3, n.y);
      float lichY = colY * sat(smoothstep(0.6, 0.7, vnoise(pl * 380.0 + 9.0)) + 0.3 * colY);
      alb = mix(alb, vec3(0.6, 0.5, 0.22), sat(lichY) * 0.75);
      float lich2 = smoothstep(0.8, 0.86, vnoise(p * 160.0 + 7.0)) * smoothstep(0.45, 0.6, fbm(p * 3.0, 2));
      alb = mix(alb, vec3(0.08, 0.08, 0.07), lich2 * 0.7);
      // the cut: a crisp groove; its walls tilt the normal hard, so the edge facing the moon catches a
      // bright line and the far wall falls into shadow; old grime darkens its floor
      if (abs(p.y - CC.y) < 0.05) {
        float ee = 0.0003;
        float m0 = carveMask(p, 0.6);
        vec2 gm = vec2(carveMask(p + vec3(ee, 0, 0), 0.6) - m0, carveMask(p + vec3(0, 0, ee), 0.6) - m0) / ee;
        n = normalize(n + vec3(gm.x, 0.0, gm.y) * 0.0035);
        float cut = smoothstep(0.35, 0.65, carveMask(p, 0.0));
        alb = mix(alb, vec3(0.07, 0.068, 0.065) * (0.8 + 0.4 * hash13(floor(p * 3000.0))), cut * 0.85);
        cav *= 1.0 - 0.4 * cut;
        carveEdge = sat(length(gm) * 0.004) * (1.0 - cut * 0.5);
      }
      spec = 0.03 + 0.5 * glint;
      rough = mix(0.7, 0.25, glint);
    } else if (id == 3) {
      alb = vec3(0.3, 0.29, 0.27) * (0.7 + 0.5 * fbm(p * 5.0, 3));
    } else if (id == 4) {
      // dry grass, pale straw gone grey in the moonlight
      float k; grassSD(p, baseH(p.xz), k);
      alb = mix(vec3(0.13, 0.12, 0.085), vec3(0.24, 0.21, 0.15), k);
      rough = 0.6;
    } else {
      // earth, gravel and small stones
      float lod = t;
      float peb = pebbles(p.xz, 0.11, 0.012, 0.045) + pebbles(p.xz + 0.37, 0.035, 0.004, 0.015);
      vec3 earth = vec3(0.1, 0.092, 0.08) * (0.6 + 0.6 * fbm(p.xz * 3.0, 3));
      vec3 pebC = vec3(0.26, 0.25, 0.23) * (0.6 + 0.6 * hash12(floor(p.xz / 0.035)));
      alb = mix(earth, pebC, smoothstep(0.0, 0.002, peb) * smoothstep(7.0, 3.0, lod));
      // a scatter of dead grass litter on the earth
      alb = mix(alb, vec3(0.22, 0.2, 0.15), smoothstep(0.7, 0.85, vnoise(p.xz * vec2(90.0, 25.0))) * 0.5);
      // the dark stain beside the stone: damp earth where its shadow lies
      vec2 sd = normalize(-KEY.xz);
      float along = clamp(dot(p.xz, sd), 0.0, 1.4);
      float stain = exp(-pow(length(p.xz - sd * along) / (0.4 - 0.1 * along / 1.4), 2.0)) * smoothstep(1.5, 0.4, along);
      alb *= 1.0 - 0.5 * stain * (0.7 + 0.3 * fbm(p.xz * 6.0, 3));
      cav = 0.75 + 0.25 * smoothstep(0.0, 0.004, peb);
    }
    float sh = shadowF(p + n * 0.004, KEY);
    float nl = sat(dot(n, KEY));
    // the light can only reach faces that turn to it at the scale of the stone (no lit bumps on the dark side)
    vec3 n0 = id == 2 ? normF(p, 0.02) : n;
    if (id == 2) nl *= smoothstep(-0.02, 0.2, dot(n0, KEY));
    float ao = (id == 2 ? max(aoF(p, n0), 0.4) : aoF(p, n)) * cav;
    vec3 skyAmb = vec3(0.045, 0.058, 0.095) * (0.55 + 0.45 * n.y);
    // moonlight bounced off the field onto faces turned down and away
    skyAmb += vec3(0.02, 0.022, 0.028) * sat(-n.y * 0.5 + 0.5) * (id == 2 ? 1.0 : 0.3);
    if (id == 2) skyAmb *= 2.6;
    col = alb * (KEYC * nl * sh * mix(1.0, cav, 0.5) + skyAmb * ao * 1.4);
    // grass blades let the moon through (thin, back-lit)
    if (id == 4) col += alb * KEYC * 0.2 * pow(sat(dot(rd, KEY)), 2.0) * sh;
    // a crisp cold rim where an edge turns to the moon behind
    float rim = pow(1.0 - sat(dot(n, -rd)), 3.0) * sat(dot(n, KEY) + 0.15);
    col += KEYC * rim * sh * (id == 2 ? 0.16 : id == 3 ? 0.06 : 0.03) * alb * 4.0;
    vec3 h = normalize(KEY - rd);
    col += KEYC * sh * nl * pow(sat(dot(n, h)), 30.0) * spec * 6.0;
    // the lip of the cut, lit by the moon
    col += KEYC * sh * carveEdge * sat(dot(n, KEY) + 0.2) * 0.12;
  } else {
    col = skyF(rd);
  }
  // mist and distance haze
  vec4 m = mistF(ro, rd, tm);
  col = col * m.a + m.rgb;
  return col;
}
`;
