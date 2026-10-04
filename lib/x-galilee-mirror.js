// The still lake (s06-pure): we stand low on the stony near shore at night, no wind. Dark rounded
// stones lie at the water's edge and clumps of reeds stand in the shallows to either side; beyond
// them the lake is glass, a mirror of the stars and the Milky Way, closed by the far shore and the
// eastern hills as a dark band. The last ripple ring spreads across the reflection and dies. Then the
// Father's light opens, high above the frame, and we see it in the mirror: a reflection, with a soft
// wash of its light lying on the water.
// Requires GAL_GLSL (lib/x-galilee.js) before it.
import { GAL_GLSL, GAL_UNIFORMS } from '/song/lib/x-galilee.js';

export const MIRROR_UNIFORMS = { ...GAL_UNIFORMS };

export const MIRROR_GLSL = GAL_GLSL + /* glsl */ `
// ---- the shore: stones at the water's edge and reeds in the shallows ----
float stoneM(vec3 p) {
  vec2 cell = floor(p.xz / 0.42);
  vec2 h = hash22(cell + 7.0);
  vec2 c = (cell + 0.25 + 0.5 * h) * 0.42;
  float s = c.y - shoreZ(c.x);
  if (s < -1.6 || s > 2.5 || hash12(cell * 1.3) < 0.2) return 0.3;
  float r = 0.06 + 0.13 * hash12(cell * 2.9);
  vec3 q = p - vec3(c.x, landH(c, 2) + r * 0.2, c.y);
  q.xz = rot2(hash12(cell) * 6.28) * q.xz;
  float d = sdEllipsoid(q, vec3(r * 1.3, r * 0.65, r));
  if (d < 0.03) d += 0.008 * (fbm(p * 22.0, 2) - 0.5);
  return d;
}
// reeds: clumps in the shallows on either side, thin tapering stems leaning a little
float reedM(vec3 p) {
  float side = abs(p.x);
  if (side < 0.7 || side > 3.4 || p.y > 1.6 || p.y < -0.2) return 0.3;
  vec2 cell = floor(p.xz / 0.07);
  float d = 0.3;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 cc = cell + vec2(i, j);
    vec2 h = hash22(cc * 1.7 + 3.0);
    vec2 base = (cc + 0.2 + 0.6 * h) * 0.07;
    // clump density: two clumps, left and right
    float clump = max(exp(-pow(length((base - vec2(-1.7, 3.1)) * vec2(0.8, 1.6)) / 0.9, 2.0)),
                      exp(-pow(length((base - vec2(1.9, 2.4)) * vec2(0.8, 1.6)) / 0.8, 2.0)));
    if (hash12(cc * 3.3) > clump * 0.9) continue;
    float hgt = 0.6 + 0.9 * hash12(cc * 5.1) * clump;
    vec2 lean = (hash22(cc * 9.1) - 0.5) * 0.25 + vec2(0.0, -0.05);
    float y = clamp(p.y / hgt, 0.0, 1.0);
    vec2 axis = base + lean * y * y * hgt;
    float r = mix(0.006, 0.0012, y);
    float e = max(length(p.xz - axis) - r, max(-p.y - 0.2, p.y - hgt));
    d = min(d, e);
  }
  return d;
}
float mapM(vec3 p, out int id) {
  float g = (p.y - landH(p.xz, 3)) * 0.8;
  id = 1;
  float s = stoneM(p);
  if (s < g) { g = s; id = 2; }
  float r = reedM(p);
  if (r < g) { g = r; id = 3; }
  return g;
}
float mapMD(vec3 p) { int i; return mapM(p, i); }
float marchM(vec3 ro, vec3 rd, float tmax, out int id) {
  float t = 0.02;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float d = mapM(p, id);
    if (d < 0.0004 * t + 0.0002) return t;
    t += max(d * 0.8, 0.001 * t);
    if (t > tmax) break;
  }
  id = 0; return -1.0;
}
vec3 normM(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.0008, 0.0006 * t);
  return normalize(e.xyy * mapMD(p + e.xyy) + e.yyx * mapMD(p + e.yyx) + e.yxy * mapMD(p + e.yxy) + e.xxx * mapMD(p + e.xxx));
}
vec3 shadeM(vec3 p, vec3 rd, float t, int id) {
  vec3 n = normM(p, t), v = -rd;
  float wet = smoothstep(0.6, -0.1, p.z - shoreZ(p.x));
  vec3 alb = id == 3 ? vec3(0.07, 0.07, 0.04) : mix(vec3(0.04, 0.038, 0.035), vec3(0.11, 0.1, 0.085), fbm(p * 12.0, 3));
  alb *= 1.0 - 0.4 * wet;
  float rough = mix(0.8, 0.15, wet * (id == 2 ? 1.0 : 0.0));
  vec3 amb = skyBase(normalize(n + vec3(0.0, 0.8, 0.0))) * (0.5 + 0.5 * n.y);
  vec3 col = alb * amb * 2.4;
  // the light above, when it opens: a soft gold rim on everything it can reach
  vec3 G = normalize(uGloryDir);
  col += alb * vec3(1.0, 0.82, 0.55) * uGlory * 0.05 * sat(dot(n, G) * 0.7 + 0.3);
  vec3 r = reflect(rd, n);
  col += skyFull(r) * fresnelW(n, v) * (1.0 - rough) * 0.6;
  return col;
}

vec3 mirrorShot(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  int id; float tn = marchM(ro, rd, min(tw, 14.0), id);
  vec3 col; float depth;
  float tl = (tn < 0.0 && rd.y < 0.2) ? marchLand(ro, rd, 14.0, min(tw, 30000.0)) : -1.0;
  if (tn > 0.0) { col = shadeM(ro + rd * tn, rd, tn, id); depth = tn; }
  else if (tl > 0.0) { col = landShade(ro + rd * tl, rd, tl); depth = tl; }
  else if (tw < 1e8) {
    vec3 p = ro + rd * tw; depth = tw;
    vec3 n = waterNormal(p.xz, tw), v = -rd;
    vec3 r = reflect(rd, n); r.y = abs(r.y);
    float F = fresnelW(n, v);
    vec3 refl;
    int rid; float tr = tw < 12.0 ? marchM(p + vec3(0.0, 0.003, 0.0), r, 8.0, rid) : -1.0;
    if (tr > 0.0) refl = shadeM(p + r * tr, r, tr, rid);
    else {
      float tl2 = r.y < 0.12 ? marchLand(p, r, 14.0, 30000.0) : -1.0;
      refl = tl2 > 0.0 ? landShade(p + r * tl2, r, tl2) : skyFull(r);
    }
    // a still lake at night reads as a dark mirror: lift the reflection a little beyond Fresnel
    col = mix(vec3(0.0003, 0.0005, 0.0008), refl, sat(F * 1.6 + 0.25));
    // the soft wash of the light lying on the water (a broad sheen round its reflection)
    vec3 G = normalize(uGloryDir);
    float ga = acos(clamp(dot(r, G), -1.0, 1.0));
    col += vec3(1.0, 0.8, 0.52) * uGlory * (exp(-ga * ga / 0.09) * 0.05 + exp(-ga * ga / 0.4) * 0.012);
    float fog = 1.0 - exp(-tw * 0.00012);
    col = mix(col, skyBase(normalize(vec3(rd.x, 0.02, rd.z))) * 0.85, fog);
  } else {
    // the light itself stays above the frame: only its faint outer glow reaches down into the sky
    col = skyBase(rd) + stars(rd) * smoothstep(-0.01, 0.06, rd.y) + vec3(1.0, 0.85, 0.65) * uGlory * 0.02 * exp(-acos(clamp(dot(rd, normalize(uGloryDir)), -1.0, 1.0)) / 0.35); depth = 1e5;
  }
  float trans = 1.0;
  vec3 m = mistLayers(ro, rd, depth, trans);
  return col * trans + m;
}
`;
