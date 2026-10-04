// s03's world: "Blessed are the gentle; they will inherit the earth." A ploughed field at night under
// a low moon. Furrows run away from us toward a line of dark hills; the moon hangs low over them, so
// the ridges of the furrows catch a silver sheen. At the origin, on the crest of a furrow, a seedling
// pushes out of the soil: the stem's hook (uUnc 0) straightens and its two seed leaves open (uUnc 1),
// a dewdrop on one of them. The camera starts in macro on the seedling and rises over the field.
// Units are metres; ground near y = 0, furrows along +z.
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const FIELD_UNIFORMS = { ...NATURE_UNIFORMS, uUnc: 0, uWide: 0 };

export const FIELD_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uUnc, uWide;
float uHusk = 0.0;
const vec3 MOON = normalize(vec3(-0.9, 0.3, 0.62));
const vec3 MOONC = vec3(0.55, 0.66, 0.92);

// the land: rolling field, furrows, clods and crumbs, hills far off. lod: how fine to go (0 far, 1 near)
float landH(vec2 xz, float lod) {
  float z = xz.y;
  // the hills on the horizon and the gentle roll of the field
  float hills = 0.0;
  float far = smoothstep(160.0, 420.0, z + 0.25 * abs(xz.x));
  if (far > 0.0) {
    vec3 hn = vnoised(xz * 0.0024 + vec2(3.1, 1.7));
    hills = far * (150.0 * fbm(xz * 0.0021 + vec2(3.1, 1.7), 5) + 60.0 * smoothstep(0.35, 0.8, vnoise(xz * 0.0009)) - 35.0);
    hills = max(hills, 0.0);
  }
  float roll = 3.0 * (fbm(xz * 0.01, 3) - fbm(vec2(0.0), 3));
  // the furrows: ridges 0.75 m apart, fading out where the plough stops far off
  float fw = 1.0 - smoothstep(380.0, 650.0, z);
  float wob = (0.06 * (vnoise(vec2(z * 0.05, 1.0)) - 0.5) + 1.2 * (fbm(vec2(z * 0.006, xz.x * 0.004), 2) - 0.5)) * smoothstep(0.3, 8.0, length(xz));
  float ph = (xz.x + wob) / 0.75;
  float fr = 0.5 + 0.5 * cos(6.2831853 * ph);
  float furrow = 0.085 * pow(fr, 1.3) * fw * (0.75 + 0.5 * vnoise(xz * vec2(0.05, 0.01)) * smoothstep(0.3, 8.0, length(xz)));
  float h = hills + roll + furrow;
  // the little heave of earth the seedling has pushed up, cracked round its stem

  if (lod > 0.02) {
    // clods: lumps of turned earth on the ridges
    float cl = fbm(xz * 9.0 + 3.0, 4);
    h += lod * 0.035 * (cl - 0.5) * (0.4 + 0.6 * fr) * fw * smoothstep(0.006, 0.035, length(xz));
  }
  if (lod > 0.3) {
    // the tilth: crumbs of broken earth at three sizes, each a little lump with a sharp crevice round it
    float k = smoothstep(0.3, 0.7, lod);
    vec2 wq = xz + 0.004 * vec2(vnoise(xz * 90.0), vnoise(xz * 90.0 + 5.0));
    vec2 c1 = voronoiEdge(wq * 30.0);
    h += k * 0.006 * smoothstep(0.0, 0.3, c1.x) * (0.3 + 0.9 * c1.y);
    if (lod > 0.6) {
      vec2 c2 = voronoiEdge(wq * 95.0 + 3.0);
      h += smoothstep(0.6, 0.85, lod) * 0.0024 * smoothstep(0.0, 0.28, c2.x) * (0.2 + c2.y);
      if (lod > 0.8) {
        vec2 c3 = voronoiEdge(wq * 260.0 + 9.0);
        h += smoothstep(0.8, 1.0, lod) * 0.0015 * smoothstep(0.0, 0.3, c3.x) * (0.2 + c3.y);
        vec2 c4 = voronoiEdge(wq * 700.0 + 2.0);
        h += smoothstep(0.85, 1.0, lod) * 0.0005 * smoothstep(0.0, 0.35, c4.x) * (0.3 + c4.y);
        // a few small pebbles
        vec2 cp = voronoiEdge(xz * 140.0 + 17.0);
        h += smoothstep(0.8, 1.0, lod) * 0.0011 * sqrt(smoothstep(0.0, 0.3, cp.x)) * step(0.95, cp.y);
      }
    }
  }
  return h;
}
float lodAt(float t) { return sat(1.6 - 0.25 * log2(max(t, 0.01) * 4.0)); }

