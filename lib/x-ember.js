// The ember world (s24-anger): a bed of wood coals in a stone hearth at night, seen from just above
// the coals. The coals smoulder and breathe; on "anger" they flare: the cracks run hot, small flames
// lick up and sparks spit and rise. On "judgment" a cold white light falls from above (its edge
// travels down through the haze onto the bed) and the coals sink under it to a dull red.
// Bed of coals around the origin, y up, the hearth wall behind at +z. Pure function of uTime.
export const EMBER_UNIFORMS = {
  uFocus: 0.32, uAper: 0.004,
  uHeat: 0.4,        // overall heat of the bed 0..1.3
  uFlare: 0.0,       // the angry flare envelope 0..1
  uCold: 0.0,        // cold light amount 0..1
  uColdY: -1.0,      // the cold light's sweeping edge (x, m): lit where x < edge
  uAngerT: 1e4,      // song time of "anger"
};

export const EMBER_GLSL = /* glsl */ `
uniform float uFocus, uAper, uHeat, uFlare, uCold, uColdY, uAngerT;
const vec3 COLD_DIR = normalize(vec3(0.4, 1.0, 0.3));   // towards the cold light
const vec3 COLD_COL = vec3(0.78, 0.86, 1.0);

// thin-lens primary ray
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

// 3x3 cell noise: x = F2 - F1 (0 on the joints between cells), y = cell id
vec2 emCells(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j), o = hash22(n + g), r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(n + g); } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}
// ---- the coals: two interleaved layers of irregular lumps on a gentle mound ----
const float G = 0.05;
float pileY(vec2 q) { return 0.022 * exp(-dot(q, q) * 2.2) + 0.008 * (vnoise(q * 9.0) - 0.5); }
vec3 gLP, gRad;   // local position and half size of the coal last found nearest (for shading)
float bedMask(vec2 c) { return length((c - vec2(0.0, 0.08)) * vec2(1.0, 0.8)) + 0.08 * vnoise(c * 8.0); }
float coalLayer(vec3 p, float ofs, float yAdd, float keep, out float cid, out vec3 lpo, out vec3 rado) {
  vec2 q = p.xz / G + ofs;
  vec2 c0 = floor(q);
  float d = 1e9; cid = 0.0; lpo = vec3(0); rado = vec3(1);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec3 h = hash33(vec3(c, ofs * 7.0));
    vec2 cc = (c + 0.25 + 0.5 * h.xy - ofs) * G;
    if (h.z > keep || bedMask(cc) > 0.62) continue;
    // chunks of very different sizes, from embers to fist-sized pieces
    float s = 0.35 + 1.0 * pow(hash12(c + 3.3 + ofs), 1.5);
    // a chunk of charred wood: a block, long along its grain, split and broken
    vec3 rad = vec3(0.55 + 0.45 * h.y, 0.24 + 0.14 * h.x, 0.3 + 0.16 * h.z) * G * s;
    vec3 pc = vec3(cc.x, pileY(cc) + yAdd + rad.y * 0.45, cc.y);
    vec3 lp = p - pc;
    lp.xz = rot(6.2831 * h.x) * lp.xz;
    lp.xy = rot((h.y - 0.5) * 0.6) * lp.xy;
    lp.yz = rot((h.z - 0.5) * 0.5) * lp.yz;
    float e = sdEllipsoid(lp, rad * vec3(1.0, 1.15, 1.1));
    e = smin(e, sdEllipsoid(lp - rad * vec3(0.45, 0.2, -0.2), rad * vec3(0.6, 0.85, 0.8)), 0.006);
    vec3 n1 = normalize(hash33(vec3(c, 5.0 + ofs)) - 0.5), n2 = normalize(hash33(vec3(c, 9.0 + ofs)) - 0.5);
    vec3 n3 = normalize(hash33(vec3(c, 13.0 + ofs)) - 0.5);
    e = max(e, dot(lp, n1) - length(rad * n1) * 0.55);
    e = max(e, dot(lp, n2) - length(rad * n2) * 0.7);
    e = max(e, dot(lp, n3) - length(rad * n3) * 0.75);
    if (e < d) { d = e; cid = hash12(c * 1.7 + ofs); lpo = lp; rado = rad; }
  }
  return d;
}
// three split half-logs lying across the bed, burnt through in places
float logsSD(vec3 p, out float cid, out vec3 lpo, out vec3 rado) {
  float d = 1e9; cid = 0.0; lpo = vec3(0); rado = vec3(1);
  for (int i = 0; i < 3; i++) {
    float f = float(i);
    vec3 c = vec3(-0.14 + 0.15 * f, 0.0, 0.04 + 0.11 * hash11(f * 3.1) + 0.06 * f);
    float r = 0.028 + 0.012 * hash11(f * 5.7), L = 0.11 + 0.06 * hash11(f * 7.3);
    vec3 lp = p - c - vec3(0.0, r * 0.55, 0.0);
    lp.xz = rot(0.5 + 1.9 * f + 0.4 * hash11(f)) * lp.xz;
    lp.xy = rot(0.08 * (f - 1.0)) * lp.xy;
    // a half-cylinder along x (split face up and rough), with charred, eaten-away ends
    float cyl = max(length(lp.yz) - r, abs(lp.x) - L);
    float split = lp.y - r * (0.15 + 0.15 * hash11(f * 2.0)) - 0.004 * vnoise(lp.xz * 300.0);
    float e = max(cyl, split);
    e += 0.006 * smoothstep(L * 0.6, L, abs(lp.x)) * vnoise(lp * 80.0) + 0.004 * (vnoise(lp * 60.0) - 0.5);
    if (e < d) { d = e; cid = 0.3 + 0.2 * f; lpo = lp.xzy; rado = vec3(L, r, r); }
  }
  return d;
}
// id: 1 coal, 2 ash floor, 3 hearth wall
float mapE(vec3 p, out float id, out float cid) {
  float c1, c2; vec3 l1, l2, r1, r2;
  if (p.y > 0.085) { id = 1.0; cid = 0.0; gLP = vec3(0); gRad = vec3(1); float w = 1.3 - p.z; if (w < p.y - 0.075) id = 3.0; return min(p.y - 0.075, w); }
  float a = coalLayer(p, 0.0, 0.0, 0.72, c1, l1, r1);
  float b = logsSD(p, c2, l2, r2);
  float d = a; cid = c1; gLP = l1; gRad = r1;
  if (b < d) { d = b; cid = c2; gLP = l2; gRad = r2; }
  // chunky, split surface
  d += 0.003 * (vnoise(p * 90.0) - 0.5) + 0.0012 * (vnoise(p * 260.0) - 0.5);
  id = 1.0;
  float fl = p.y + 0.004 - 0.008 * fbm(p.xz * 14.0, 3) - 0.004 * exp(-dot(p.xz, p.xz) * 6.0);
  if (fl < d) { d = fl; id = 2.0; }
  float wall = 1.3 - p.z + 0.02 * fbm(p.xy * 6.0, 2);
  if (wall < d) { d = wall; id = 3.0; }
  return d;
}
float mapD(vec3 p) { float i, c; return mapE(p, i, c); }
vec3 normE(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0004;
  return normalize(e.xyy * mapD(p + e.xyy) + e.yyx * mapD(p + e.yyx) + e.yxy * mapD(p + e.yxy) + e.xxx * mapD(p + e.xxx));
}
float marchE(vec3 ro, vec3 rd, out float id, out float cid) {
  float t = 0.01;
  // jump straight down to the top of the bed
  if (ro.y > 0.08 && rd.y < 0.0) t = max(t, (ro.y - 0.08) / -rd.y);
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float d = mapE(p, id, cid);
    if (d < 0.0004 * t + 0.00006) return t;
    t += d * 0.85;
    if (t > 3.0) break;
  }
  id = 0.0; return -1.0;
}
float aoE(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.006 * float(i); o += (h - mapD(p + n * h)) * s; s *= 0.6; }
  return sat(1.0 - o * 28.0);
}
float shadowE(vec3 p, vec3 l) {
  float r = 1.0, t = 0.004;
  for (int i = 0; i < 22; i++) { float h = mapD(p + l * t); r = min(r, 10.0 * h / t); t += clamp(h, 0.003, 0.03); if (r < 0.01 || t > 0.4) break; }
  return sat(r);
}

// ember colour for a heat 0..~1.6 (a blackbody ramp: dull red, orange, yellow-white)
vec3 blackbody(float h) {
  h = max(h, 0.0);
  vec3 c = vec3(1.0, 0.13, 0.02) * smoothstep(0.0, 0.4, h);
  c = mix(c, vec3(1.0, 0.42, 0.07), smoothstep(0.4, 0.9, h));
  c = mix(c, vec3(1.0, 0.75, 0.38), smoothstep(0.9, 1.5, h));
  return c * (h * h * 2.6 + h * 0.5);
}
// the heat field: slow breathing patches that run hotter with the flare
float heatAt(vec3 p) {
  float n = fbm(vec3(p.xz * 11.0, uTime * 0.35) + vec3(0.0, 0.0, p.y * 20.0), 3);
  float fl = vnoise(vec3(p.xz * 26.0, uTime * 3.2)) * uFlare;
  return uHeat * (0.45 + 0.9 * n) + 0.35 * fl;
}

// glow lights: hot pockets inside the bed that light the coals round them
vec3 glowPos(int i) { float f = float(i); return vec3((hash11(f * 3.1) - 0.5) * 0.36, 0.006, (hash11(f * 7.3) - 0.5) * 0.36 + 0.05); }
vec3 glowCol(int i) {
  float f = float(i);
  float k = uHeat * (0.6 + 0.6 * vnoise(vec2(uTime * (0.5 + 3.0 * uFlare) + f * 9.0, f)));
  return blackbody(0.55 + 0.45 * k) * k;
}

// small flames licking up from the coals during the flare
vec3 flameLick(vec3 ro, vec3 rd, vec3 b, float h, float k, float seed, float depth) {
  if (k <= 0.001) return vec3(0);
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = h * k * (0.7 + 0.6 * vnoise(vec2(uTime * 9.0 + seed, 1.0)));
  float y = q.y / hh;
  if (y < -0.3 || y > 1.4) return vec3(0);
  float sw = (vnoise(vec2(uTime * 4.0 + seed, 3.0)) - 0.5) * 1.2;
  vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.35 * y * y;
  float x = length(rr) / (hh * 0.3);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.45) * pow(1.0 - yy, 0.9) * 1.8 + 0.05;
  float tongue = 0.7 + 0.6 * vnoise(vec2(y * 4.0 - uTime * 7.0, seed));
  float body = smoothstep(1.0, 0.4, x / (prof * tongue)) * smoothstep(-0.1, 0.1, y) * smoothstep(1.2, 0.7, y);
  float core = smoothstep(0.5, 0.1, x / prof) * smoothstep(0.0, 0.15, y) * smoothstep(0.6, 0.2, y);
  vec3 c = vec3(1.0, 0.32, 0.05) * body * 2.2 + vec3(1.0, 0.6, 0.25) * core * 3.5;
  return c * k;
}

// sparks: a few stray pops while smouldering, a burst on the flare
vec3 sparks(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0);
  for (int i = 0; i < 44; i++) {
    float f = float(i);
    float b = i < 8 ? uAngerT - 1.2 + 4.0 * hash11(f * 1.37) : uAngerT + 0.04 + 1.1 * pow(hash11(f * 2.71), 1.6);
    float life = 0.5 + 0.9 * hash11(f * 5.9);
    float age = uTime - b;
    if (age < 0.0 || age > life) continue;
    vec3 p0 = vec3((hash11(f * 4.3) - 0.5) * 0.32, 0.03, (hash11(f * 8.1) - 0.5) * 0.3 + 0.06);
    vec3 v = vec3((hash11(f * 6.7) - 0.5) * 0.35, 0.35 + 0.65 * hash11(f * 9.1), (hash11(f * 3.9) - 0.5) * 0.3);
    if (i < 8) v *= 0.6;
    float a1 = age, a0 = max(age - 0.02, 0.0);
    vec3 w1 = vec3(sin(a1 * 13.0 + f) , 0.0, cos(a1 * 11.0 + f * 2.0)) * 0.012 * a1;
    vec3 w0 = vec3(sin(a0 * 13.0 + f) , 0.0, cos(a0 * 11.0 + f * 2.0)) * 0.012 * a0;
    vec3 s1 = p0 + v * a1 * exp(-a1 * 0.6) + vec3(0.0, 0.08, 0.0) * a1 * a1 + w1;
    vec3 s0 = p0 + v * a0 * exp(-a0 * 0.6) + vec3(0.0, 0.08, 0.0) * a0 * a0 + w0;
    // distance from the ray to the streak s0..s1
    vec3 ba = s1 - s0; vec3 oa = ro - s0;
    float bb = max(dot(ba, ba), 1e-9), rb = dot(rd, ba), ob = dot(oa, ba), or_ = dot(oa, rd);
    float den = bb - rb * rb;
    float sb = clamp((ob - rb * or_) / max(den, 1e-12), 0.0, 1.0);
    vec3 sp = s0 + ba * sb;
    float tc = dot(sp - ro, rd);
    if (tc < 0.0 || tc > depth) continue;
    float h2 = dot(sp - ro, sp - ro) - tc * tc;
    float fade = (1.0 - age / life); fade *= fade;
    float br = (0.6 + 0.8 * hash11(f * 11.3)) * fade * (0.7 + 0.3 * sin(age * 40.0 + f));
    vec3 col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.75, 0.4), fade);
    acc += col * br * (0.0000005 / (0.00000025 + h2) + 0.000004 / (0.00002 + h2) * 0.25);
  }
  return acc;
}

vec3 embers(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  // heat shimmer: the air over the bed bends the view, most just above the coals
  {
    vec2 uv = fc / uRes.y;
    float k = 0.0012 * (0.4 + uHeat) * smoothstep(0.75, 0.2, fc.y / uRes.y);
    rd = normalize(rd + k * vec3(vnoise(vec3(uv * 18.0, uTime * 2.5 - uv.y * 6.0)) - 0.5, vnoise(vec3(uv * 18.0 + 7.0, uTime * 2.5 - uv.y * 6.0)) - 0.5, 0.0));
  }
  float id, cid;
  float t = marchE(ro, rd, id, cid);
  vec3 col = vec3(0); float depth = 3.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normE(p), v = -rd;
    depth = t;
    float ao = aoE(p, n);
    vec3 alb; float rough = 0.85; vec3 emit = vec3(0);
    if (id < 1.5) {
      // charred wood: the alligator crackle of char, glowing in its joints, ash-grey edges
      float idd, cc2; mapE(p, idd, cc2);
      vec3 lw = gLP;                                        // local coords, metres
      vec3 an = abs(lw / gRad);
      // glowing charcoal: soft orange patches and gradients, brightest in the gaps and undersides
      // where the heat collects, sinking under a velvety grey-black crust; a fine alligator
      // texture shows only where it is hottest
      float h = heatAt(p);
      float under = smoothstep(0.35, -0.7, n.y);
      float low = smoothstep(0.028, 0.0, p.y);
      float gapAO = 1.0 - aoE(p, n);                                    // crevices between pieces
      float patchy = smoothstep(0.38, 0.78, fbm(p * 55.0 + vec3(0.0, uTime * 0.12, cid * 9.0), 4));
      float crust = smoothstep(0.38, 0.62, fbm(p * 140.0 + cid * 5.0, 3)) * smoothstep(-0.3, 0.6, n.y);
      float heat = h * (0.5 * under + 0.5 * low + 0.6 * gapAO + 0.4 * patchy * (1.0 - crust));
      // alligator: short irregular checks, filled with glow, only in the hottest patches
      vec2 cs = emCells(vec2(p.x + p.z, p.y * 1.4) * 260.0 + cid * 7.0 + 0.6 * vec2(vnoise(p * 300.0), vnoise(p * 300.0 + 4.0)));
      float alli = smoothstep(0.12, 0.0, cs.x) * smoothstep(0.35, 0.75, heat);
      heat += 0.25 * alli * h;
      float ashSkin = crust * (1.0 - 0.6 * sat(heat));
      alb = mix(vec3(0.03, 0.028, 0.027), vec3(0.34, 0.33, 0.32), ashSkin);
      alb *= 0.75 + 0.5 * vnoise(p * 600.0);
      rough = 0.95;
      float hot = heat * (1.0 - 0.6 * ashSkin);
      hot *= 0.85 + 0.3 * cid;
      emit = blackbody(hot);
      alb *= 1.0 - 0.5 * sat(hot);
    } else if (id < 2.5) {
      // fine grey ash on the hearth floor, speckled with tiny live grains
      alb = vec3(0.2, 0.195, 0.19) * (0.75 + 0.3 * vnoise(p.xz * 200.0)) * (0.8 + 0.3 * fbm(p.xz * 40.0, 3));
      float g = 0.0;
      emit = blackbody(0.6) * g * uHeat * (0.5 + 0.5 * sin(uTime * 2.0 + hash12(floor(p.xz * 700.0)) * 30.0));
      emit += blackbody(heatAt(p) * 0.5) * 0.25 * smoothstep(0.0, -0.004, p.y) * step(0.97, hash12(floor(p.xz * 500.0)));
    } else {
      // the hearth wall: soot-dark fieldstone
      vec2 ve = voronoiEdge(p.xy * vec2(9.0, 13.0));
      alb = vec3(0.12, 0.1, 0.09) * (0.6 + 0.6 * fbm(p.xy * 30.0, 3)) * (0.35 + 0.65 * smoothstep(0.0, 0.05, ve.x));
      rough = 0.9;
    }
    // light from the hot pockets of the bed
    vec3 dif = vec3(0);
    for (int i = 0; i < 6; i++) {
      vec3 L = glowPos(i) - p; float d2 = dot(L, L); L *= inversesqrt(d2);
      dif += glowCol(i) * sat(dot(n, L) * 0.7 + 0.3) * 0.0016 / (0.0006 + d2);
    }
    // the wall and the tops of the coals take the bed's broad glow
    dif += blackbody(0.6) * uHeat * 0.12 * sat(-n.z * 0.6 + 0.4) * exp(-max(p.y, 0.0) * 4.0) * (id > 2.5 ? 1.0 : 0.3);
    col = emit + alb * dif * ao;
    // the cold light, falling from above (its edge travels down)
    if (uCold > 0.001) {
      float lit = smoothstep(uColdY + 0.04, uColdY - 0.04, p.x - 0.4 * p.z) * uCold;
      float pool = smoothstep(0.55, 0.15, length(p.xz - vec2(-0.03, 0.08)));
      if (lit * pool > 0.001) {
        float sh = shadowE(p + n * 0.002, COLD_DIR);
        float nl = sat(dot(n, COLD_DIR));
        vec3 hv = normalize(COLD_DIR + v);
        float spec = pow(sat(dot(n, hv)), 12.0) * 0.03;
        col += COLD_COL * (alb * nl / PI + spec) * sh * lit * pool * 3.0 * (0.4 + 0.6 * ao);
      }
    }
    col += vec3(0.0015, 0.0018, 0.0026) * alb * ao;   // faint night fill: never crushed
    // the bed's own glow, bounced from the hearth and the haze, on the ash of the tops
    col += blackbody(0.55) * uHeat * 0.15 * alb * sat(n.y * 0.6 + 0.4) * ao;
    // the far bed melts into the dark
    col *= exp(-max(p.z - 0.3, 0.0) * 4.5);
  }
  // haze over the bed: lit red from below and, at the end, by the cold shaft
  {
    float tmax = min(depth, 1.6);
    float dt = tmax / 8.0;
    float jit = hash12(fc + fract(uTime * 7.0) * 61.0);
    vec3 acc = vec3(0); float trans = 1.0;
    for (int i = 0; i < 8; i++) {
      vec3 q = ro + rd * (dt * (float(i) + jit));
      float smoke = fbm(vec3(q.x * 7.0, q.y * 5.0 - uTime * 0.45, q.z * 7.0), 2);
      float dens = (0.25 + 1.4 * smoothstep(0.45, 0.85, smoke)) * exp(-max(q.y, 0.0) * 4.0) * 0.6;
      vec3 red = blackbody(0.7) * uHeat * exp(-max(q.y, 0.0) * 10.0) * 0.12 * smoothstep(0.5, 0.0, length(q.xz - vec2(0.0, 0.05)));
      float shaft = smoothstep(uColdY + 0.04, uColdY - 0.04, q.x - COLD_DIR.x / COLD_DIR.y * q.y - 0.4 * q.z) * smoothstep(0.42, 0.12, length((q.xz - COLD_DIR.xz / COLD_DIR.y * q.y) - vec2(-0.03, 0.08)));
      vec3 cold = COLD_COL * uCold * shaft * 1.4;
      acc += trans * (red + cold) * dens * dt;
      trans *= exp(-dens * dt * 0.6);
    }
    col = col * trans + acc;
  }
  col += sparks(ro, rd, depth);
  if (!(abs(col.x + col.y + col.z) < 1e6)) col = vec3(0.0);
  return col;
}
`;
