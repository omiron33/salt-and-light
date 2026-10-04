// s07's world: "Those who make peace will be called God's children." An olive grove at night. Old
// trees in rows, gnarled split trunks and wide silver-green crowns stirring in the wind; the moon low
// behind us on the left throws long shadows forward across the dry grass. Two people walk toward each
// other from either side behind the camera: we never see them, only their long moon shadows coming in
// from the left and right between the trunks, until on "children" the shadows' hands clasp. Ahead the
// grove opens into a clearing, and the moon comes clear of a thin cloud and floods it.
// uMoonK: moonlight strength (thin cloud 0..1 clear); uWalk: the walkers' progress 0..1;
// uClasp: 0..1 the arms reaching and hands meeting; uFigZ: the walkers' z (just behind the camera).
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const GROVE_UNIFORMS = { ...NATURE_UNIFORMS, uMoonK: 0.6, uWalk: 0, uClasp: 0, uFigZ: 0 };
export const CLEAR_Z = 21.0;

export const GROVE_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uMoonK, uWalk, uClasp, uFigZ;
const vec3 MOON = normalize(vec3(0.04, 0.42, -0.9));
const vec3 MOONC = vec3(0.6, 0.68, 0.86);
const vec2 CLEAR = vec2(0.5, ${CLEAR_Z.toFixed(1)});
const float CELL = 8.0;

float groundH(vec2 xz) { return 0.35 * (fbm(xz * 0.07, 3) - 0.5) + 0.04 * fbm(xz * 1.3, 2); }