// the seedling: a stem rising from the crest at the origin, its hook straightening, two seed leaves
const vec3 SBASE = vec3(0.0, 0.0, 0.0);
float baseY() { return 0.0; }
// the row of sprouts along the nearest furrow crest: one every SPZ metres, each with its own size,
// turn and lean. Seedling-local coordinates have the stem's foot at the origin.
const float SPZ = 0.11;
float crestX(float z) {
  vec2 xz = vec2(0.0, z);
  float wob = (0.06 * (vnoise(vec2(z * 0.05, 1.0)) - 0.5) + 1.2 * (fbm(vec2(z * 0.006, 0.0), 2) - 0.5)) * smoothstep(0.3, 8.0, abs(z));
  return -wob;
}
vec4 sproutCell(float k) {
  // x, base y, z of the stem's foot; w = seed
  float h = hash11(k * 7.31 + 2.0);
  float z = (k + 0.5) * SPZ + (h - 0.5) * SPZ * 0.5;
  float x = crestX(z) + (hash11(k * 3.7) - 0.5) * 0.035;
  return vec4(x, landH(vec2(x, z), 0.25) - 0.006, z, h);
}
vec3 sproutLocal(vec3 p, vec4 c, out float sc) {
  sc = 1.3 + 0.6 * fract(c.w * 13.7);
  vec3 q = p - c.xyz;
  float a = c.w * 6.2831 + 0.08 * sin(uTime * 1.3 + c.w * 20.0);
  q.xz = rot(a) * q.xz;
  q.xy = rot(0.12 * (fract(c.w * 31.0) - 0.5) + 0.03 * sin(uTime * 1.7 + c.w * 9.0)) * q.xy;
  return q / sc;
}
vec3 nearestSprout(vec3 p, out float sc, out float seed) {
  float k = floor(p.z / SPZ);
  vec4 c = sproutCell(k);
  vec4 c2 = sproutCell(k + (fract(p.z / SPZ) > 0.5 ? 1.0 : -1.0));
  if (length(p - c2.xyz) < length(p - c.xyz)) c = c2;
  seed = c.w;
  return sproutLocal(p, c, sc);
}
// stem point along s (0..1) and its tangent; the hook bends toward -z when closed
void stemFrame(float s, out vec3 p, out vec3 tg) {
  float len = mix(0.009, 0.013, uUnc);
  float u = uUnc;
  // integrate the bend in closed form: curvature grows toward the top
  float bend = (1.0 - u) * 3.4 + 0.25;
  float a = bend * s * s;         // angle from vertical at s
  // position by a few-step sum
  vec3 q = vec3(0.0, baseY(), 0.0);
  const int N = 8;
  for (int i = 0; i < N; i++) {
    float si = (float(i) + 0.5) / float(N) * s;
    float ai = bend * si * si;
    q += vec3(0.12 * sin(si * 3.0) * uUnc, cos(ai), -sin(ai)) * (len * s / float(N));
  }
  p = q; tg = vec3(0.0, cos(a), -sin(a));
}
// leaf-local coordinates of p (x along the leaf from its centre, y off its face, z across)
vec3 leafLocal(vec3 p, vec3 tip, vec3 tg, float side, out float L) {
  float open = mix(0.12, 1.25, uUnc);
  vec3 dir = normalize(tg * cos(open) + vec3(side, 0.0, 0.0) * sin(open));
  vec3 nrm = normalize(cross(dir, vec3(0.0, 0.0, 1.0))) * side;
  L = mix(0.0036, 0.0056, uUnc);
  vec3 q = p - (tip + dir * L * 0.95);
  vec3 az = normalize(cross(dir, nrm));
  return vec3(dot(q, dir), dot(q, nrm), dot(q, az));
}
float leafSD(vec3 p, vec3 tip, vec3 tg, float side) {
  // a seed leaf: a thick, slightly cupped oval hinged at the stem tip, opening sideways
  float open = mix(0.12, 1.25, uUnc);
  vec3 up = tg;
  vec3 sd = vec3(side, 0.0, 0.0);
  vec3 dir = normalize(up * cos(open) + sd * sin(open));
  vec3 nrm = normalize(cross(dir, vec3(0.0, 0.0, 1.0))) * side;
  float L = mix(0.0042, 0.0068, uUnc);
  vec3 c = tip + dir * L * 0.95;
  vec3 q = p - c;
  // leaf frame
  vec3 ax = dir, ay = nrm, az = normalize(cross(ax, ay));
  vec3 lq = vec3(dot(q, ax), dot(q, ay), dot(q, az));
  lq.y -= 0.18 * (lq.z * lq.z) / 0.004 + 0.12 * (lq.x * lq.x) / 0.006;   // cupped, the tip curling down
  return sdEllipsoid(lq, vec3(L, 0.00028, L * 0.72)) - 0.00008;
}
float seedOne(vec3 p, out int part);
float seedSD(vec3 pw, out int part) {
  part = 0;
  // cheap bound: far from the crest line or high above the soil
  float cx = crestX(pw.z);
  float bd = max(abs(pw.x - cx) - 0.1, pw.y - 0.2);
  if (bd > 0.0 || pw.z < -0.2 || pw.z > 12.0) return max(bd, 0.02);
  float k = floor(pw.z / SPZ);
  float d = 1e9;
  for (int j = -1; j <= 1; j++) {
    vec4 c = sproutCell(k + float(j));
    float sc; vec3 q = sproutLocal(pw, c, sc);
    int pt; float dd = seedOne(q, pt) * sc;
    if (dd < d) { d = dd; part = pt; }
  }
  return d;
}
float seedOne(vec3 p, out int part) {
  part = 0;
  vec3 bb = vec3(0.0);
  if (length(p - bb - vec3(0.0, 0.02, 0.0)) > 0.05) return length(p - bb - vec3(0.0, 0.02, 0.0)) - 0.04;
  float d = 1e9;
  vec3 prev, tg; stemFrame(0.0, prev, tg);
  for (int i = 1; i <= 14; i++) {
    vec3 cur; stemFrame(float(i) / 14.0, cur, tg);
    float r = mix(0.00085, 0.0006, float(i) / 14.0);
    d = min(d, sdCapsule(p, prev, cur, r));
    prev = cur;
  }
  vec3 tip; stemFrame(1.0, tip, tg);
  float l1 = leafSD(p, tip, tg, 1.0), l2 = leafSD(p, tip, tg, -1.0);
  float lf = min(l1, l2);
  if (lf < d) { part = 1; d = lf; }
  // the seed coat, split, still clinging to the tip of the left leaf
  float L; vec3 hq = leafLocal(p, tip, tg, -1.0, L);
  hq -= vec3(L * 0.8, 0.0, 0.0);
  float husk = abs(sdEllipsoid(hq, vec3(L * 0.5, L * 0.32, L * 0.48))) - 0.00012;
  husk = max(husk, -hq.x - L * 0.15);
  husk = max(husk, -(hq.y + 0.25 * hq.x) );      // split open on its underside
  if (husk < d && fract(sin(dot(floor(uCamPos.xz * 0.0), vec2(1.0))) + 0.0) < 1.0 && uHusk > 0.5) { part = 2; d = husk; }
  return d;
}
// the dewdrop, resting on the upper face of the right leaf near its tip
vec4 dewDrop() {
  vec3 tip, tg; stemFrame(1.0, tip, tg);
  float open = mix(0.12, 1.25, uUnc);
  vec3 dir = normalize(tg * cos(open) + vec3(1.0, 0.0, 0.0) * sin(open));
  vec3 nrm = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
  float L = mix(0.0036, 0.0056, uUnc);
  float r = 0.00075;
  // the upper face is -nrm; the drop sits in the leaf's cup, a little out from the centre
  return vec4(tip + dir * L * 1.25 - nrm * (r * 0.75 + 0.0004), r);
}

