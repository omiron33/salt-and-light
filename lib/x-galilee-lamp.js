// The lamp on the rock (s00-title and s52-end): a clay oil lamp of the Herodian kind, a round
// wheel-made body with a pared spout, sitting on a dark basalt boulder at the water's edge of the
// near shore, among wet stones. Its wick glows, catches and burns. At night its light is the only
// warm thing in the frame; at dawn it still burns, small and steady.
// Requires GAL_GLSL (lib/x-galilee.js) before it.
import { GAL_GLSL, GAL_UNIFORMS } from '/song/lib/x-galilee.js';

// where the lamp sits (world metres) and which way its spout points
export const LAMP = { pos: [0.06, 0.30, 0.26], yaw: 2.6 };
// the wick tip (the root of the flame) in world space, for cameras, focus and the light
export function wickTip() {
  const L = 0.072;   // spout length from the body centre
  return [LAMP.pos[0] + Math.cos(LAMP.yaw) * L, LAMP.pos[1] + 0.03, LAMP.pos[2] + Math.sin(LAMP.yaw) * L];
}

// the flame's breathing (a pure function of t), shared by the light and the flame size
export function flicker(t) {
  return 0.9 + 0.05 * Math.sin(t * 11.3) + 0.035 * Math.sin(t * 17.9 + 1.0) + 0.025 * Math.sin(t * 29.1 + 2.0) + 0.02 * Math.sin(t * 5.3);
}

export const LAMP_UNIFORMS = {
  ...GAL_UNIFORMS,
  uFlameK: 0.0,      // flame size 0..1.2
  uEmber: 0.0,       // the wick glowing before it catches
  uCatch: -1e4,      // when it caught (sparks)
  uWick: wickTip(),
  uDaySun: 0.0,      // direct sun on the near objects (s52)
};