// a tree in a grid cell (or none): returns centre xz, size, and whether it stands
vec4 treeIn(vec2 c) {
  vec2 h = hash22(c * 1.37 + 3.0);
  vec2 pos = (c + 0.5) * CELL + (h - 0.5) * CELL * 0.18;
  // the walk: a lane along x = 0 between the rows
  // the lane: the two nearest rows stand back from x = 0
  if (abs(pos.x) < 7.2) pos.x = sign(pos.x + 1e-3) * (4.4 + 0.3 * h.x);
  float has = 1.0;
  if (length((pos - CLEAR) * vec2(1.0, 0.8)) < 7.5) has = 0.0;          // the clearing
  float sz = 0.85 + 0.25 * hash12(c * 5.1);
  return vec4(pos, sz, has);
}
// one olive: a short split trunk of three twisting stems, a wide lumpy crown
float treeSD(vec3 p, vec2 base, float sz, float seed, out float part) {
  vec3 q = p - vec3(base.x, groundH(base), base.y);
  part = 0.0;
  float bound = length(q - vec3(0.0, 2.4 * sz, 0.0)) - 3.6 * sz;
  if (bound > 0.5) return bound - 0.3;
  // trunk: three stems that part a little way up and lean out
  float d = 1e9;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float a = seed * 6.0 + fi * 2.1;
    vec3 top = vec3(cos(a) * 0.7, 1.9, sin(a) * 0.7) * sz;
    vec3 mid = vec3(cos(a + 0.8) * 0.18, 0.9, sin(a + 0.8) * 0.18) * sz;
    float r0 = 0.2 * sz, r1 = 0.09 * sz;
    float tw = 0.04 * sin(q.y * 7.0 + fi * 2.0 + atan(q.z - mid.z, q.x - mid.x) * 3.0);
    d = min(d, sdRoundCone(q, vec3(0.0, -0.2, 0.0), mid, r0 * 1.3, r0) + tw);
    d = min(d, sdRoundCone(q, mid, top, r0, r1) + tw);
  }
  d = smin(d, sdRoundCone(q, vec3(0.0, -0.3, 0.0), vec3(0.0, 0.55, 0.0), 0.42 * sz, 0.16 * sz), 0.25);   // the swollen foot
  d = max(d, -q.y - 0.3);
  // bark: deep furrows twisting round the stems
  d += 0.018 * sin(atan(q.z, q.x) * 9.0 + q.y * 5.0 + seed * 9.0) + 0.012 * (vnoise(q * 9.0) - 0.5);
  // crown: lumps of foliage round the tops, stirring in the wind
  float cr = 1e9;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float a = seed * 6.0 + fi * 1.05;
    float rr = 0.6 + 0.9 * hash11(seed * 3.0 + fi);
    vec3 c = vec3(cos(a) * rr, 2.3 + 0.9 * hash11(seed + fi * 1.3), sin(a) * rr) * sz;
    if (abs(base.x) < 6.0) c.x = c.x * 0.6 + sign(base.x) * 0.7 * sz;   // the lane trees lean their crowns away from the lane
    float sway = 0.06 * sin(uTime * 1.1 + fi + seed * 5.0) * (c.y - 1.5);
    c.x += sway;
    cr = smin(cr, sdEllipsoid(q - c, vec3(0.95, 0.6, 0.95) * sz * (0.8 + 0.35 * hash11(seed * 7.0 + fi))), 0.3);
  }
  if (cr < 0.8) {
    vec3 w = q * 1.9 + vec3(uTime * 0.35, 0.0, uTime * 0.2);
    cr += 0.6 * (fbm(w, 2) - 0.36) + 0.15 * (vnoise(q * 7.0 + uTime * 0.8) - 0.5);
    // sprays of small leaves: the crown's edge breaks up into clusters and gaps
    if (cr < 0.15) cr += 0.09 * (vnoise(q * 16.0 + vec3(uTime * 0.9, 0.0, uTime * 0.5)) - 0.45) + 0.04 * (vnoise(q * 38.0 + uTime * 1.5) - 0.5);
  }
  if (cr < d) { part = 1.0; d = cr; }
  return d;
}
float mapG(vec3 p, out int id, out float part) {
  float g = p.y - groundH(p.xz);
  id = 1; part = 0.0;
  float d = g;
  vec2 c0 = floor(p.xz / CELL - 0.5);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 c = c0 + vec2(i, j);
    vec4 tr = treeIn(c);
    if (tr.w < 0.5) continue;
    float pt;
    float td = treeSD(p, tr.xy, tr.z, hash12(c), pt);
    if (td < d) { d = td; id = 2; part = pt; }
  }
  return d;
}
vec3 normG(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * max(0.002, 0.0008 * t); int i; float pp;
  return normalize(e.xyy * mapG(p + e.xyy, i, pp) + e.yyx * mapG(p + e.yyx, i, pp) + e.yxy * mapG(p + e.yxy, i, pp) + e.xxx * mapG(p + e.xxx, i, pp));
}
float marchG(vec3 ro, vec3 rd, out int id, out float part) {
  float t = 0.05;
  for (int i = 0; i < 130; i++) {
    float d = mapG(ro + rd * t, id, part);
    if (abs(d) < 0.0015 * t) return t;
    t += d * 0.85;
    if (t > 120.0) break;
  }
  id = 0; return -1.0;
}
// soft shadow from the trees toward the moon; the crowns let a little through
float shadowG(vec3 p) {
  // soft shadows of trunks and crowns; where the moon is blocked by foliage, small gaps between the
  // leaf sprays let it through in dapples
  float s = 1.0, dap = 0.0, t = 0.05 + 0.1 * hash12(gl_FragCoord.xy + uFrame * 1.7); int id; float part;
  bool fol = false;
  for (int i = 0; i < 28; i++) {
    vec3 q = p + MOON * t;
    if (q.y > 5.5) break;
    float h = mapG(q, id, part);
    if (id == 1) h = max(h, 0.3);
    if (id == 2 && part > 0.5 && h < 0.03 && !fol) {
      fol = true;
      dap = smoothstep(0.62, 0.8, vnoise(q * 6.0 + vec3(uTime * 0.5, 0.0, uTime * 0.3)));
    }
    s = min(s, 3.0 * h / t);
    t += clamp(h * 0.8, 0.06, 0.8) * (0.8 + 0.4 * hash12(gl_FragCoord.yx + float(i) + uFrame));
    if (s < 0.02 && fol) break;
  }
  s = sat(s);
  return max(s, fol ? dap * 0.55 : 0.0);
}