float mapF(vec3 p, float lod, out int id) {
  id = 1;
  float g = (p.y - landH(p.xz, lod)) * 0.6;
  int part; float s = seedSD(p, part);
  if (s < g) { id = 2 + part; return s; }
  return g;
}
float marchF(vec3 ro, vec3 rd, out int id) {
  float t = 0.002;
  for (int i = 0; i < 300; i++) {
    vec3 p = ro + rd * t;
    float lod = lodAt(t);
    float d = mapF(p, lod, id);
    if (d < 0.00025 * t) return t;
    t += max(d, 0.0001 + 0.0006 * t + 0.003 * max(t - 5.0, 0.0));
    if (t > 3000.0 || p.y > 260.0) break;
  }
  id = 0; return -1.0;
}
vec3 normF(vec3 p, float t, int id) {
  float lod = lodAt(t);
  if (id == 1) {
    float e = max(0.0003, 0.0012 * t);
    float h = landH(p.xz, lod);
    return normalize(vec3(h - landH(p.xz + vec2(e, 0.0), lod), e, h - landH(p.xz + vec2(0.0, e), lod)));
  }
  const vec2 k = vec2(1.0, -1.0) * 0.00008; int i;
  return normalize(k.xyy * mapF(p + k.xyy, lod, i) + k.yyx * mapF(p + k.yyx, lod, i) + k.yxy * mapF(p + k.yxy, lod, i) + k.xxx * mapF(p + k.xxx, lod, i));
}
float shadowF(vec3 p, float t0) {
  float s = 1.0, t = max(0.0005, 0.002 * t0);
  float lod = lodAt(t0);
  int id;
  for (int i = 0; i < 32; i++) {
    vec3 q = p + MOON * t;
    float h = mapF(q, lod, id);
    s = min(s, 8.0 * h / t);
    t += clamp(h, 0.0004 + 0.002 * t0, 6.0);
    if (s < 0.02 || t > 60.0) break;
  }
  return sat(s);
}

