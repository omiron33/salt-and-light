// Vessels and the things around them, shared by the bowl, lamp and bread scenes (units: metres; the
// table top is y = 0). A worn turned wooden bowl, a small open clay oil lamp with a pinched spout and
// a linen wick, a little clay jar, a table of rough oak planks, rough stone walls, an oil-lamp flame,
// and the light helpers (soft shadow, beam in-scattering, lens). Every frame a pure function of uTime.
export const VESSEL_GLSL = /* glsl */ `
// ---------- shapes ----------
float sdCylY(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

// the turned wooden bowl, its foot on the table at o: rim radius ~0.12, 0.07 deep
float bowlSD(vec3 p, vec3 o) {
  vec3 q = p - o;
  vec3 C = vec3(0.0, 0.118, 0.0);
  float R = 0.122;
  float sph = length(q - C) - R;
  float shell = abs(sph + 0.0065) - 0.0065;
  shell = max(shell, q.y - 0.072);
  // a low turned foot
  float foot = sdCylY(q - vec3(0.0, 0.006, 0.0), 0.05, 0.006) - 0.002;
  float d = min(shell, foot);
  d = max(d, -q.y);
  return d;
}
// how high a level inside the bowl (0 at the bottom, 1 at the rim) sits, and the inner radius there
float bowlInnerR(float y) { float C = 0.118, R = 0.122 - 0.013; float dy = y - C; return sqrt(max(R * R - dy * dy, 0.0)); }

// a small open clay lamp: a round saucer with its rim pinched into a spout on +x; origin on the table
float lampSD(vec3 p, vec3 o) {
  vec3 q = p - o;
  // pinch: squeeze the bowl toward the spout
  float ang = atan(q.z, q.x);
  float pinch = exp(-ang * ang * 6.0);
  vec3 s = q; s.z *= 1.0 + 1.2 * pinch * smoothstep(0.02, 0.05, q.x);
  float r = length(s.xz);
  float body = sdEllipsoid(s - vec3(0.0, 0.022, 0.0), vec3(0.055 + 0.012 * pinch, 0.026, 0.055));
  float inner = sdEllipsoid(s - vec3(0.0, 0.03, 0.0), vec3(0.048 + 0.012 * pinch, 0.022, 0.048));
  float d = max(body, -inner);
  d = max(d, q.y - 0.034 - 0.004 * pinch);
  // flat base
  d = max(d, -q.y);
  return d - 0.0015;
}
// the oil's surface level inside the lamp (y above its origin) for fill 0..1
float lampOilY(float fill) { return 0.0105 + 0.019 * fill; }
// the wick: a twist of linen lying in the spout, its end up over the lip
vec3 lampWickTip(vec3 o) { return o + vec3(0.071, 0.039, 0.0); }
float wickSD(vec3 p, vec3 o) {
  vec3 a = o + vec3(0.02, 0.015, 0.0), b = o + vec3(0.06, 0.03, 0.0), c = lampWickTip(o);
  return min(sdCapsule(p, a, b, 0.0032), sdCapsule(p, b, c, 0.0028));
}

// a little clay jar (a juglet): body, neck and lip, axis along local y, origin at its base
float jarSD(vec3 q) {
  float body = sdEllipsoid(q - vec3(0.0, 0.045, 0.0), vec3(0.036, 0.046, 0.036));
  float neck = sdCapsule(q, vec3(0.0, 0.07, 0.0), vec3(0.0, 0.105, 0.0), 0.011);
  float lip = sdCylY(q - vec3(0.0, 0.106, 0.0), 0.016, 0.003) - 0.002;
  float d = smin(smin(body, neck, 0.012), lip, 0.006);
  // hollow mouth
  d = max(d, -(length(q.xz) - 0.008 + max(0.0, 0.1 - q.y)));
  return d;
}

// ---------- materials ----------
// worn turned olive wood: growth rings that wrap the turning, a paler worn hollow
vec3 bowlAlb(vec3 p, vec3 o, out float rough) {
  vec3 q = p - o;
  float rr = length(q.xz + vec2(0.0, 0.03)) * 60.0 + q.y * 20.0 + 3.0 * fbm(q.xz * 30.0 + q.y * 10.0, 3);
  float ring = 0.5 + 0.5 * sin(rr * 6.2831);
  float fib = fbm(vec2(atan(q.z, q.x) * 3.0, q.y * 200.0), 3);
  vec3 a = mix(vec3(0.17, 0.10, 0.05), vec3(0.32, 0.2, 0.1), ring * 0.6 + fib * 0.3);
  // the inside of the bowl worn pale and dry, darker in the scratches
  float inside = smoothstep(0.02, -0.005, length(q - vec3(0.0, 0.118, 0.0)) - 0.11);
  a = mix(a, a * 1.35 + vec3(0.03, 0.02, 0.01), inside * 0.6);
  a *= 0.85 + 0.3 * vnoise(q.xz * 400.0);
  rough = 0.55 - 0.15 * ring;
  return a;
}
// fired clay, a little burnished, soot round the spout
vec3 clayAlb(vec3 p, float soot, out float rough) {
  float g = fbm(p.xz * 120.0 + p.y * 90.0, 4);
  vec3 a = mix(vec3(0.24, 0.13, 0.07), vec3(0.42, 0.25, 0.14), g);
  // grit, fire clouds and a few dark flecks
  a *= 0.75 + 0.45 * vnoise(p * 1400.0);
  a = mix(a, a * vec3(0.55, 0.5, 0.5), smoothstep(0.55, 0.75, fbm(p.xz * 40.0 + p.y * 30.0 + 5.0, 3)));
  a *= 1.0 - 0.6 * step(0.985, hash13(floor(p * 2500.0)));
  a = mix(a, vec3(0.03, 0.025, 0.02), soot);
  rough = 0.6 - 0.15 * g;
  return a;
}
// the table: old oak planks running along x, gaps between, dark with use. Each plank is flat-sawn:
// its growth rings wander along it as soft, wavy arched bands, with fine open pores in short dashes
// along the grain and the odd knot.
float oakRings(vec2 q) {
  float plank = floor(q.y / 0.16 + 0.37);
  float ph = hash11(plank * 3.1);
  vec2 k = vec2(q.x + ph * 7.0, q.y);
  float d = (fract(q.y / 0.16 + 0.37) - 0.5) * 0.16;
  float r = length(vec2(d, 0.02 + 0.05 * sin(k.x * 0.9 + ph * 6.0) + 0.03 * sin(k.x * 2.3 + ph))) + 0.05 * fbm(k * vec2(0.8, 4.0), 3);
  float ring = fract(r * 55.0 + ph * 3.0 + 0.6 * fbm(k * vec2(3.0, 20.0), 2));
  return smoothstep(0.0, 0.35, ring) * smoothstep(1.0, 0.6, ring);
}
float tableH(vec2 q) {
  float pl = fract(q.y / 0.16 + 0.37);
  float gap = smoothstep(0.012, 0.0, pl) + smoothstep(0.988, 1.0, pl);
  return -0.004 * gap - 0.0006 * vnoise(q * vec2(4.0, 9.0));
}
vec3 tableAlb(vec3 p, out float rough) {
  vec2 q = p.xz;
  float plank = floor(q.y / 0.16 + 0.37);
  float ph = hash11(plank * 3.1);
  float ring = oakRings(q);
  float tone = fbm(q * vec2(1.5, 4.0) + ph * 9.0, 3);
  float pore = smoothstep(0.72, 0.85, vnoise(vec2(q.x * 60.0, q.y * 900.0) + ph * 13.0)) * (0.5 + 0.5 * ring);
  float cx = floor(q.x / 0.7);
  vec2 kc = vec2(cx * 0.7 + 0.35 + 0.2 * (hash11(plank * 7.0 + cx) - 0.5), (plank - 0.37 + 0.5) * 0.16);
  float knot = smoothstep(0.018, 0.004, length((q - kc) * vec2(0.6, 1.0))) * step(0.7, hash11(plank * 5.0 + cx));
  vec3 early = vec3(0.16, 0.115, 0.075), late = vec3(0.085, 0.058, 0.037);
  vec3 a = mix(early, late, ring * 0.2 + 0.45 * tone);
  a *= 0.8 + 0.4 * ph;
  a *= 1.0 - 0.35 * pore;
  a = mix(a, vec3(0.04, 0.025, 0.015), knot);
  float pl = fract(q.y / 0.16 + 0.37);
  a *= mix(0.25, 1.0, smoothstep(0.0, 0.015, pl) * smoothstep(1.0, 0.985, pl));
  rough = 0.55 + 0.2 * tone;
  return a;
}
// rough limestone and mortar
vec3 stoneAlb(vec3 p, vec3 n, out float rough) {
  vec2 uv = abs(n.x) > 0.5 ? p.zy : p.xy;
  vec2 bq = uv * vec2(3.2, 5.0);
  bq.x += 0.5 * mod(floor(bq.y), 2.0);
  vec2 f = fract(bq);
  float mortar = smoothstep(0.05, 0.0, min(min(f.x, 1.0 - f.x) * 0.6, min(f.y, 1.0 - f.y)));
  float h = hash12(floor(bq));
  vec3 a = mix(vec3(0.2, 0.17, 0.13), vec3(0.32, 0.27, 0.2), h) * (0.7 + 0.5 * fbm(uv * 12.0, 4));
  a = mix(a, vec3(0.1, 0.09, 0.08), mortar);
  rough = 0.9;
  return a;
}
float stoneBump(vec3 p) { return fbm(p * 14.0, 3) * 0.012; }

// ---------- light ----------
// GGX-ish point light response
vec3 brdf(vec3 n, vec3 v, vec3 L, vec3 alb, float rough, vec3 lc) {
  float nl = sat(dot(n, L));
  vec3 h = normalize(L + v); float nh = sat(dot(n, h));
  float a = max(0.04, rough * rough), a2 = a * a;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float spec = a2 / (PI * dd * dd) * 0.04 * (1.0 + 4.0 * pow(1.0 - sat(dot(n, v)), 5.0));
  return lc * nl * (alb / PI + spec);
}

// an oil-lamp flame standing on b, height h, grown k 0..1 (after the beeswax flames of Faith of the
// Apostles: a teardrop with a hot white core and a blue root, swaying)
vec3 flameAt(vec3 ro, vec3 rd, vec3 b, float h, float k, float seed, float depth) {
  if (k <= 0.001) return vec3(0);
  vec2 dxz = rd.xz; float dd = dot(dxz, dxz);
  float t = dd > 1e-6 ? dot(b.xz - ro.xz, dxz) / dd : 0.0;
  if (t <= 0.0 || t > depth + 0.01) return vec3(0);
  vec3 q = ro + rd * t - b;
  float hh = h * k * (0.88 + 0.24 * vnoise(vec2(uTime * 6.0 + seed, 1.0)));
  float y = q.y / hh;
  if (y < -0.4 || y > 1.5) return vec3(0);
  float sw = (vnoise(vec2(uTime * 1.6 + seed, 3.0)) - 0.5) * 0.6;
  vec2 rr = q.xz - normalize(vec2(-rd.z, rd.x) + 1e-5) * sw * hh * 0.25 * y * y;
  float x = length(rr) / (hh * 0.24);
  float yy = clamp(y, 0.0, 1.0);
  float prof = pow(yy, 0.5) * pow(1.0 - yy, 0.8) * 1.9 + 0.08;
  float body = smoothstep(1.0, 0.55, x / prof) * smoothstep(-0.15, 0.08, y) * smoothstep(1.15, 0.85, y);
  float core = smoothstep(0.55, 0.15, x / prof) * smoothstep(0.0, 0.2, y) * smoothstep(0.75, 0.35, y);
  float root = smoothstep(0.9, 0.3, x / prof) * smoothstep(0.25, 0.0, y) * smoothstep(-0.25, 0.0, y);
  vec3 c = vec3(1.0, 0.45, 0.14) * body * 4.0 + vec3(1.0, 0.8, 0.5) * core * 9.0 + vec3(0.15, 0.3, 1.0) * root * 1.5;
  return c * min(k, 1.2);
}
`;