// the two walkers' shadows on the ground: a person in profile projected along the moonlight
// side: -1 the one coming from the left, +1 from the right. Returns 0..1 darkness.
float sdSeg2(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - r; }
float personSD(vec2 b, float side, float phase, float reach) {
  // b: body coordinates, x toward the other walker (+), y up. A profile, walking.
  float s = sin(phase), c = cos(phase);
  float hip = 0.92 + 0.02 * abs(c);
  float d = 1e9;
  // legs scissoring
  vec2 H = vec2(0.0, hip);
  vec2 K1 = H + vec2(0.18 * s, -0.45), K2 = H + vec2(-0.18 * s, -0.45);
  vec2 F1 = K1 + vec2(0.12 * s - 0.04, -0.45), F2 = K2 + vec2(-0.12 * s - 0.04, -0.45);
  d = min(d, sdSeg2(b, H, K1, 0.07)); d = min(d, sdSeg2(b, K1, F1, 0.055));
  d = min(d, sdSeg2(b, H, K2, 0.07)); d = min(d, sdSeg2(b, K2, F2, 0.055));
  // torso and cloak
  vec2 S = vec2(0.03, 1.42);
  d = min(d, sdSeg2(b, H, S, 0.15));
  d = smin(d, sdSeg2(b, H + vec2(0.0, -0.05), H + vec2(-0.04 + 0.03 * s, -0.55), 0.14 + 0.06 * (H.y - b.y)), 0.08);
  // head (a hood)
  d = min(d, length((b - vec2(0.06, 1.62)) * vec2(1.0, 0.85)) - 0.11);
  // the far arm swinging; the near arm reaching out toward the other as reach grows
  vec2 E1 = S + vec2(-0.12 * s, -0.3), W1 = E1 + vec2(-0.1 * s + 0.05, -0.25);
  d = min(d, sdSeg2(b, S, E1, 0.06)); d = min(d, sdSeg2(b, E1, W1, 0.05));
  float ra = mix(-1.35 + 0.35 * s, -0.25, reach);               // arm angle from straight down/forward
  vec2 E2 = S + 0.3 * vec2(sin(ra + 1.5708), -cos(ra + 1.5708));
  E2 = mix(S + vec2(0.12 * s, -0.3), S + vec2(0.3, -0.12), reach);
  vec2 W2 = mix(E2 + vec2(0.08 * s + 0.05, -0.25), S + vec2(0.58, -0.2), reach);
  d = min(d, sdSeg2(b, S, E2, 0.065)); d = min(d, sdSeg2(b, E2, W2, 0.055));
  d = min(d, length(b - W2 - vec2(0.03, 0.0)) - 0.06);          // the hand
  return d;
}
float walkerShadow(vec2 xz) {
  float k = 0.0;
  float cotE = length(MOON.xz) / MOON.y;
  vec2 away = -normalize(MOON.xz);                    // the direction shadows fall
  for (int i = 0; i < 2; i++) {
    float side = i == 0 ? -1.0 : 1.0;
    // where the walker stands: coming in from the side, meeting near x = 0 (hands just touching)
    float fx = side * mix(3.2, 0.6, uWalk);
    vec2 F = vec2(fx, uFigZ);
    // body coordinates of this ground point: height from the distance along the shadow,
    // lateral (toward the other walker) from the offset across it
    vec2 g = xz - F;
    float y = dot(g, away) / cotE;
    vec2 across = normalize(vec2(-away.y, away.x));
    float x = dot(g, across) * sign(dot(vec2(-side, 0.0), across));
    float phase = uWalk * 15.0 * (1.0 - 0.7 * uClasp) + (side > 0.0 ? 3.14159 : 0.0);
    float d = personSD(vec2(x, y), side, phase, uClasp);
    // the penumbra widens with distance from the feet
    float pen = 0.02 + 0.035 * max(y, 0.0);
    k = max(k, smoothstep(pen, -pen, d));
  }
  return k;
}

vec3 skyG(vec3 rd) {
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.03, 0.04, 0.07), vec3(0.004, 0.006, 0.014), pow(h, 0.45));
  float md = dot(rd, MOON);
  c += MOONC * (0.03 * pow(sat(md), 4.0) + 0.2 * pow(sat(md), 60.0)) * (0.5 + 0.5 * uMoonK);
  c += starField(rd, 1.0) * smoothstep(0.0, 0.15, rd.y) * (1.2 - 0.6 * uMoonK);
  // thin cloud drifting over, lit by the moon
  vec2 cq = rd.xz / max(rd.y, 0.05) * 0.6 + vec2(uTime * 0.03, 0.0);
  float cl = smoothstep(0.45, 0.85, fbm(cq, 4)) * smoothstep(0.02, 0.2, rd.y);
  c = mix(c, MOONC * 0.05 * (0.6 + 0.4 * pow(sat(md), 2.0)), cl * 0.7);
  return c;
}