vec3 skyF(vec3 rd) {
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.045, 0.06, 0.1), vec3(0.004, 0.006, 0.014), pow(h, 0.45));
  c += MOONC * 0.05 * pow(sat(dot(normalize(rd.xz), normalize(MOON.xz))), 3.0) * exp(-h * 5.0);
  float md = dot(rd, MOON);
  c += MOONC * (0.05 * pow(sat(md), 8.0) + 0.25 * pow(sat(md), 120.0));
  c += starField(rd, 1.0) * smoothstep(0.0, 0.12, rd.y) * (1.0 - 0.8 * pow(sat(md), 6.0));
  // the moon: a soft-edged disc with faint maria
  float ang = acos(clamp(md, -1.0, 1.0));
  float R = 0.0105;
  if (ang < R * 1.4) {
    vec3 tu = normalize(cross(MOON, vec3(0, 1, 0))), tv = cross(tu, MOON);
    vec2 q = vec2(dot(rd, tu), dot(rd, tv)) / R;
    float mar = 0.75 + 0.25 * fbm(q * 2.5 + 4.0, 3);
    c += vec3(1.0, 0.97, 0.9) * 6.0 * smoothstep(1.0, 0.95, length(q)) * mar;
  }
  // a thin haze lying along the horizon, lit toward the moon
  c += MOONC * 0.035 * exp(-abs(rd.y) * 30.0) * (0.5 + 0.5 * pow(sat(md + 0.2), 3.0));
  return c;
}

