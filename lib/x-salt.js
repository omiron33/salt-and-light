// The salt: the film's signature material. Halite grains are small clear cubes (slightly flattened,
// with rounded edges and stepped "hopper" faces), lying on their faces at random yaw with a little
// tilt. Each grain is traced analytically as a real refracting box: light enters, refracts with a
// per-channel index (exaggerated dispersion, so the glints split into small prismatic fringes),
// bounces inside up to twice (total internal reflection does the sparkle) and leaves toward the
// scene's light and environment. A milky term for the short path inside gives the body its white.
// Units are grain cells (one grain per cell of a unit grid in x/z).
//
// A scene that uses this supplies, BEFORE or AFTER this string (prototypes are declared here):
//   float saltBedH(vec2 q)          height of the bed of fine salt (or the floor) the grains lie on
//   float saltKeep(vec3 c, float layer) probability (0..1) that a grain at c.xz (c.y is 0), layer 0 or 1, is there
//   vec3  saltEnv(vec3 p, vec3 d)   radiance of the surroundings seen from p along d (no light source)
//   vec3  saltLight(vec3 p, vec3 d) radiance of the light source(s) along d (a lamp disc, the moon)
//   vec3  saltKeyDir(vec3 p, out vec3 col)  direction to and irradiance of the key light at p
// All of it is a pure function of uTime.
export const SALT_UNIFORMS = { uSaltSize: 0.42, uSaltTilt: 0.35, uSaltMilk: 0.07, uSaltDisp: 0.6, uSaltHopper: 0.6, uSaltDiff: 0.25, uSaltBody: 1.0, uSaltCleave: 0.0, uSaltGlit: 1.0, uSaltVar: 0.0, uSaltBed: 1.0 };

// the lens and glow helpers every one of these worlds uses (also exported alone for the vessel scenes)
export const LENS_GLSL = /* glsl */ `
// a thin lens: the eye moves over the aperture (a stratified point, rotated per pixel so defocus is
// fine grain rather than ghost copies) and aims at the same point on the focus plane
vec3 lensRay(vec2 fc, float focus, float aper, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (focus / dot(rd0, ww));
  vec2 j = fract(vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7)) + hash22(fc + 0.37));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * aper;
  return normalize(fp - ro);
}
// analytic glow round a point light seen along a ray (in-scattering, unoccluded before depth)
float pointGlow(vec3 ro, vec3 rd, vec3 c, float depth) {
  vec3 oc = c - ro; float tc = dot(oc, rd); float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-8));
  return (atan((depth - tc) / h) + atan(tc / h)) / h;
}
`;