vec3 peace(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; float part;
  float t = marchG(ro, rd, id, part);
  vec3 col; float depth = 200.0;
  vec3 ML = MOONC * 11.0 * uMoonK;
  if (t > 0.0) {
    depth = t;
    vec3 p = ro + rd * t; vec3 n = normG(p, t); vec3 v = -rd;
    float sh = shadowG(p + n * 0.02);
    float nl = sat(dot(n, MOON));
    vec3 alb; float rough = 0.85; float silver_k = 0.0;
    if (id == 1) {
      // dry grass and pale earth between the trees, a few stones
      float g = fbm(p.xz * 2.0, 3);
      // dry grass, a worn pale path down the middle of the lane, stones
      alb = mix(vec3(0.17, 0.17, 0.12), vec3(0.22, 0.21, 0.14), g) * (0.8 + 0.4 * vnoise(p.xz * 14.0));
      float path = smoothstep(0.9, 0.4, abs(p.x - 0.3 + 0.25 * sin(p.z * 0.3)) + 0.3 * (fbm(p.xz * 3.0, 2) - 0.5));
      alb = mix(alb, vec3(0.2, 0.18, 0.14) * (0.8 + 0.4 * fbm(p.xz * 9.0, 3)), path * 0.8);
      // fallen olive leaves and twigs, fine and scattered
      float lv = smoothstep(0.82, 0.9, vnoise(p.xz * vec2(45.0, 70.0) + 3.0)) * smoothstep(12.0, 4.0, t);
      alb = mix(alb, vec3(0.2, 0.21, 0.17), lv * 0.5);
      // grass blades as fine streaks
      vec2 bq = vec2(p.x * 160.0 + sin(uTime * 1.3 + p.z * 0.7) * 1.2, p.z * 22.0);
      float bl = vnoise(bq) * 0.6 + vnoise(bq * 2.3 + 5.0) * 0.4;
      float gl = smoothstep(9.0, 2.5, t);         // blades only where the lens can resolve them
      bl = mix(0.5, bl, gl);
      alb *= mix(0.55 + 0.8 * bl, 1.0, path * 0.7);
      alb *= 0.85 + 0.3 * fbm(p.xz * 1.5, 3) * (1.0 - gl);
      n = normalize(n + gl * (1.0 - path) * 0.6 * vec3(vnoise(bq * 1.7) - 0.5, 0.0, vnoise(bq * 1.7 + 9.0) - 0.5));
      nl = sat(dot(n, MOON));
      alb *= 1.0 + 0.6 * smoothstep(0.62, 1.0, uMoonK) * exp(-dot(p.xz - CLEAR, p.xz - CLEAR) / 40.0);
      // the walkers' shadows
      sh *= 1.0 - 0.92 * walkerShadow(p.xz);
    } else if (part < 0.5) {
      // olive bark: grey, deeply furrowed, lichen here and there
      alb = vec3(0.13, 0.12, 0.105) * (0.5 + 0.7 * fbm(p * vec3(6.0, 2.0, 6.0), 4));
      // furrowed, twisting bark: deep vertical fissures
      float fis = vnoise(vec2(atan(p.z - floor(p.z / CELL) * CELL, p.x) * 6.0 + p.y * 1.5, p.y * 3.0) * vec2(3.0, 1.0) + p.xz * 2.0);
      alb *= mix(0.35, 1.1, smoothstep(0.3, 0.6, fis));
      n = normalize(n + 0.5 * vec3(vnoise(p * 40.0) - 0.5, 0.0, vnoise(p * 40.0 + 3.0) - 0.5));
      nl = sat(dot(n, MOON));
      alb = mix(alb, vec3(0.26, 0.28, 0.22), smoothstep(0.62, 0.8, fbm(p * 5.0 + 7.0, 3)) * 0.6);
    } else {
      // foliage: dark green tops, silver undersides; leaves flicker as they turn in the wind
      // single narrow olive leaves in 3 cm cells: each its own tilt, flipping silver side up in the wind
      vec3 lp = p * 34.0 + vec3(uTime * 0.5, 0.0, uTime * 0.3);
      vec3 ci = floor(lp), cf = fract(lp) - 0.5;
      vec3 hh = hash33(ci);
      vec2 ld = normalize(hh.xy - 0.5);
      vec2 lc = vec2(dot(cf.xz, ld), dot(cf.xz, vec2(-ld.y, ld.x)));
      float leaf = smoothstep(1.0, 0.7, length(lc * vec2(1.6, 5.0)));
      float id1 = hh.z;
      float flip = smoothstep(0.5, 0.9, sin(uTime * (1.5 + 2.0 * id1) + id1 * 40.0) * 0.5 + 0.5);
      float silver = mix(0.12, 1.0, flip) * leaf;
      alb = mix(vec3(0.04, 0.052, 0.03), vec3(0.34, 0.37, 0.34), silver * 0.85);
      alb *= mix(0.35, 1.0, leaf);
      rough = mix(0.6, 0.3, silver); silver_k = silver;
      vec3 lfn = normalize(hh - 0.5 + vec3(0.0, 0.4, 0.0));
      n = normalize(mix(n, lfn, 0.7 * leaf));
      nl = sat(dot(n, MOON) * 0.7 + 0.3);
      alb *= 0.6 + 0.6 * fbm(p * 4.0 + uTime * 0.2, 2);
    }
    col = alb / PI * ML * nl * sh;
    col += ML * ggx(n, MOON, v, rough) * 0.05 * sh * (part > 0.5 ? 1.2 * silver_k : 1.0);
    // sky light, little under the crowns
    col += alb * vec3(0.15, 0.18, 0.28) * (0.5 + 0.5 * n.y) * (id == 1 ? 0.6 + 0.4 * sh : 0.8);
    // mist lying low in the grove, lit by the moon, thicker toward the clearing
    float fogd = 1.0 - exp(-t * 0.025);
    vec3 fogc = vec3(0.025, 0.032, 0.055) + MOONC * 0.06 * uMoonK * pow(sat(dot(rd, MOON) * -1.0 + 0.2), 2.0);
    col = mix(col, fogc, fogd);
  } else {
    col = skyG(rd0);
  }
  // moonlight hanging in the mist over the clearing as the moon comes clear
  vec3 cc = vec3(CLEAR.x, 1.5, CLEAR.y);
  float clr = smoothstep(0.62, 1.0, uMoonK);
  float tc = clamp(dot(cc - ro, rd), 0.0, depth);
  vec3 pc = ro + rd * tc;
  float w = exp(-dot(pc.xz - cc.xz, pc.xz - cc.xz) / 30.0) * exp(-max(pc.y - 0.5, 0.0) / 2.5);
  col += MOONC * (0.01 + 0.02 * clr) * w * (1.0 - exp(-tc * 0.06));
  // shafts of moonlight through the leaves into the clearing: haze lit where the crowns let the moon through
  if (clr > 0.0) {
    float tmax = min(depth, 40.0);
    vec3 acc = vec3(0);
    const int NS = 18;
    float j = hash12(gl_FragCoord.xy + uFrame * 3.7);
    for (int i = 0; i < NS; i++) {
      float tt = tmax * (float(i) + j) / float(NS);
      vec3 q = ro + rd * tt;
      if (q.y < 0.0 || q.y > 5.0) continue;
      float near = exp(-dot(q.xz - CLEAR, q.xz - CLEAR) / 200.0);
      if (near < 0.02) continue;
      // through the crowns toward the moon: three looks along the moonlight
      float occ = 1.0; int id2; float pt;
      for (int k = 1; k <= 3; k++) {
        vec3 qq = q + MOON * (float(k) + j - 0.5) * 1.1;
        float dd = mapG(qq, id2, pt);
        if (id2 == 2) occ *= mix(smoothstep(-0.05, 0.25, dd), 1.0, pt > 0.5 ? smoothstep(0.62, 0.8, vnoise(qq * 6.0 + vec3(uTime * 0.5, 0.0, uTime * 0.3))) * 0.8 : 0.0);
      }
      acc += MOONC * occ * near * exp(-q.y * 0.25);
    }
    col += acc / float(NS) * tmax * 0.009 * clr;
  }
  return col;
}
`;