vec3 shadeF(vec3 ro, vec3 rd, vec3 rd0, out float depth) {
  int id; float t = marchF(ro, rd, id);
  vec3 col;
  depth = 1e4;
  if (t > 0.0) {
    depth = t;
    vec3 p = ro + rd * t; vec3 n = normF(p, t, id); vec3 v = -rd;
    float sh = shadowF(p + n * max(0.0002, 0.001 * t), t);
    float nl = sat(dot(n, MOON));
    if (id == 1) {
      // dark tilled earth: damp, crumbly, a little sheen on the turned faces
      float lod = lodAt(t);
      float g = fbm(p.xz * 30.0, 3);
      vec3 alb = vec3(0.1, 0.07, 0.048) * (0.6 + 0.8 * g);
      if (lod > 0.3) {
        vec2 c1 = voronoiEdge(p.xz * 26.0 + 0.3 * vec2(vnoise(p.xz * 40.0), vnoise(p.xz * 40.0 + 9.0)));
        alb *= mix(1.0, 0.65 + 0.7 * c1.y, smoothstep(0.3, 0.7, lod));
        vec2 bq = p.xz * 900.0;
        n = normalize(n + 0.3 * smoothstep(0.6, 1.0, lod) * vec3(vnoise(bq) - 0.5, 0.0, vnoise(bq + 3.7) - 0.5));
        nl = sat(dot(n, MOON));
      }
      alb *= 0.75 + 0.5 * fbm(p.xz * 0.05, 3);
      if (lod > 0.6) {
        vec2 wq = p.xz + 0.004 * vec2(vnoise(p.xz * 90.0), vnoise(p.xz * 90.0 + 5.0));
        vec2 c2 = voronoiEdge(wq * 95.0 + 3.0);
        alb *= 0.7 + 0.6 * c2.y;
        vec2 cp = voronoiEdge(p.xz * 140.0 + 17.0);
        float peb = step(0.95, cp.y) * smoothstep(0.0, 0.1, cp.x);
        alb = mix(alb, vec3(0.085, 0.075, 0.06) * (0.6 + 0.6 * fract(cp.y * 37.0)), peb);
        vec2 c4 = voronoiEdge(wq * 700.0 + 2.0);
        alb *= 0.75 + 0.5 * c4.y;
        // crumbs: tops catch the light, crevices fall into shadow
        float cav = landH(p.xz, lod) - landH(p.xz, 0.25);
        alb *= mix(0.5, 1.3, smoothstep(-0.002, 0.005, cav));
      }
      alb *= mix(1.0, 0.4, smoothstep(15.0, 150.0, t)) * mix(1.0, 0.35, smoothstep(250.0, 500.0, p.z));
      float rough = 0.92 - 0.2 * smoothstep(0.55, 0.8, fbm(p.xz * 14.0 + 5.0, 3));
      col = alb / PI * MOONC * 7.5 * nl * sh;
      col += MOONC * 5.0 * ggx(n, MOON, v, rough) * fresnel(n, v, 0.03) * sh * 0.25;
      // sky light
      col += alb * vec3(0.26, 0.32, 0.5) * (0.5 + 0.5 * n.y);
      // tiny glints of dew on the crumbs, close in
      float gl = 0.0;
      col += MOONC * gl * pow(sat(dot(reflect(rd, n), MOON)), 4.0) * 0.6 * sh;
    } else {
      vec3 pw = p; float sc_, seed_;
      p = nearestSprout(pw, sc_, seed_);
      vec3 tip, tg; stemFrame(1.0, tip, tg);
      if (id == 3) {
        // a seed leaf: thin, translucent, waxy. Veins from the midrib; the moon behind shines through.
        float side = sign(p.x - tip.x + 1e-5);
        float L; vec3 lq = leafLocal(p, tip, tg, side, L);
        vec2 u = vec2(lq.x / L, lq.z / L);
        float mid = smoothstep(0.06, 0.0, abs(u.y)) * smoothstep(1.0, 0.2, u.x + 1.0) * step(-1.0, u.x);
        float sec = smoothstep(0.06, 0.0, abs(fract((u.x * 0.8 - abs(u.y) * 1.1) * 3.2) - 0.5) - 0.44) * smoothstep(0.05, 0.15, abs(u.y)) * smoothstep(0.75, 0.4, length(u));
        float veins = max(mid, sec * 0.7);
        float cell = 0.9 + 0.2 * vnoise(u * 60.0);
        vec3 alb = vec3(0.055, 0.07, 0.04) * cell * mix(1.0, 1.6, veins);
        alb = mix(alb, vec3(0.08, 0.075, 0.04), smoothstep(0.75, 1.0, length(u)) * 0.5);   // the rim a little paler
        float back = sat(dot(-n, MOON));
        float front = sat(dot(n, MOON));
        // light through the leaf: yellow-green, veins shadowing it
        vec3 transc = vec3(0.13, 0.22, 0.05) * cell * mix(1.0, 0.5, veins);
        col = alb / PI * MOONC * 5.0 * front * sh;
        col += transc * MOONC * 1.6 * back * (0.4 + 0.6 * sh) * (0.5 + 0.5 * pow(sat(dot(rd, MOON)), 2.0));
        col += alb * vec3(0.16, 0.2, 0.32) * (0.6 + 0.4 * abs(n.y));
        // the wax: a tight bright sheen and the sky in it
        vec3 hn = normalize(n + 0.15 * vec3(vnoise(u * 80.0) - 0.5, 0.0, vnoise(u * 80.0 + 3.0) - 0.5));
        col += MOONC * 5.0 * ggx(hn, MOON, v, 0.22) * fresnel(hn, v, 0.05) * sh;
        col += skyF(reflect(rd, hn)) * fresnel(hn, v, 0.05) * 0.8;
        // a bead of dew on some leaves: a tiny bright point of moon
        if (fract(seed_ * 7.7) < 0.45) {
          vec2 dp = vec2(0.45 + 0.3 * fract(seed_ * 3.1), (fract(seed_ * 5.3) - 0.5) * 0.5);
          float r = length(u - dp);
          vec3 bn = normalize(n + 2.5 * vec3(u.x - dp.x, 0.0, u.y - dp.y));
          float bead = smoothstep(0.16, 0.1, r);
          col = mix(col, col * 0.6 + skyF(reflect(rd, bn)) * 0.5, bead);
          col += MOONC * 25.0 * pow(sat(dot(reflect(rd, bn), MOON)), 60.0) * bead;
        }
      } else if (id == 4) {
        // the split seed coat: dry, papery, brown with a pale inner face
        vec3 alb = mix(vec3(0.11, 0.07, 0.04), vec3(0.2, 0.16, 0.1), step(0.0, dot(n, normalize(p - tip)))) * (0.8 + 0.4 * vnoise(p.xz * 4000.0));
        col = alb / PI * MOONC * 5.0 * (nl * sh + 0.3 * sat(dot(-n, MOON)));
        col += alb * vec3(0.16, 0.2, 0.32) * 0.6;
        col += MOONC * 5.0 * ggx(n, MOON, v, 0.5) * 0.04 * sh;
      } else {
        // the stem: pale, almost white-green, flushed red at the soil, furred with fine hairs
        float hgt = sat((p.y - baseY()) / 0.02);
        vec3 alb = mix(vec3(0.16, 0.07, 0.06), vec3(0.17, 0.19, 0.11), smoothstep(0.0, 0.5, hgt));
        alb *= 0.85 + 0.3 * vnoise(vec2(atan(p.z, p.x) * 8.0, p.y * 4000.0));
        float trans = sat(dot(-n, MOON));
        col = alb / PI * MOONC * 5.0 * (nl * sh + 0.5 * trans * (0.4 + 0.6 * sh));
        col += alb * vec3(0.16, 0.2, 0.32) * (0.6 + 0.4 * n.y);
        col += MOONC * 5.0 * ggx(n, MOON, v, 0.4) * fresnel(n, v, 0.04) * sh;
        // the hairs: a fine bright fringe where the stem turns from us and catches the moon
        float rim = pow(1.0 - abs(dot(n, v)), 4.0);
        float hair = 0.5 + 0.5 * step(0.55, hash12(floor(vec2(atan(p.z, p.x) * 40.0, p.y * 9000.0))));
        col += MOONC * 0.25 * rim * hair * (0.3 + sat(dot(rd, MOON)) + nl) * (0.4 + 0.6 * sh);
      }
      p = pw;
    }
    // distance: the night air between us and the hills
    float fog = 1.0 - exp(-t * 0.0012);
    fog = sat(fog + 0.15 * smoothstep(60.0, 400.0, t) * exp(-max(p.y, 0.0) * 0.03));
    vec3 fc2 = vec3(0.014, 0.019, 0.036) + MOONC * 0.06 * pow(sat(dot(normalize(rd.xz), normalize(MOON.xz))), 3.0);
    col = mix(col, fc2, fog);
  } else {
    col = skyF(rd0);
    if (rd0.y < 0.03) col = mix(vec3(0.014, 0.019, 0.036), col, smoothstep(0.0, 0.03, rd0.y));
  }
  return col;
}

