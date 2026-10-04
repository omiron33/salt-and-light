// The vigil world (s47-pray): the icon corner of an Orthodox home before dawn. Two lime-plastered
// walls meet behind a small wooden corner shelf; on it stands a lampada, a cup of ruby glass with a
// pressed diamond pattern on a little brass foot, a floating wick burning inside on the oil. Beside
// it lies a prayer rope of black wool, knot after knot in a loop, with its knotted cross and a short
// tassel. Above, out of focus, the gilt lower edge of an icon's frame. The flame's light leaves the
// cup red through the glass and gold out of its open mouth, so the walls hold a red glow below and a
// ring of gold above. uTremble (0..1) is how much the flame shakes. Shelf top at y = 0, lamp at the
// origin, the corner at x = z = CW. Everything is a pure function of uTime.

export const VIGIL_UNIFORMS = { uFocus: 0.5, uAper: 0.0, uTremble: 1.0 };

export const VIGIL_GLSL = /* glsl */ `
uniform float uFocus, uAper, uTremble;

void camBasis(out vec3 ww, out vec3 uu, out vec3 vv) {
  ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  uu = normalize(cross(ww, up)); vv = cross(uu, ww);
}
vec3 lensRay(vec2 fc, out vec3 ro, out vec3 rd0) {
  rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww, uu, vv; camBasis(ww, uu, vv);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1 + uFrame * 0.013), hash12(uJitter * 613.0 + 7.7 + uFrame * 0.029));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}
float ggx(vec3 n, vec3 l, vec3 v, float rough) {
  vec3 h = normalize(l + v);
  float a = max(0.02, rough * rough), a2 = a * a;
  float nh = sat(dot(n, h)), nl = sat(dot(n, l));
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return nl * a2 / (PI * d * d) * 0.25;
}
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

const float CW = 0.17;                     // the corner
const vec3 CUPC = vec3(0.0, 0.108, 0.0);   // centre of the glass cup
const float CUPR = 0.042;
const float RIM = 0.136;                   // height of the cup's mouth
const float OIL = 0.118;                   // oil surface

// the flame: it trembles (uTremble) and steadies
float trem() { return uTremble * (0.6 * (vnoise(vec2(uTime * 9.0, 1.0)) - 0.5) + 0.4 * sin(uTime * 23.0)); }
vec3 flameBase() { return vec3(0.0, OIL + 0.002, 0.0); }
float flameH() { return 0.028 * (1.0 + 0.25 * trem() + 0.04 * sin(uTime * 7.0)); }
float flick() { return 0.9 + 0.1 * vnoise(vec2(uTime * 5.0, 3.0)) + 0.25 * trem(); }
vec3 flameLightCol() { return vec3(1.0, 0.6, 0.3) * flick(); }
vec3 flameC() { return flameBase() + vec3(0.003 * trem(), flameH() * 0.45, 0.0); }

// ---------------- solids ----------------
float shelfSD(vec3 p) {
  // a quarter-round corner shelf with a moulded front edge
  vec2 q = vec2(CW - p.x, CW - p.z);
  float r = length(q) - 0.36;
  float d = max(max(r, -min(q.x, q.y)), abs(p.y + 0.012) - 0.012);
  return d - 0.002;
}
float wallsSD(vec3 p) { return min(CW - p.x, CW - p.z); }
// the icon on the wall z = CW: a board with a raised gilt border; only its lower edge is in frame
float iconSD(vec3 p) {
  vec3 q = p - vec3(-0.06, 0.42, CW - 0.012);
  float board = sdBox(q, vec3(0.16, 0.2, 0.012)) - 0.002;
  return board;
}
float brassSD(vec3 p) {
  float foot = sdCylY(p - vec3(0.0, 0.004, 0.0), 0.03, 0.004) - 0.002;
  float stem = sdCapsule(p, vec3(0.0, 0.006, 0.0), vec3(0.0, 0.06, 0.0), 0.006 - 0.002 * smoothstep(0.01, 0.05, p.y));
  float knop = length(p - vec3(0.0, 0.035, 0.0)) - 0.011;
  // the cup holder: a small bowl under the glass
  float holder = max(abs(length(p - CUPC) - (CUPR + 0.003)) - 0.0015, p.y - 0.072);
  return min(min(foot, stem), min(knop, holder));
}
// the glass cup (hollow sphere open at the top)
float glassSD(vec3 p) {
  float s = abs(length(p - CUPC) - CUPR) - 0.0016;
  return max(s, p.y - RIM);
}
// the prayer rope: a loop of knots lying on the shelf
const vec3 ROPE = vec3(-0.085, 0.0, -0.035);
vec2 ropeRad() { return vec2(0.05, 0.032); }
vec3 ropePath(float a) {
  vec2 r = ropeRad();
  vec2 o = vec2(cos(a) * r.x, sin(a) * r.y);
  o += 0.008 * vec2(sin(a * 3.0 + 1.0), cos(a * 2.0));          // lying loosely, not a perfect oval
  o = rot(0.5) * o;
  return ROPE + vec3(o.x, 0.0055, o.y);
}
float ropeSD(vec3 p, out float knot) {
  knot = 0.0;
  vec3 q = p - ROPE;
  if (length(q.xz) > 0.1 || p.y > 0.025) return max(length(q.xz) - 0.09, p.y - 0.015);
  // nearest point on the loop, by angle then a refinement
  vec2 qq = rot(-0.5) * q.xz;
  vec2 r = ropeRad();
  float a = atan(qq.y / r.y, qq.x / r.x);
  float d = 1e3;
  const float NK = 50.0;
  float k = floor(a / 6.2831853 * NK + 0.5);
  for (int j = -1; j <= 1; j++) {
    float kk = k + float(j);
    float ak = kk / NK * 6.2831853;
    vec3 c = ropePath(ak);
    vec3 tng = normalize(ropePath(ak + 0.01) - ropePath(ak - 0.01));
    vec3 dl = p - c;
    // a knot: a rounded barrel along the rope
    float along = dot(dl, tng);
    vec3 perp = dl - tng * along;
    float kd = length(vec2(length(perp) - 0.0, along * 1.25)) - 0.0048;
    kd += 0.0006 * sin(atan(perp.y, dot(perp, normalize(cross(tng, vec3(0.0, 1.0, 0.0))))) * 6.0 + along * 900.0);
    if (kd < d) { d = kd; knot = kk; }
  }
  // the thread between knots
  float ac = atan(qq.y / r.y, qq.x / r.x);
  d = min(d, length(p - ropePath(ac)) - 0.0022);
  return d;
}
// the knotted cross and tassel hanging off the loop where it nears the lamp
float crossSD(vec3 p) {
  vec3 e = ropePath(2.6);
  vec2 od = normalize(e.xz - ROPE.xz);
  vec3 c = e + vec3(od.x, 0.0, od.y) * 0.02;
  vec3 q = p - c;
  q.xz = vec2(dot(q.xz, od), dot(q.xz, vec2(-od.y, od.x)));
  float d = sdBox(q, vec3(0.016, 0.004, 0.004)) - 0.002;
  d = min(d, sdBox(q - vec3(-0.004, 0.0, 0.0), vec3(0.004, 0.004, 0.011)) - 0.002);
  d = min(d, sdCapsule(q, vec3(-0.02, 0.0, 0.0), vec3(-0.012, 0.0, 0.0), 0.0022));
  // the tassel: a short fan of wool strands
  float tas = 1e3;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 a = vec3(0.018, 0.0, 0.0);
    vec3 b = vec3(0.04 + 0.004 * hash11(fi), 0.0, (fi - 3.0) * 0.0025 + 0.002 * sin(uTime * 0.7 + fi));
    tas = min(tas, sdCapsule(q, a, b, 0.0012));
  }
  return min(d, tas);
}

// id: 1 walls, 2 shelf, 3 icon, 4 brass, 5 rope, 6 glass
float mapV(vec3 p, out int id, out float aux) {
  aux = 0.0;
  float d = wallsSD(p); id = 1;
  float s = shelfSD(p); if (s < d) { d = s; id = 2; }
  float ic = iconSD(p); if (ic < d) { d = ic; id = 3; }
  float b = brassSD(p); if (b < d) { d = b; id = 4; }
  float kn; float r = ropeSD(p, kn); if (r < d) { d = r; id = 5; aux = kn; }
  float c = crossSD(p); if (c < d) { d = c; id = 5; aux = -1.0; }
  float g = glassSD(p); if (g < d) { d = g; id = 6; }
  return d;
}
float mapNoGlass(vec3 p, out int id, out float aux) {
  aux = 0.0;
  float d = wallsSD(p); id = 1;
  float s = shelfSD(p); if (s < d) { d = s; id = 2; }
  float ic = iconSD(p); if (ic < d) { d = ic; id = 3; }
  float b = brassSD(p); if (b < d) { d = b; id = 4; }
  float kn; float r = ropeSD(p, kn); if (r < d) { d = r; id = 5; aux = kn; }
  float c = crossSD(p); if (c < d) { d = c; id = 5; aux = -1.0; }
  return d;
}
float marchV(vec3 ro, vec3 rd, bool glass, out int id, out float aux) {
  float t = 0.002;
  for (int i = 0; i < 180; i++) {
    vec3 p = ro + rd * t;
    float d = glass ? mapV(p, id, aux) : mapNoGlass(p, id, aux);
    if (d < 0.00004 + 0.0002 * t) return t;
    t += d * 0.85;
    if (t > 3.0) break;
  }
  id = 0; return -1.0;
}
vec3 normV(vec3 p, bool glass) {
  vec2 e = vec2(0.0002, 0.0); int i; float a;
  if (glass) return normalize(vec3(mapV(p + e.xyy, i, a) - mapV(p - e.xyy, i, a), mapV(p + e.yxy, i, a) - mapV(p - e.yxy, i, a), mapV(p + e.yyx, i, a) - mapV(p - e.yyx, i, a)));
  return normalize(vec3(mapNoGlass(p + e.xyy, i, a) - mapNoGlass(p - e.xyy, i, a), mapNoGlass(p + e.yxy, i, a) - mapNoGlass(p - e.yxy, i, a), mapNoGlass(p + e.yyx, i, a) - mapNoGlass(p - e.yyx, i, a)));
}
float shadowV(vec3 ro, vec3 rd, float maxT) {
  float res = 1.0, t = 0.003; int id; float a;
  for (int i = 0; i < 32; i++) {
    float h = mapNoGlass(ro + rd * t, id, a);
    res = min(res, 5.0 * h / t);
    t += clamp(h, 0.002, 0.04);
    if (res < 0.01 || t > maxT) break;
  }
  return sat(res);
}
float aoV(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0; int id; float a;
  for (int i = 1; i <= 4; i++) { float h = 0.006 * float(i * i); o += w * (h - mapNoGlass(p + n * h, id, a)); w *= 0.7; }
  return sat(1.0 - o * 3.0);
}

// how the flame's light leaves the cup toward direction L from the flame: red through the glass
// below the rim, gold through the mouth above it (with the glass's pressed pattern in it)
const vec3 RUBY = vec3(0.95, 0.08, 0.035);
vec3 cupFilter(vec3 L) {
  vec3 f = flameC();
  // where the ray from the flame meets the sphere of the cup
  vec3 oc = f - CUPC; float b = dot(oc, L); float c = dot(oc, oc) - CUPR * CUPR;
  float tt = -b + sqrt(max(b * b - c, 0.0));
  vec3 hp = f + L * tt;
  float mouth = smoothstep(RIM - 0.002, RIM + 0.002, hp.y);
  // the pressed diamonds throw a soft net of light and dark
  vec3 hn = normalize(hp - CUPC);
  float az = atan(hn.z, hn.x), el = asin(clamp(hn.y, -1.0, 1.0));
  float dia = abs(fract((az * 4.0 + el * 6.0) / 1.5708 + 0.5) - 0.5) + abs(fract((az * 4.0 - el * 6.0) / 1.5708 + 0.5) - 0.5);
  float pat = 0.8 + 0.4 * fbm(vec2(az * 6.0, el * 9.0), 3);
  // the brass holder shades the lower part
  float hold = mix(0.3, 1.0, smoothstep(0.066, 0.074, hp.y));
  return mix(RUBY * 0.55 * pat * hold, vec3(1.0, 0.75, 0.45), mouth);
}
vec3 lampLight(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, float spec) {
  vec3 L = flameC() - p; float d2 = dot(L, L); L *= inversesqrt(d2);
  float sh = 0.3 + 0.7 * shadowV(p + n * 0.0015, L, sqrt(d2) - CUPR - 0.004);
  vec3 lc = flameLightCol() * cupFilter(-L) * 0.07 / (d2 + 0.0004) * sh * exp(-sqrt(d2) * 5.0) * 1.6;
  return lc * (alb * sat(dot(n, L)) / PI + spec * ggx(n, L, v, rough));
}

// the flame itself, drawn where the ray passes its axis
vec3 flameDraw(vec3 ro, vec3 rd, float depth) {
  vec3 b = flameBase();
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  vec3 col = vec3(0);
  if (t > 0.0 && t < depth + 0.003) {
    vec3 q = ro + rd * t - b;
    float hh = flameH();
    float y = q.y / hh;
    if (y > -0.4 && y < 1.5) {
      float sw = 0.6 * trem() + 0.08 * sin(uTime * 2.3);
      vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.3 * y * y;
      float x = length(rr) / (hh * 0.17);
      float yy = clamp(y, 0.0, 1.0);
      float prof = pow(yy, 0.45) * pow(1.0 - yy, 1.1) * 2.3 + 0.03;
      float body = smoothstep(1.0, 0.5, x / prof) * smoothstep(-0.12, 0.06, y);
      float core = smoothstep(0.6, 0.1, x / prof) * smoothstep(0.02, 0.2, y) * smoothstep(0.7, 0.3, y);
      float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.22, 0.0, y) * smoothstep(-0.2, 0.0, y);
      col += (vec3(1.0, 0.5, 0.18) * body * 5.0 * smoothstep(1.0, 0.4, y) + vec3(1.0, 0.86, 0.62) * core * 18.0 + vec3(0.15, 0.3, 1.0) * root * 1.5) * flick();
    }
  }
  return col;
}

vec3 shadeSolid(vec3 p, vec3 rd, int id, float aux) {
  vec3 n = normV(p, false), v = -rd;
  float ao = aoV(p, n);
  vec3 alb; float rough = 0.8, spec = 0.04;
  if (id == 1) {
    // lime plaster, warm white, uneven, a little smoke-darkened above the lamp
    alb = vec3(0.55, 0.5, 0.42) * (0.82 + 0.25 * fbm(p.xy * 9.0 + p.zy * 9.0, 4));
    alb *= 1.0 - 0.35 * exp(-length(p.xz) * 6.0) * smoothstep(0.15, 0.5, p.y);
    vec2 bump = vec2(fbm(p.xy * 40.0 + p.zy * 40.0, 3), fbm(p.yz * 40.0 + p.xy * 30.0, 3)) - 0.5;
    n = normalize(n + vec3(bump.x, bump.y, bump.x) * 0.15);
  } else if (id == 2) {
    // old walnut, oiled
    float grain = fbm(vec2(p.x * 8.0 + p.z * 8.0, (p.x - p.z) * 90.0), 4);
    alb = vec3(0.5, 0.31, 0.17) * (0.6 + 0.6 * grain);
    rough = 0.42; spec = 0.05;
  } else if (id == 3) {
    // the icon's frame: gilt raised border over a dark umber ground
    vec3 q = p - vec3(-0.06, 0.42, CW);
    float border = step(0.14, abs(q.x)) + step(0.18, abs(q.y));
    alb = border > 0.0 ? vec3(0.85, 0.62, 0.28) : vec3(0.1, 0.06, 0.035);
    rough = border > 0.0 ? 0.3 : 0.6; spec = border > 0.0 ? 0.8 : 0.04;
    if (border == 0.0) { alb = mix(alb, vec3(0.6, 0.42, 0.18), smoothstep(-0.12, -0.17, q.y) * 0.0); }
  } else if (id == 4) {
    alb = vec3(0.75, 0.55, 0.28) * (0.8 + 0.25 * fbm(p.xz * 300.0, 2)); rough = 0.3; spec = 0.9;
  } else {
    // black wool knots: fuzzy, a faint sheen, no shine
    alb = vec3(0.05, 0.045, 0.045) * (0.8 + 0.4 * hash11(aux * 3.1));
    rough = 0.55; spec = 0.12;
  }
  vec3 col = lampLight(p, n, v, alb, rough, spec) * mix(1.0, ao, 0.7);
  // the faint cold first light of the morning from a window off to the left
  col += alb * vec3(0.03, 0.04, 0.065) * sat(-n.x * 0.6 + 0.4) * ao;
  // the red of the glass bounced round the corner
  col += alb * RUBY * flameLightCol() * 0.04 * exp(-length(p - CUPC) * 9.0) * ao;
  if (id == 5) {
    // wool fuzz catching the lamp at grazing angles
    vec3 L = normalize(flameC() - p);
    col += cupFilter(-L) * flameLightCol() * pow(1.0 - sat(dot(n, v)), 2.0) * 0.8 * sat(dot(n, L) + 0.5) / (dot(flameC() - p, flameC() - p) * 60.0 + 0.2);
  }
  if (id == 4 || id == 3) {
    // metal reflects the flame and the red glow of the cup
    vec3 r = reflect(rd, n);
    vec3 F = mix(vec3(spec), alb, spec);
    vec3 L = flameC() - p; float dl = length(L);
    col += F * flameLightCol() * 0.4 * pow(sat(dot(r, L / dl)), 400.0) / (dl * 30.0);
    col += F * RUBY * 0.02 * pow(sat(dot(r, normalize(CUPC - p))), 8.0) * flick();
  }
  return col;
}

vec3 vigilScene(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  int id; float aux;
  float t = marchV(ro, rd, true, id, aux);
  vec3 col = vec3(0.0); float depth = 5.0;
  if (t > 0.0 && id == 6) {
    // glass: reflect a little, and let the rest through, red, with what lies inside and behind
    vec3 p = ro + rd * t;
    vec3 n = normV(p, true);
    vec3 hn = normalize(p - CUPC);
    float az = atan(hn.z, hn.x), el = asin(clamp(hn.y, -1.0, 1.0));
    // pressed diamonds bend the normal
    vec2 g = vec2(az * 4.0 + el * 6.0, az * 4.0 - el * 6.0) / 1.5708;
    vec2 gf = fract(g + 0.5) - 0.5;
    n = normalize(n + 0.35 * (hn.y * 0.0 + 1.0) * (sign(gf.x) * vec3(-sin(az), 0.3, cos(az)) * 0.3 + sign(gf.y) * vec3(0.0, 1.0, 0.0) * 0.25) * step(hn.y, (RIM - CUPC.y) / CUPR - 0.05));
    float fr = 0.04 + 0.96 * pow(1.0 - sat(abs(dot(n, -rd))), 5.0);
    // through the glass: march on (no glass) behind it, the flame inside, then tint
    vec3 rdT = normalize(rd + (n - rd * dot(n, rd)) * -0.08);
    int id2; float aux2;
    float t2 = marchV(p + rdT * 0.004, rdT, false, id2, aux2);
    vec3 behind = t2 > 0.0 ? shadeSolid(p + rdT * (0.004 + t2), rdT, id2, aux2) : vec3(0);
    // the far wall of the glass (second pass through) and the oil
    behind += flameDraw(p, rdT, t2 > 0.0 ? t2 : 1.0);
    // the glass glows with the light scattered inside it
    float fd = length(p - flameC());
    float glowK = exp(-fd / 0.025) * 2.5 + 0.35 * smoothstep(OIL - 0.04, OIL, p.y);
    vec3 glow = mix(RUBY, vec3(1.0, 0.3, 0.12), 0.3 * exp(-fd / 0.02)) * flameLightCol() * (0.13 + 0.12 * glowK) * (0.8 + 0.4 * smoothstep(0.25, 0.0, abs(gf.x)) * smoothstep(0.25, 0.0, abs(gf.y)));
    vec3 trans = behind * RUBY * 0.9 + glow;
    // reflection: the dim room and the flame's highlight
    vec3 r = reflect(rd, n);
    vec3 L = normalize(flameC() - p);
    vec3 refl = vec3(0.01, 0.009, 0.008) + vec3(0.02, 0.03, 0.05) * sat(-r.x) * 0.3;
    refl += vec3(1.0, 0.8, 0.6) * 0.0 * pow(sat(dot(r, L)), 50.0);
    // a highlight of the window's cold light on the curve
    refl += vec3(0.4, 0.5, 0.7) * pow(sat(dot(r, normalize(vec3(-1.0, 0.6, -0.4)))), 120.0) * 0.6;
    col = mix(trans, refl, fr);
    // the lip of the glass catches the flame
    col += vec3(1.0, 0.55, 0.3) * flameLightCol() * smoothstep(RIM - 0.004, RIM - 0.0005, p.y) * 0.35;
    depth = t;
  } else if (t > 0.0) {
    col = shadeSolid(ro + rd * t, rd, id, aux);
    depth = t;
  }
  // the flame in front of anything behind it (outside the cup: only seen through the mouth or glass)
  if (!(t > 0.0 && id == 6)) col += flameDraw(ro, rd, depth);
  // the soft glow the lamp hangs in the air: red round the cup, gold above the mouth
  vec3 oc = CUPC - ro; float tc = dot(oc, rd);
  if (tc > 0.0) {
    float h = sqrt(max(dot(oc, oc) - tc * tc, 0.0));
    col += RUBY * flameLightCol() * (0.012 * exp(-h / 0.06) + 0.004 * exp(-h / 0.2));
    vec3 of = flameC() - ro; float tf = dot(of, rd);
    float hf = sqrt(max(dot(of, of) - tf * tf, 0.0));
    if (tf < depth + 0.01) col += vec3(1.0, 0.7, 0.4) * flameLightCol() * (0.08 * exp(-hf / 0.006) + 0.01 * exp(-hf / 0.03));
  }
  // dust in the air
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    vec3 mp = vec3(-0.25 + 0.4 * hash11(fi * 3.1), 0.05 + 0.3 * hash11(fi * 5.7), -0.25 + 0.4 * hash11(fi * 1.3));
    mp += vec3(sin(uTime * 0.2 + fi), sin(uTime * 0.13 + fi * 2.0) + uTime * 0.02, cos(uTime * 0.17 + fi * 1.7)) * 0.02;
    vec3 o2 = mp - ro; float t2 = dot(o2, rd);
    if (t2 < 0.0 || t2 > depth) continue;
    float h2 = max(dot(o2, o2) - t2 * t2, 0.0);
    float w = exp(-length(mp - flameC()) * 8.0);
    col += vec3(1.0, 0.6, 0.35) * w * 0.00000004 / (0.0000001 + h2);
  }
  return any(isnan(col)) ? vec3(0.0) : col;
}
`;