export const LAMP_GLSL = GAL_GLSL + /* glsl */ `
uniform float uFlameK, uEmber, uCatch, uDaySun;
uniform vec3 uWick;
const vec3 LPOS = vec3(${LAMP.pos.map((v) => v.toFixed(3)).join(', ')});
const float LYAW = ${LAMP.yaw.toFixed(3)};

// ----- the clay lamp, in its own frame: spout along +x, base on y = 0 -----
float lampSD(vec3 p, out int part) {
  vec3 q = p - LPOS;
  q.xz = rot2(LYAW) * q.xz;   // spout toward +x after rotation
  q.z = -q.z;
  part = 4;
  // the body: a squat round bowl
  float body = sdEllipsoid(q - vec3(0.0, 0.016, 0.0), vec3(0.040, 0.019, 0.040));
  body = smax(body, -q.y, 0.004);
  // the spout: a pared nozzle running out to the wick hole
  float sp = sdRoundCone(q, vec3(0.012, 0.016, 0.0), vec3(0.066, 0.02, 0.0), 0.016, 0.0105);
  sp = smax(sp, -q.y, 0.003);
  float d = smin(body, sp, 0.012);
  // the discus: a shallow dish on top with the filling hole; the wick hole at the tip
  float dish = sdEllipsoid(q - vec3(0.0, 0.041, 0.0), vec3(0.026, 0.008, 0.026));
  d = smax(d, -dish, 0.003);
  float fill = length(q.xz - vec2(-0.004, 0.0)) - 0.0065;
  d = smax(d, -max(fill, -(q.y - 0.012)), 0.002);
  float wh = length(q.xz - vec2(0.069, 0.0)) - 0.0042;
  d = smax(d, -max(wh, -(q.y - 0.02)), 0.0015);
  // the wick: a twist of flax standing out of the hole
  float wick = sdCapsule(q, vec3(0.069, 0.018, 0.0), vec3(0.071, 0.029, 0.0), 0.0024);
  if (wick < d) { part = 5; return wick; }
  return d;
}

// ----- the rock, the stones and the shore -----
float groundH(vec2 p) {
  float h = landH(p, 3);
  float s = p.y - shoreZ(p.x);
  // shingle: small stones packed along the water's edge
  if (s > -3.0 && s < 6.0 && abs(p.x) < 12.0) {
    float v = voronoiEdge(p * 9.0).x;
    h += 0.018 * smoothstep(0.0, 0.25, v) * smoothstep(-3.0, 0.0, s) * smoothstep(6.0, 1.0, s);
  }
  return h;
}
const vec3 RC = vec3(0.0, 0.0, 0.3);
float rockSD(vec3 p) {
  vec3 q = p - RC;
  if (length(q) > 1.0) return length(q) - 0.9;
  float d = sdEllipsoid(q - vec3(0.0, 0.0, 0.0), vec3(0.42, 0.33, 0.36));
  d = smin(d, sdEllipsoid(q - vec3(0.3, -0.08, 0.22), vec3(0.3, 0.2, 0.26)), 0.1);
  d = smin(d, sdEllipsoid(q - vec3(-0.32, -0.1, -0.18), vec3(0.26, 0.17, 0.22)), 0.08);
  // the weathered top, tilted a little toward the water
  d = smax(d, q.y - 0.30 + 0.06 * q.x - 0.04 * q.z, 0.08);
  // broken faces
  d = smax(d, dot(q, normalize(vec3(0.9, 0.25, -0.35))) - 0.36, 0.05);
  d = smax(d, dot(q, normalize(vec3(-0.5, 0.2, -0.85))) - 0.3, 0.05);
  if (d > 0.08) return d;
  // basalt: broken faces, pits and grain
  float n = fbm(p * 6.0, 3);
  float facet = abs(vnoise(p * 4.0 + 7.0) - 0.5);
  float fine = fbm(p * 30.0, 2);
  float pits = smoothstep(0.62, 0.8, vnoise(p * 55.0)) * 0.002;
  d += 0.05 * (n - 0.5) - 0.03 * facet + 0.006 * (fine - 0.5) + pits;
  // a worn flat seat where the lamp stands
  float k = smoothstep(0.1, 0.055, length(p.xz - LPOS.xz));
  return mix(d, max(d, p.y - LPOS.y - 0.001), k);
}
float stonesSD(vec3 p) {
  vec2 cell = floor(p.xz / 0.55);
  vec2 h = hash22(cell + 3.0);
  vec2 c = (cell + 0.25 + 0.5 * h) * 0.55;
  float s = c.y - shoreZ(c.x);
  float dr = length(c - RC.xz);
  bool nearRock = dr < 2.2 && dr > 0.6;
  if (!nearRock && (s < -1.0 || s > 3.0 || abs(c.x) > 14.0)) return 1.0;
  if (hash12(cell * 1.7) < 0.25 || dr < 0.6) return 1.0;
  float r = 0.07 + 0.16 * hash12(cell * 3.1 + 1.0);
  float gy = nearRock ? max(landH(c, 2), -0.06 - 0.06 * dr) : landH(c, 2);
  vec3 q = p - vec3(c.x, gy + r * 0.25, c.y);
  q.xz = rot2(hash12(cell) * 6.28) * q.xz;
  float d = sdEllipsoid(q, vec3(r * 1.25, r * 0.6, r));
  if (d < 0.05) d += 0.012 * (fbm(p * 18.0, 2) - 0.5);
  return d;
}
// id: 1 rock, 2 stone, 3 ground, 4 lamp clay, 5 wick
float mapNear(vec3 p, out int id) {
  float d = p.y - groundH(p.xz);
  d *= 0.7; id = 3;
  float r = rockSD(p);
  if (r < d) { d = r; id = 1; }
  float s = stonesSD(p);
  if (s < d) { d = s; id = 2; }
  if (length(p - LPOS) < 0.2) {
    int part; float l = lampSD(p, part);
    if (l < d) { d = l; id = part; }
  } else d = min(d, length(p - LPOS) - 0.15);
  return d;
}
float mapNearD(vec3 p) { int i; return mapNear(p, i); }
vec3 nearNormal(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.0004, 0.0004 * t);
  return normalize(e.xyy * mapNearD(p + e.xyy) + e.yyx * mapNearD(p + e.yyx) + e.yxy * mapNearD(p + e.yxy) + e.xxx * mapNearD(p + e.xxx));
}
float marchNear(vec3 ro, vec3 rd, float tmax, out int id) {
  float t = 0.01;
  for (int i = 0; i < 180; i++) {
    vec3 p = ro + rd * t;
    float d = mapNear(p, id);
    if (d < 0.0004 * t + 0.0002) return t;
    t += max(d, 0.0008 * t);
    if (t > tmax) { id = 0; return -1.0; }
  }
  return t;   // out of steps while grazing a surface: call it a hit
}
float softShadow(vec3 ro, vec3 rd, float tmax, float k) {
  float res = 1.0, t = 0.004;
  for (int i = 0; i < 20; i++) {
    float h = mapNearD(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.006, 0.1);
    if (res < 0.01 || t > tmax) break;
  }
  return sat(res);
}
float nearAO(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i * i); o += (h - mapNearD(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - 1.6 * o);
}

vec3 flameLight() { return uL1Col; }
vec3 flameRoot() { return uWick - vec3(0.0, 0.005, 0.0); }
vec3 flameCentre() { return uWick + vec3(0.0, 0.018 * max(uFlameK, 0.3), 0.0); }

// shade a near surface
// small-scale relief for stone (a bump on the normal)
vec3 bumpN(vec3 p, vec3 n, float sc, float amt) {
  float e = 0.6 / sc;
  float b0 = fbm(p * sc, 2);
  vec3 g = vec3(fbm((p + vec3(e, 0, 0)) * sc, 2), fbm((p + vec3(0, e, 0)) * sc, 2), fbm((p + vec3(0, 0, e)) * sc, 2)) - b0;
  g -= n * dot(g, n);
  return normalize(n - g / (e * sc) * amt);
}
vec3 shadeNear(vec3 p, vec3 rd, float t, int id) {
  vec3 n = nearNormal(p, t), v = -rd;
  float cav = 1.0;
  if (id <= 3) {
    float bs = id == 1 ? 60.0 : id == 2 ? 70.0 : 40.0;
    n = bumpN(p, n, bs * 1.5, 0.6);
    cav = smoothstep(0.25, 0.6, fbm(p * bs * 0.5, 3));
  } else if (id == 4) {
    n = bumpN(p, n, 300.0, 0.05);
  }
  vec3 alb; float rough = 0.8, wet = 0.0;
  float gs = p.z - shoreZ(p.x);
  if (id == 1) {
    float g = fbm(p * 11.0, 3);
    alb = mix(vec3(0.035, 0.033, 0.031), vec3(0.12, 0.11, 0.095), g * g * 1.4) * (0.45 + 0.55 * cav);
    alb *= 0.75 + 0.5 * hash13(floor(p * 300.0));
    alb = mix(alb, vec3(0.16, 0.15, 0.11), smoothstep(0.6, 0.75, fbm(p * 5.0 + 4.0, 3)) * smoothstep(0.25, 0.4, p.y) * 0.6);  // lichen
    wet = smoothstep(0.2, 0.02, p.y + 0.03 * g);
    rough = 0.65;
  } else if (id == 2) {
    float g = fbm(p * 14.0, 3);
    alb = mix(vec3(0.05, 0.048, 0.045), vec3(0.12, 0.11, 0.095), g);
    wet = smoothstep(1.4, -0.2, gs);
    rough = 0.55;
  } else if (id == 3) {
    float g = fbm(p.xz * 6.0, 3);
    float pb = voronoiEdge(p.xz * 9.0).x;
    alb = mix(vec3(0.06, 0.055, 0.05), vec3(0.15, 0.13, 0.10), g) * (0.7 + 0.5 * smoothstep(0.0, 0.3, pb));
    // dry grass beyond the shingle
    alb = mix(alb, vec3(0.10, 0.09, 0.05) * (0.6 + 0.8 * g), smoothstep(3.0, 7.0, gs));
    wet = smoothstep(1.2, -0.3, gs);
    rough = 0.85;
  } else if (id == 4) {
    // fired clay: orange-buff, wheel lines, soot round the spout
    vec3 q = p - LPOS; q.xz = rot2(LYAW) * q.xz;
    float g = fbm(p * 90.0, 3);
    alb = mix(vec3(0.30, 0.14, 0.07), vec3(0.42, 0.22, 0.12), g) * (0.92 + 0.08 * sin(length(q.xz) * 900.0));
    float soot = smoothstep(0.035, 0.07, q.x) * smoothstep(0.0, 0.03, q.y);
    alb = mix(alb, vec3(0.03, 0.025, 0.02), soot * 0.85);
    rough = 0.75;
    // the oil in the filling hole glints
    if (q.y < 0.034 && length(q.xz - vec2(-0.004, 0.0)) < 0.007) { alb = vec3(0.12, 0.08, 0.02); rough = 0.08; }
  } else {
    alb = vec3(0.02, 0.015, 0.01); rough = 0.9;
  }
  // wet surfaces darken and gloss
  alb *= 1.0 - 0.45 * wet;
  rough = mix(rough, 0.12, wet);

  vec3 col = vec3(0);
  // the flame: diffuse + spec, soft shadow
  vec3 lp = flameCentre();
  vec3 L = lp - p; float d2 = dot(L, L); vec3 Ld = L * inversesqrt(d2);
  float sh = (uL1Col.r > 0.0) ? softShadow(p + n * 0.003, Ld, sqrt(d2) - 0.02, 14.0) : 0.0;
  float nl = sat(dot(n, Ld));
  col += alb / PI * uL1Col * nl / (d2 + 0.0064) * sh;
  col += pointSpec(p, n, v, rough, lp, uL1Col) * (d2 + 0.01) / (d2 + 0.0064) * sh * mix(0.04, 1.0, wet * 0.5 + 0.1);
  // the wick ember
  if (uEmber > 0.0) {
    vec3 Le = uWick - p; float de = dot(Le, Le);
    col += alb * vec3(1.0, 0.25, 0.05) * uEmber * 0.0015 * sat(dot(n, Le * inversesqrt(de))) / (de + 0.0004);
  }
  // sky light
  float ao = nearAO(p, n);
  vec3 amb = skyBase(normalize(n + vec3(0.0, 0.8, 0.0))) * (0.55 + 0.45 * n.y);
  col += alb * amb * 2.2 * ao;
  // reflected sky on wet stone
  vec3 r = reflect(rd, n);
  col += skyBase(r) * fresnelW(n, v) * wet * 0.5 * ao;
  // moonlight, faint and cold
  if (uMoon > 0.0) {
    vec3 md = normalize(uMoonDir);
    float ms = 1.0;
    col += alb * MOONC * uMoon * sat(dot(n, md)) * ms;
    col += pointSpec(p, n, v, max(rough, 0.35), p + md * 50.0, MOONC * uMoon * 2500.0) * ms * 0.03;
  }
  // the low sun (dawn)
  if (uDaySun > 0.0) {
    vec3 sd = SUND();
    float ss = softShadow(p + n * 0.004, sd, 3.0, 10.0);
    col += alb * vec3(1.0, 0.72, 0.48) * 2.6 * sat(dot(n, sd)) * ss * uDaySun;
    col += pointSpec(p, n, v, rough, p + sd * 50.0, vec3(1.0, 0.7, 0.45) * 2500.0 * uDaySun) * ss * (0.1 + wet);
  }
  // clay glows a little where the flame is close (light through the thin nozzle wall)
  if (id == 4 || id == 5) {
    float dw = length(p - uWick);
    col += vec3(1.0, 0.35, 0.08) * (uFlameK * 0.3 + uEmber) * exp(-dw / 0.004) * 0.6;
    if (id == 5) col += vec3(1.0, 0.3, 0.05) * (uEmber * 1.5 + uFlameK * 0.6) * smoothstep(0.012, 0.0, abs(p.y - uWick.y)) * smoothstep(0.004, 0.0, dw - 0.002);
  }
  return col;
}

// sparks that leap from the wick as it catches
vec3 sparks(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0);
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float t0 = uCatch + 0.03 * fi * hash11(fi * 3.3);
    // before the catch, single sparks wander up off the glowing wick
    if (i >= 9) { float per = 0.55 + 0.2 * hash11(fi); t0 = floor((uTime - fi * 0.13) / per) * per + fi * 0.13; if (uTime > uCatch || uEmber <= 0.0) continue; }
    float age = uTime - t0;
    float life = 0.35 + 0.6 * hash11(fi * 7.1);
    if (age < 0.0 || age > life) continue;
    vec3 v0 = vec3(hash11(fi * 1.7) - 0.5, 1.2 + hash11(fi * 4.4), hash11(fi * 9.2) - 0.5) * vec3(0.5, 0.45, 0.5);
    vec3 sp = uWick + v0 * age + vec3(0.0, -1.2 * age * age, 0.0) + vec3(0.0, 0.01, 0.0);
    vec3 oc = sp - ro; float tc = dot(oc, rd);
    if (tc <= 0.0 || tc > depth) continue;
    float h2 = dot(oc, oc) - tc * tc;
    float pr = pxAng() * tc;
    float k = (1.0 - age / life);
    acc += vec3(1.0, 0.55, 0.2) * k * k * 0.0006 * pr * pr / (pr * pr * 0.3 + h2) / (pr * 300.0 + 0.001) * 0.4;
  }
  return acc;
}

// the flame, its glow and sparks along a ray (used directly and in the water's reflection)
vec3 lampLights(vec3 ro, vec3 rd, float depth, float reflK) {
  vec3 c = vec3(0);
  vec3 fr = flameRoot();
  c += flameAt(ro, rd, fr, 0.05, uFlameK, 3.7, depth);
  float fl = length(uL1Col);
  c += glowAt(ro, rd, flameCentre(), depth, vec3(1.0, 0.6, 0.3) * fl * 0.006, 0.0012, 0.02) * reflK;
  if (uEmber > 0.0) {
    vec3 oc = uWick - ro; float tc = dot(oc, rd);
    if (tc > 0.0 && tc < depth + 0.01) {
      float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0)) / tc;
      float pa = pxAng();
      c += vec3(1.0, 0.32, 0.07) * uEmber * (exp(-h * h / (pa * pa * 16.0)) * 6.0 + exp(-h / 0.008) * 0.25 + exp(-h / 0.04) * 0.03);
    }
  }
  c += sparks(ro, rd, depth) * reflK;
  return c;
}

vec3 lampShot(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id;
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float tn = marchNear(ro, rd, min(tw, 30.0), id);
  vec3 col; float depth;
  float tl0 = -1.0;
  if (tn <= 0.0 && rd.y < 0.3) tl0 = marchLand(ro, rd, 30.0, min(tw, 30000.0));
  if (tn > 0.0) {
    vec3 p = ro + rd * tn;
    col = shadeNear(p, rd, tn, id);
    depth = tn;
  } else if (tl0 > 0.0) {
    vec3 p = ro + rd * tl0; col = landShade(p, rd, tl0); depth = tl0;
  } else if (tw < 1e8) {
    // the lake
    vec3 p = ro + rd * tw; depth = tw;
    vec3 n = waterNormal(p.xz, tw), v = -rd;
    vec3 r = reflect(rd, n); r.y = abs(r.y);
    float F = fresnelW(n, v);
    // what the water mirrors: the rock and lamp, the land, the sky
    vec3 refl;
    int rid; float tr = -1.0;
    if (length(p.xz - RC.xz) < 3.0) tr = marchNear(p + vec3(0.0, 0.002, 0.0), r, 3.0, rid);
    if (tr > 0.0) refl = shadeNear(p + r * tr, r, tr, rid);
    else {
      float tl = r.y < 0.15 ? marchLand(p, r, 2.0, 30000.0) : -1.0;
      refl = tl > 0.0 ? landShade(p + r * tl, r, tl) : skyFull(r);
      tr = 1e4;
    }
    refl += lampLights(p, r, tr, 1.0);
    // shallow water over the stones by the shore
    vec3 bed = vec3(0);
    float sd = p.z - shoreZ(p.x);
    if (sd > -4.0 && tw < 5.0) {
      vec3 rr = refract(rd, n, 0.75);
      int bid; float tb = marchNear(p, rr, 1.5, bid);
      if (tb > 0.0) {
        vec3 bp = p + rr * tb;
        bed = shadeNear(bp, rr, tb, bid) * exp(-tb * vec3(3.5, 1.6, 1.2)) * 0.8;
      }
    }
    col = mix(bed + vec3(0.0004, 0.0007, 0.0009), refl, F);
    // the lamp's glitter on the ripples
    col += pointSpec(p, n, v, 0.14, flameCentre(), uL1Col) * 1.2;
    if (uDaySun > 0.0) col += pointSpec(p, n, v, 0.05, p + SUND() * 1000.0, vec3(1.0, 0.75, 0.5) * 6e5 * uDaySun) * 0.6;
    float fog = 1.0 - exp(-tw * (0.00032 - 0.0002 * uDay));
    col = mix(col, skyBase(normalize(vec3(rd.x, 0.02, rd.z))) * 0.9, fog);
  } else {
    col = skyFull(rd); depth = 1e5;
  }
  col += lampLights(ro, rd, depth, 1.0);
  col += airGlow(ro, rd, depth, flameCentre(), uL1Col, 0.0000008);
  float trans = 1.0;
  vec3 m = mistLayers(ro, rd, depth, trans);
  col = col * trans + m;
  return col;
}
`;
