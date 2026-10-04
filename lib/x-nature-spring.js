// s04's world: "Those who hunger and thirst for righteousness will be filled." Cracked dry mud at
// night under a low moon: curled plates split by deep cracks. A thin stream of water finds the cracks
// and runs down them toward a small clay cup sunk to its rim in the earth. The cup fills, brims and
// overflows; on "filled" the water in it is lit gold from within and the overflow carries the gold out
// over the ground toward the lens.
// uFront: how far (metres along the path from the far end) the stream's head has come;
// uLevel: water height in the cup (y); uSpill: radius of the overflow film; uGold: 0..1 inner light.
// Ground y = 0, the cup at the origin, the stream comes from +z.
import { NATURE_GLSL, NATURE_UNIFORMS } from '/song/lib/x-nature.js';

export const SPRING_UNIFORMS = { ...NATURE_UNIFORMS, uFront: 0, uLevel: -0.05, uSpill: 0, uGold: 0, uPour: 0 };
export const PATH_LEN = 1.9;

export const SPRING_GLSL = NATURE_GLSL + /* glsl */ `
uniform float uFront, uLevel, uSpill, uGold;

const vec3 MOON = normalize(vec3(-0.45, 0.32, 0.85));
const vec3 MOONC = vec3(0.6, 0.68, 0.85);
// a hand-thrown cup: rim at RIMY, foot at BOT, walls WT thick, sunk in the earth to near its rim
const float RIMY = 0.02, BOT = -0.036, WT = 0.0065;
const float CUPR = 0.062;
uniform float uPour;
float cupRm(vec3 p) {
  float k = (p.y - BOT) / (RIMY - BOT);
  float a = atan(p.z, p.x);
  return 0.054 + 0.006 * sqrt(sat(k)) + 0.00045 * sin(p.y * 560.0 + a * 0.5) + 0.0009 * sin(2.0 * a + 1.3) + 0.0005 * sin(3.0 * a + 0.4);
}
float cupInR(float y) { return cupRm(vec3(1.0, y, 0.0)) - WT; }
const vec3 GOLD = vec3(1.0, 0.62, 0.22);

// the stream's course: x as a function of z (it winds toward the cup from the far side)
float pathX(float z) { return 0.16 * sin(z * 2.6 + 0.4) * smoothstep(0.05, 0.5, z) + 0.12 * z; }
// how far along the course a point lies (0 at the cup, PATH_LEN far off)
float along(vec2 xz) { return max(xz.y, 0.0) * 1.12; }
// wetness of the course at xz: 1 inside the reached part of the stream's band
float reached(vec2 xz) { return smoothstep(0.0, 0.04, along(xz) - (${PATH_LEN.toFixed(2)} - uFront)); }

// the cracked mud: x height, y distance to crack, z plate id
vec3 mud(vec2 xz) {
  vec2 w = xz + 0.012 * vec2(vnoise(xz * 22.0), vnoise(xz * 22.0 + 5.0));
  vec2 ve = voronoiEdge(w * 11.0);
  float e = ve.x / 11.0;                           // metres to the crack's middle
  float gap = 0.0025 + 0.002 * vnoise(xz * 30.0);
  float curl = 0.004 * exp(-max(e - gap, 0.0) / 0.006);   // plates curl up at their edges
  float h = 0.0015 * (fbm(xz * 40.0, 3) - 0.5) + curl + 0.0006 * (vnoise(xz * 300.0) - 0.5);
  h -= 0.018 * smoothstep(gap, gap * 0.4, e);
  // a few finer cracks across the plates
  vec2 v2 = voronoiEdge(w * 34.0 + 3.0);
  h -= 0.003 * smoothstep(0.06, 0.0, v2.x) * smoothstep(gap * 2.0, gap * 4.0, e);
  // the earth packed round the cup, up to its rim
  float r = length(xz);
  float collar = smoothstep(0.115, 0.07, r);
  float side = smoothstep(-0.4, 0.9, xz.y / max(r, 1e-4));          // heaped higher on the far side, where the water comes in
  float ch = mix(RIMY - 0.0075, RIMY - 0.0035, side) - 0.22 * max(r - 0.064, 0.0) + 0.0015 * (fbm(xz * 70.0, 3) - 0.5);
  h = mix(h, ch, collar);
  e = mix(e, 1.0, collar);
  return vec3(h, e, ve.y);
}
float mapS(vec3 p, out int id) {
  float g = (p.y - mud(p.xz).x) * 0.7;
  float r = length(p.xz);
  if (r > 0.09) { id = 1; return g; }
  float Rm = cupRm(p);
  // the earth stops at the cup's outer wall
  g = max(g, -(r - Rm - WT * 0.5));
  // the wall, its rounded lip, and the floor
  float wall = max(abs(r - Rm) - WT * 0.5, max(p.y - RIMY, BOT - p.y));
  float lip = length(vec2(r - cupRm(vec3(p.x, RIMY, p.z)), p.y - RIMY)) - WT * 0.62;
  float flo = max(r - Rm, abs(p.y - (BOT + 0.004)) - 0.004);
  float shell = min(min(wall, lip), flo) * 0.8;
  id = 1;
  if (shell < g) { id = 2; return shell; }
  return g;
}
vec3 normS(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0003; int i;
  return normalize(e.xyy * mapS(p + e.xyy, i) + e.yyx * mapS(p + e.yyx, i) + e.yxy * mapS(p + e.yxy, i) + e.xxx * mapS(p + e.xxx, i));
}
float marchS(vec3 ro, vec3 rd, out int id) {
  float t = 0.01;
  for (int i = 0; i < 260; i++) {
    float d = mapS(ro + rd * t, id);
    if (abs(d) < 0.0002 * t) return t;
    t += d * 0.8;
    if (t > 40.0) break;
  }
  // a ray lost down a crack has still hit the ground
  if (rd.y < 0.0 && t < 40.0) { mapS(ro + rd * t, id); return t; }
  id = 0; return -1.0;
}
float shadowS(vec3 p) {
  float s = 1.0, t = 0.003; int id;
  for (int i = 0; i < 24; i++) {
    float h = mapS(p + MOON * t, id);
    s = min(s, 10.0 * h / t);
    t += clamp(h, 0.002, 0.1);
    if (s < 0.02 || t > 1.5) break;
  }
  return sat(s);
}

vec3 skyS(vec3 rd) {
  float h = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.03, 0.04, 0.07), vec3(0.003, 0.005, 0.012), pow(h, 0.45));
  float md = dot(rd, MOON);
  c += MOONC * (0.04 * pow(sat(md), 6.0) + 0.3 * pow(sat(md), 200.0) + 0.12 * pow(sat(md), 2.0) * exp(-h * 6.0));
  c += starField(rd, 1.0) * smoothstep(0.0, 0.1, rd.y);
  if (md > 0.99994) c += vec3(1.0, 0.97, 0.9) * 40.0;
  return c;
}

// the gold the cup gives once it is filled (a point light just above the water)
vec3 goldAt(vec3 p, vec3 n) {
  if (uGold <= 0.0) return vec3(0);
  vec3 L = vec3(0.0, uLevel + 0.008, 0.0);
  vec3 d = L - p; float d2 = dot(d, d);
  return GOLD * uGold * 0.0012 / (d2 + 0.0008) * (0.35 + 0.65 * sat(dot(n, d * inversesqrt(d2))));
}

// a water surface (stream, film or cup): mirror of the sky and moon, rippled by the flow
vec3 waterShade(vec3 p, vec3 rd, vec2 flow, float depthBelow, vec3 under) {
  // flow: a direction (stream) or, with length > 1.5, rings spreading from the cup (film)
  vec2 g;
  if (length(flow) > 1.5) {
    float r = length(p.xz);
    vec2 dr = p.xz / max(r, 1e-4);
    vec2 q = p.xz * 45.0 + vec2(uTime * 0.3, -uTime * 0.2);
    g = dr * (0.06 * sin(r * 260.0 - uTime * 9.0) + 0.04 * sin(r * 610.0 - uTime * 17.0)) * exp(-max(r - 0.09, 0.0) * 6.0)
      + vec2(vnoise(q) - 0.5, vnoise(q + 4.7) - 0.5) * 0.035;
  } else {
    vec2 q = p.xz * 70.0 - flow * uTime * 6.0;
    g = vec2(vnoise(q) - 0.5, vnoise(q + 4.7) - 0.5) * 0.7 + vec2(vnoise(q * 3.1 + 1.0) - 0.5, vnoise(q * 3.1 + 3.0) - 0.5) * 0.4;
  }
  vec3 n = normalize(vec3(g.x, 1.0, g.y));
  vec3 v = -rd;
  float F = fresnel(n, v, 0.02);
  vec3 rr = reflect(rd, n);
  vec3 refl = skyS(rr);
  float spk = smoothstep(0.55, 0.9, vnoise(p.xz * 400.0 - flow * uTime * 25.0));
  vec3 glint = (length(flow) > 1.5 ? MOONC * 0.4 * pow(sat(dot(rr, MOON)), 300.0) * F * (0.3 + spk) : MOONC * (3.0 * pow(sat(dot(rr, MOON)), 80.0) * (0.3 + 2.0 * spk) + 0.25 * pow(sat(dot(rr, MOON)), 6.0)) * F);
  vec3 trans = under * exp(-depthBelow * vec3(30.0, 18.0, 14.0));
  // reflections: the night sky is dark, so water reads dark and glossy, lit only by small glints
  return mix(trans, refl * (length(flow) > 1.5 ? 0.3 : 0.5), F) + glint;
}

vec3 thirst(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; float t = marchS(ro, rd, id);
  vec3 col; float depth = 1e3;
  // the water in the cup: a disc at uLevel inside the bowl
  float tw = -1.0;
  if (abs(rd.y) > 1e-4) {
    float tt = (uLevel - ro.y) / rd.y;
    vec3 wp = ro + rd * tt;
    if (tt > 0.0 && length(wp.xz) < cupInR(uLevel) + 0.0008 * step(RIMY - 0.0015, uLevel)) tw = tt;
  }
  if (t > 0.0) {
    depth = t;
    vec3 p = ro + rd * t; vec3 n = normS(p); vec3 v = -rd;
    float sh = shadowS(p + n * 0.002);
    float nl = sat(dot(n, MOON));
    vec3 alb; float rough = 0.9;
    vec3 m = mud(p.xz);
    if (id == 1) {
      // dry clay mud: pale grey-brown on the plates, darker down in the cracks
      alb = vec3(0.24, 0.19, 0.145) * (0.75 + 0.4 * fbm(p.xz * 18.0 + m.z * 7.0, 3)) * (0.85 + 0.3 * m.z);
      alb *= mix(0.35, 1.0, smoothstep(-0.012, 0.0, m.x));
      alb *= mix(0.35, 1.0, smoothstep(0.0, 0.009, m.y));   // the broken crack walls are dark, crumbly
    } else {
      // the clay cup: red-brown fired clay with throwing rings, darker where it has drunk water
      float a = atan(p.z, p.x);
      alb = vec3(0.36, 0.17, 0.09) * (0.75 + 0.35 * fbm(vec2(a * 6.0, p.y * 90.0), 3)) * (0.9 + 0.12 * sin(p.y * 560.0 + a * 0.5));
      alb *= 0.85 + 0.3 * vnoise(p.xz * 900.0 + p.y * 400.0);
      float wetc = smoothstep(uLevel + 0.004, uLevel - 0.001, p.y) * step(length(p.xz), cupRm(p));
      alb *= mix(1.0, 0.55, wetc);
      rough = mix(0.75, 0.3, wetc);
    }
    vec3 lit = alb / PI * MOONC * 3.2 * nl * sh + MOONC * 4.0 * ggx(n, MOON, v, rough) * 0.04 * sh;
    // the inside of the cup is shadowed and lies in its own dark
    float rr = length(p.xz);
    float inside = (id == 2 && rr < cupRm(p) - 0.001) ? mix(0.25, 1.0, sat((p.y - BOT) / (RIMY - BOT))) : 1.0;
    lit += alb * vec3(0.08, 0.1, 0.16) * (0.4 + 0.6 * n.y) * mix(0.3, 1.0, smoothstep(-0.015, 0.0, m.x)) * inside;
    // gold from the water reaches the inner wall above it and the lip; outside, only what spills
    float gk = id == 2 ? ((rr < cupRm(p) - 0.001 || p.y > RIMY - 0.003) ? 1.0 : 0.0) : 0.12;
    lit += alb / PI * goldAt(p, n) * gk;
    col = lit;
    // water in the cracks along the stream's course: it lies a few millimetres down in the crack
    if (id == 1) {
      float band = exp(-pow((p.x - pathX(p.z)) / 0.11, 2.0));
      // the stream: a thread of water down the cracks, spreading as a thin sheet across the plates it crosses
      float onPath = smoothstep(0.016, 0.006, abs(p.x - pathX(p.z)));
      float inCrack = max(smoothstep(0.0045, 0.0025, m.y), onPath) * step(0.0, p.z - 0.055);
      float wr = reached(p.xz) * band * inCrack;
      // the wet dark rim the water leaves on the plates beside it
      float damp = reached(p.xz) * max(band * smoothstep(0.012, 0.004, m.y), smoothstep(0.03, 0.012, abs(p.x - pathX(p.z)))) * step(0.0, p.z - 0.055);
      col *= mix(1.0, 0.45, damp);
      // the overflow film round the cup, reaching further toward us
      vec2 dxz = p.xz; float r = length(dxz);
      float reach = uSpill * (1.0 + 0.9 * sat(-dxz.y / max(r, 1e-4))) * (0.85 + 0.3 * vnoise(vec2(atan(dxz.y, dxz.x) * 3.0, 1.0)));
      float film = smoothstep(reach, reach - 0.02, r) * step(0.0005, uSpill);
      float wet = max(wr, film);
      if (wet > 0.0) {
        vec2 fl = film > wr ? vec2(2.0, 0.0) : vec2(0.0, -1.0);
        vec3 under = col * 0.15 + GOLD * uGold * 0.1 * film * exp(-max(r - 0.065, 0.0) * 30.0);
        vec3 w = waterShade(p, rd, fl, film > wr ? 0.002 : 0.004, under);
        w += goldAt(p, vec3(0, 1, 0)) * 0.05 * film;
        // the moving head of the stream catches more light
        float head = exp(-pow((along(p.xz) - (${PATH_LEN.toFixed(2)} - uFront)) / 0.03, 2.0)) * band * inCrack;
        w += MOONC * head * 0.04;
        col = mix(col, w, wet);
      }
    }
  } else {
    col = skyS(rd0);
  }
  // the cup's water over whatever is below it
  if (tw > 0.0 && (t < 0.0 || tw < t + 0.001)) {
    vec3 wp = ro + rd * tw;
    float rr0 = length(wp.xz) / CUPR;
    float dep = uLevel - (BOT + 0.008);
    // under the water: the dark clay floor, then the gold rising in it from within
    vec3 under = vec3(0.02, 0.011, 0.007) * (0.6 + 0.4 * fbm(wp.xz * 80.0, 2))
      + GOLD * uGold * (0.05 + 0.8 * exp(-rr0 * rr0 * 5.0)) * (0.8 + 0.3 * smoothstep(0.02, 0.3, voronoiEdge(wp.xz * 70.0 + vec2(sin(uTime * 1.3), cos(uTime * 1.1)) * 0.6).x) + 0.2 * fbm(wp.xz * 60.0 + vec2(uTime * 0.6, -uTime * 0.4), 3));
    // the surface trembles: rings from where the stream pours in on the far side
    vec2 E = vec2(0.008, cupInR(uLevel) - 0.006);
    float re = length(wp.xz - E);
    vec2 gr = (wp.xz - E) / max(re, 1e-4) * (0.05 * sin(re * 700.0 - uTime * 22.0) + 0.03 * sin(re * 1300.0 - uTime * 35.0)) * exp(-re * 25.0) * uPour;
    vec3 n = normalize(vec3(gr.x + 0.01 * (vnoise(wp.xz * 300.0 + uTime * 3.0) - 0.5), 1.0, gr.y + 0.01 * (vnoise(wp.xz * 300.0 - uTime * 3.0 + 7.0) - 0.5)));
    float F = fresnel(n, -rd, 0.02);
    vec3 rr = reflect(rd, n);
    // the reflection: the sky above, cut off by the rim and the cup's own wall
    float rimCut = smoothstep(0.0, 0.25, rr.y - 0.35 * (RIMY - uLevel) / 0.01);
    vec3 refl = skyS(rr) * 1.6 * rimCut + MOONC * 6.0 * pow(sat(dot(rr, MOON)), 200.0) * rimCut;
    // the lit lip mirrored round the water's edge
    refl = mix(refl, vec3(0.09, 0.05, 0.03) + GOLD * uGold * 0.25, smoothstep(cupInR(uLevel) - 0.008, cupInR(uLevel), length(wp.xz)) * 0.8);
    col = mix(under, refl, max(F, 0.08));
    // shadow of the wall across the water's near side
    col *= mix(0.6, 1.0, smoothstep(-0.6, 0.2, dot(normalize(wp.xz + 1e-5), normalize(MOON.xz))));
    depth = tw;
  }
  // the thread of water pouring over the rim into the cup
  if (uPour > 0.0) {
    vec3 a = vec3(0.008, RIMY + 0.003, cupRm(vec3(0.0, RIMY, 1.0)) + 0.006);
    vec3 prev = a;
    vec3 wc = vec3(0); float cov = 0.0;
    for (int i = 1; i <= 6; i++) {
      float u = float(i) / 6.0;
      vec3 b = vec3(0.008, mix(RIMY + 0.003, uLevel, u * u), a.z - 0.017 * u);
      vec3 pa = ro - prev, ba = b - prev;
      // closest approach between the ray and the segment
      vec3 w0 = prev - ro; float aa = dot(rd, rd), bb = dot(rd, ba), cc = dot(ba, ba), dd = dot(rd, w0), ee = dot(ba, w0);
      float den = aa * cc - bb * bb;
      float sc = den > 1e-9 ? (bb * ee - cc * dd) / den : 0.0;
      float tc = den > 1e-9 ? sat((aa * ee - bb * dd) / den) : 0.0;
      vec3 q = (prev + ba * tc) - (ro + rd * sc);
      float h = length(q);
      float rad = 0.0016 * (1.0 - 0.4 * u) * uPour;
      if (sc > 0.0 && sc < depth + 0.01) {
        float k = smoothstep(rad, rad * 0.3, h);
        float sp = 0.6 + 0.4 * sin((u * 6.0 - uTime * 30.0) + h * 3000.0);
        vec3 c = MOONC * 0.03 + MOONC * 0.5 * smoothstep(rad * 0.5, 0.0, abs(h - rad * 0.35)) * sp + GOLD * uGold * 0.08;
        wc = mix(wc, c, k * (1.0 - cov)); cov = max(cov, k);
      }
      prev = b;
    }
    col = mix(col, wc, cov * 0.85);
  }
  // gold light hanging in the air over the cup
  col += GOLD * uGold * min(hazeGlow(ro, rd, vec3(0.0, uLevel + 0.03, 0.0), depth), 200.0) * 0.0001;
  return col;
}
`;