export const SALT_GLSL = LENS_GLSL + /* glsl */ `
uniform float uSaltSize, uSaltTilt, uSaltMilk, uSaltDisp, uSaltHopper, uSaltDiff, uSaltBody, uSaltCleave, uSaltGlit, uSaltVar, uSaltBed;
float saltBedH(vec2 q);
float saltKeep(vec3 c, float layer);
vec3 saltEnv(vec3 p, vec3 d);
vec3 saltLight(vec3 p, vec3 d);
vec3 saltKeyDir(vec3 p, out vec3 col);

mat3 rotAxis(vec3 k, float a) {
  float c = cos(a), s = sin(a);
  mat3 K = mat3(0.0, k.z, -k.y, -k.z, 0.0, k.x, k.y, -k.x, 0.0);
  return mat3(c) + s * K + (1.0 - c) * outerProduct(k, k);
}
mat3 grainRot(vec3 h) {
  float yaw = h.x * 6.2831853;
  mat3 Ry = mat3(cos(yaw), 0.0, -sin(yaw), 0.0, 1.0, 0.0, sin(yaw), 0.0, cos(yaw));
  float ax = h.z * 6.2831853;
  float tilt = (h.y - 0.5) * 2.0 * uSaltTilt;
  return rotAxis(vec3(cos(ax), 0.0, sin(ax)), tilt) * Ry;
}
// Grains lie in two layers on the scene's bed of fine salt: layer 0 on a grid in x/z, layer 1 on the
// grid offset by half a cell, resting on top of the first. Each grain sits ON the bed (its centre one
// half-height above it, tilted with the slope and a little at random), so nothing floats.
// cell = (ix, iz, layer).
bool saltGrain(vec3 cell, out vec3 c, out mat3 R, out vec3 hs, out float seed) {
  float L = cell.z;
  vec3 ck = vec3(cell.x, L * 7.31, cell.y);
  vec3 h = hash33(ck + 17.3);
  seed = hash13(ck * 1.7 + 3.1);
  vec2 xz = cell.xy + 0.5 + 0.5 * L + (h.xz - 0.5) * 0.42;
  R = mat3(1.0); hs = vec3(0.0); c = vec3(0.0);
  if (seed > 0.96) return false;
  // whether this cell holds a grain depends only on where it lies (x/z), so test that before the bed
  if (seed > saltKeep(vec3(xz.x, 0.0, xz.y), L)) return false;
  float bed = saltBedH(xz);
  vec3 h2 = hash33(ck * 3.3 + 1.1);
  float s = min(uSaltSize * mix(0.62 + 0.7 * h2.x * h2.x, 0.18 + 1.2 * pow(h2.x, 4.0), uSaltVar), 0.5);
  hs = s * vec3(1.0, 0.7 + 0.32 * h2.y, 0.75 + 0.3 * h2.z);
  c = vec3(xz.x, bed + hs.y * (0.75 + 0.2 * h.y) + L * uSaltSize * 1.25, xz.y);
  vec3 rh = hash33(ck * 7.7 + 5.5);
  R = grainRot(vec3(rh.x, 0.5 + (rh.y - 0.5) * (0.6 + L), rh.z));
  return true;
}
float sdRBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float grainSD(vec3 pl, vec3 hs, float seed) {
  // a rounded cube with chipped, uneven corners
  float d = sdRBox(pl, hs, 0.035);
  float chip = dot(abs(pl / hs), vec3(1.0)) - 2.78;
  d = max(d, chip * 0.4 * min(hs.x, hs.y));
  // broken grains: one or two cleavage cuts take a chunk off
  if (uSaltCleave > 0.0) {
    vec3 h1 = hash33(vec3(seed * 71.0, 1.0, 2.0)) - 0.5, h2 = hash33(vec3(seed * 53.0, 4.0, 5.0)) - 0.5;
    float m = length(hs);
    if (hash11(seed * 13.0) < uSaltCleave) d = max(d, dot(pl, normalize(h1)) - m * (0.35 + 0.4 * abs(h2.x)));
    if (hash11(seed * 29.0) < uSaltCleave * 0.5) d = max(d, dot(pl, normalize(h2)) - m * (0.4 + 0.4 * abs(h1.y)));
  }
  return d;
}
float saltHeap(vec3 p) { return p.y - saltBedH(p.xz); }

// march the grains; returns t (or -1) and the cell hit
float saltMarch(vec3 ro, vec3 rd, float tmin, float tmax, out vec3 cellOut) {
  float t = tmin;
  cellOut = vec3(0);
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float hh = p.y - saltBedH(p.xz);
    float top = uSaltSize * 2.6 + 0.2;
    if (hh > top) { t += max((hh - top) * 0.8, 0.02); if (t > tmax) break; continue; }
    if (hh < -0.5) break;
    float d = 0.26;     // never step further than an unchecked grain could reach
    vec3 best = vec3(0);
    int nk = t > 30.0 ? 4 : 8;   // far off, the upper layer is too small to matter
    for (int k = 0; k < 8; k++) {
      if (k >= nk) break;
      float L = float(k >> 2);
      vec2 cell = floor(p.xz - 0.5 - 0.5 * L) + vec2(float(k & 1), float((k >> 1) & 1));
      vec3 c, hs; mat3 R; float sd;
      if (!saltGrain(vec3(cell, L), c, R, hs, sd)) continue;
      float dd = grainSD(transpose(R) * (p - c), hs, sd);
      if (dd < d) { d = dd; best = vec3(cell, L); }
    }
    if (d < 0.0012 + 0.0004 * t) { cellOut = best; return t; }
    t += max(d * 0.9, 0.001);
    if (t > tmax) break;
  }
  return -1.0;
}

// the outward axis normal of a box face at local point o (box half size hs)
vec3 boxFaceN(vec3 o, vec3 hs) {
  vec3 a = abs(o) / hs;
  if (a.x > a.y && a.x > a.z) return vec3(sign(o.x), 0.0, 0.0);
  if (a.y > a.z) return vec3(0.0, sign(o.y), 0.0);
  return vec3(0.0, 0.0, sign(o.z));
}

// light leaving the grain toward the eye: reflection + refraction with internal bounces
// p world hit point, rd ray, cell grain cell; occl 0..1 how buried the grain is
vec3 saltShade(vec3 p, vec3 rd, vec3 cell, out float occlOut) {
  vec3 c, hs; mat3 R; float seed;
  saltGrain(cell, c, R, hs, seed);
  mat3 Rt = transpose(R);
  vec3 pl = Rt * (p - c), dl = Rt * rd;
  // local normal from the rounded box
  vec2 e = vec2(0.0006, 0.0);
  vec3 nl = normalize(vec3(grainSD(pl + e.xyy, hs, seed) - grainSD(pl - e.xyy, hs, seed), grainSD(pl + e.yxy, hs, seed) - grainSD(pl - e.yxy, hs, seed), grainSD(pl + e.yyx, hs, seed) - grainSD(pl - e.yyx, hs, seed)));
  // hopper steps: shallow terraces stepping down toward each face's centre tilt the facet slightly
  vec3 fn = boxFaceN(pl, hs);
  vec3 tang = pl - fn * dot(pl, fn);
  vec3 tq = tang / hs;
  float ring = max(max(abs(tq.x), abs(tq.y)), abs(tq.z));
  ring += 0.06 * (vnoise(pl * 9.0 + seed * 40.0) - 0.5);
  float stepk = fract(ring * (2.0 + 2.0 * seed));
  float hop = uSaltHopper * step(0.55, seed);
  vec3 bump = -normalize(tang + 1e-5) * hop * 0.14 * smoothstep(0.8, 1.0, stepk) * smoothstep(0.3, 0.6, ring);
  // faint waviness and pits on every face, so a face's reflection of the light breaks into sparks
  vec3 wv = (vec3(vnoise(pl / uSaltSize * 4.0 + seed * 7.0), vnoise(pl / uSaltSize * 4.0 + 3.3 + seed * 7.0), vnoise(pl / uSaltSize * 4.0 + 6.6 + seed * 7.0)) - 0.5) * 0.06;
  if (dot(abs(nl - fn), vec3(1.0)) < 0.05) nl = normalize(nl + bump + (wv - fn * dot(wv, fn)));
  vec3 n = R * nl;

  // how far down among its neighbours this point of the grain lies
  float sh = (p.y - saltBedH(p.xz)) / (uSaltSize * 2.6) - 0.9;
  float occl = 0.35 + 0.65 * sat(1.0 + sh * 1.1);
  occl *= occl;
  occlOut = occl;
  vec3 kc; vec3 kd = saltKeyDir(p, kc);
  float kvis = 0.15 + 0.85 * sat(1.2 + sh * 1.2);   // grains under others get less of the key

  float ci = sat(dot(-rd, n));
  float F = 0.045 + 0.955 * pow(1.0 - ci, 5.0);
  vec3 refl = reflect(rd, n);
  vec3 col = F * (saltEnv(p, refl) * mix(0.35, 1.0, occl) + saltLight(p, refl) * kvis);
  // glitter: each face is a mosaic of tiny facets (growth steps, pits), each tilted a little; a facet
  // that mirrors the flame flashes. Stable per facet, so the sparks walk as the lens moves.
  {
    vec3 a1 = fn.yzx, a2 = fn.zxy;
    vec2 fuv = vec2(dot(pl, a1), dot(pl, a2)) / uSaltSize * 9.0;
    vec2 fid = floor(fuv);
    vec3 gh = hash33(vec3(fid, seed * 113.0 + dot(fn, vec3(1.0, 2.0, 3.0))));
    vec3 gn = normalize(fn + (gh - 0.5).x * 0.32 * a1 + (gh - 0.5).y * 0.32 * a2);
    vec3 gr = reflect(rd, R * gn);
    vec3 gh2 = hash33(vec3(fid, seed * 7.0 + 1.0));
    float rad = 0.08 + 0.18 * gh2.z;
    float inside = smoothstep(rad, rad * 0.5, length(fract(fuv) - 0.25 - 0.5 * gh2.xy));
    col += saltLight(p, gr) * F * 2.0 * inside * kvis * step(1.0 - 0.65 * uSaltGlit, gh.z);
  }

  vec3 iors = vec3(1.544) + vec3(-0.026, 0.0, 0.028) * uSaltDisp;
  vec3 tr = vec3(0);
  float pathL = 0.0;
  for (int ch = 0; ch < 3; ch++) {
    float ior = iors[ch];
    vec3 d = refract(dl, nl, 1.0 / ior);
    if (dot(d, d) < 0.5) continue;
    vec3 o = pl;
    float thr = 1.0 - F;
    float acc = 0.0;
    for (int b = 0; b < 3; b++) {
      vec3 tt = (sign(d) * hs - o) / d;
      float te = max(min(min(tt.x, tt.y), tt.z), 0.0);
      o += d * te;
      if (ch == 1) pathL += te * thr;
      vec3 ne = boxFaceN(o, hs);
      vec3 dout = refract(d, -ne, ior);
      float ce = abs(dot(d, ne));
      if (dot(dout, dout) > 0.5) {
        float Fe = 0.045 + 0.955 * pow(1.0 - abs(dot(dout, ne)), 5.0);
        vec3 wo = R * dout;
        vec3 wp = R * o + c;
        vec3 envc = saltEnv(wp, wo) * (wo.y < 0.0 ? occl * 0.6 : mix(0.4, 1.0, occl)) + saltLight(wp, wo) * kvis;
        acc += thr * (1.0 - Fe) * envc[ch];
        thr *= Fe;
      }
      d = reflect(d, -ne);
      thr *= 0.97;
      if (thr < 0.02) break;
    }
    tr[ch] = acc;
  }
  col += tr;
  // the milky body: light scattered inside on the way through. Some grains are nearly clear, most
  // frosted; veils and clouds inside break the glow up.
  float milk = 1.0 - exp(-pathL * uSaltMilk * mix(0.4, 2.8, pow(hash11(seed * 91.0), 2.0)) / max(hs.x, 0.05) * 0.6);
  milk *= 0.75 + 0.5 * vnoise(pl / uSaltSize * 2.0 + seed * 17.0);
  // forward scattering: a grain glows when the light is behind it; wrap light on its lit faces
  float fwd = 0.06 + 1.4 * pow(sat(dot(rd, kd)), 3.0) + uSaltDiff * (sat(dot(n, kd)) + 0.35);
  col += vec3(0.93, 0.95, 0.98) * milk * uSaltBody * (kc * fwd * kvis * 0.22 + saltEnv(p, n) * (0.3 + 1.2 * uSaltDiff) * occl);
  // frosted faces: a broad soft sheen of the light, and the rims glowing when backlit
  vec3 hk = normalize(kd - rd);
  col += kc * milk * uSaltBody * (0.05 * pow(sat(dot(n, hk)), 24.0) + 0.12 * pow(1.0 - ci, 3.0) * pow(sat(dot(rd, kd)), 2.0)) * kvis;
  return col;
}

// the bed of fine salt the big grains lie in: small grains (a quarter the size) packed together,
// each a facet tilted its own way, matte white where the light falls, dark in the gaps between
// them, with sparks where a tiny face mirrors the light
vec3 saltBed(vec3 p, vec3 rd, vec3 n, float shadow) {
  vec3 kc; vec3 kd = saltKeyDir(p, kc);
  vec2 vq = p.xz * 14.0 + 0.6 * vec2(vnoise(p.xz * 7.0), vnoise(p.xz * 7.0 + 5.0));
  vec2 ve = voronoiEdge(vq);
  vec3 gh = hash33(vec3(ve.y * 91.0, ve.y * 17.0, 3.0));
  vec3 gn = normalize(n + (gh - 0.5) * 0.9);
  float alb = 0.7 + 0.25 * gh.x;
  vec3 col = vec3(0.93, 0.94, 0.96) * alb * (kc * sat(dot(gn, kd) * 0.5 + 0.5) * mix(0.5, 1.0, shadow) * 0.12 * uSaltBed + saltEnv(p, gn) * 0.3 * uSaltBed);
  col *= mix(0.65, 1.0, smoothstep(0.0, 0.1, ve.x));
  vec3 r = reflect(rd, gn);
  col += saltLight(p, r) * 0.06 * step(0.55, gh.y) * shadow * smoothstep(0.03, 0.1, ve.x);
  return col;
}
`;