vec3 gentle(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float depth;
  vec3 col = shadeF(ro, rd, rd0, depth);
  // the dewdrop: a small lens. It shows the sky and the moon refracted, a bright point of moonlight.
  vec4 dd = vec4(0.0, -10.0, 0.0, 0.0001);
  vec3 oc = ro - dd.xyz; float b = dot(oc, rd), c = dot(oc, oc) - dd.w * dd.w, h = b * b - c;
  if (h > 0.0) {
    float tt = -b - sqrt(h);
    if (tt > 0.0 && tt < depth) {
      vec3 p = ro + rd * tt, n = normalize(p - dd.xyz);
      // a true lens: refract in, cross the drop, refract out, and see the world upside down through it
      vec3 rr = refract(rd, n, 0.75);
      float l = -2.0 * dot(rr, p - dd.xyz);
      vec3 pe = p + rr * l, ne = normalize(pe - dd.xyz);
      vec3 out_ = refract(rr, -ne, 1.33);
      if (dot(out_, out_) < 0.5) out_ = reflect(rr, -ne);
      float d2;
      vec3 inner = shadeF(pe + out_ * 0.0003, out_, out_, d2);
      float F = fresnel(n, -rd, 0.02);
      vec3 dc = inner * 0.92 * (1.0 - F) + skyF(reflect(rd, n)) * F;
      dc += MOONC * 30.0 * pow(sat(dot(reflect(rd, n), MOON)), 600.0);
      dc += MOONC * 1.5 * pow(sat(dot(out_, MOON)), 300.0);     // the moon focused through it
      col = mix(col, dc, smoothstep(0.0, 0.06, h / (dd.w * dd.w)));
    }
  }
  return col;
}
`;
