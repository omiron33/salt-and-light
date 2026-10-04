// The fishing boat on the night sea (s19-night-sea): a Galilee boat of the first century, about 8 m
// of cedar planking on oak frames, low and broad, with a mast and its furled sail, nets heaped
// amidships, and a clay lantern hung from a short pole at the prow. It rests on still water far out
// on the lake; the lantern is the only warm light, trembling in the water below it.
// Requires GAL_GLSL (lib/x-galilee.js) before it.
import { GAL_GLSL, GAL_UNIFORMS } from '/song/lib/x-galilee.js';

export const BOAT = { pos: [0.0, 0.0, -60.0], yaw: 0.35 };
// the lantern's flame in world space (for the light and focus)
export function lanternPos(t = 0, pos = BOAT.pos, yaw = BOAT.yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = 3.75, ly = 1.5, lz = -0.42;   // boat frame
  const sway = 0.0;
  return [pos[0] + c * (lx + sway) + s * lz, pos[1] + ly + boatBob(t), pos[2] + s * (lx + sway) - c * lz];
}
export function boatBob(t) { return 0.03 * Math.sin(t * 0.7) + 0.012 * Math.sin(t * 1.9 + 1.0); }

export const BOAT_UNIFORMS = { ...GAL_UNIFORMS, uBob: 0.0, uRoll: 0.0, uLant: [0, 1.6, -60], uBPos: BOAT.pos, uBYaw: BOAT.yaw, uLantCol: [0, 0, 0] };

export const BOAT_GLSL = GAL_GLSL + /* glsl */ `
uniform float uBob, uRoll;
uniform vec3 uLant;
uniform vec3 uBPos, uLantCol;
uniform float uBYaw;
#define BPOS uBPos
#define BYAW uBYaw

vec3 toBoat(vec3 p) {
  vec3 q = p - BPOS - vec3(0.0, uBob, 0.0);
  q.xz = rot2(BYAW) * q.xz;
  q.z = -q.z;
  q.yz = rot2(uRoll) * q.yz;
  return q;
}
// the hull: a long, full-bodied shell, pointed at both ends, open on top
float keelY(float u) { return -0.5 + 0.62 * pow(abs(u), 3.0); }
float sheerY(float u) { return 0.58 + 0.3 * u * u + 0.18 * smoothstep(0.75, 1.0, u); }
float beamH(float u) { return 1.15 * pow(max(1.0 - u * u, 0.0), 0.55); }
float hullSD(vec3 q) {
  float L = 4.2;
  float u = clamp(q.x / L, -1.0, 1.0);
  float hb = beamH(u);
  float sheer = sheerY(u), keel = keelY(u);
  // section: a rounded V that flares out to the gunwale
  float yy = (q.y - keel) / max(sheer - keel, 0.01);
  float w = hb * (0.3 + 0.7 * sqrt(sat(yy)));
  float dz = abs(q.z) - w;
  float dy = keel - q.y;
  float d = max(dz, dy) * 0.7;
  // raked stem and stern: the ends lean out as they rise
  d = max(d, abs(q.x) - (3.75 + 0.45 * sat((q.y + 0.4) / 1.2)));
  // open on top: cut off above the gunwale and hollow it out
  d = max(d, q.y - sheer);
  float inner = max(abs(q.z) - (w - 0.05), (keel + 0.07) - q.y);
  inner = max(inner, abs(q.x) - (3.6 + 0.4 * sat((q.y + 0.3) / 1.2)));
  d = max(d, -inner);
  return d;
}
float boatSD(vec3 p, out int id) {
  vec3 q = toBoat(p);
  id = 1;
  if (length(q) > 8.0) return length(q) - 7.0;
  float d = hullSD(q);
  // the gunwale rail
  float L = 4.2, u = clamp(q.x / L, -1.0, 1.0);
  float sheer = sheerY(u);
  float hb = beamH(u);
  float rail = length(vec2(abs(q.z) - hb, q.y - sheer)) - 0.045;
  rail = max(rail, abs(q.x) - 4.1);
  if (rail < d) { d = rail; id = 2; }
  // thwarts (benches)
  for (int i = 0; i < 3; i++) {
    float x = -2.0 + float(i) * 1.7;
    float th = sdBox(q - vec3(x, 0.32, 0.0), vec3(0.12, 0.03, hb * 0.95 - 0.05));
    if (th < d) { d = th; id = 2; }
  }
  // the mast, unstepped yard lowered: the yard and its furled sail lie fore and aft along the
  // thwarts, resting on the stern and against the mast
  float mast = sdCapsule(q, vec3(0.6, -0.3, 0.0), vec3(0.6, 4.6, 0.0), 0.075);
  if (mast < d) { d = mast; id = 3; }
  vec3 ya = vec3(-3.4, 0.95, 0.32), yb = vec3(2.6, 0.72, 0.18);
  float yard = sdCapsule(q, ya, yb, 0.045);
  if (yard < d) { d = yard; id = 3; }
  float sail = sdCapsule(q, ya + vec3(0.25, 0.02, 0.0), yb - vec3(0.25, -0.02, 0.0), 0.12 + 0.035 * sin(q.x * 6.0) + 0.02 * sin(q.x * 17.0));
  if (sail < d) { d = sail; id = 4; }
  // stays from the masthead down to stem and stern
  float st = sdCapsule(q, vec3(0.6, 4.5, 0.0), vec3(3.9, 1.0, 0.0), 0.008);
  st = min(st, sdCapsule(q, vec3(0.6, 4.5, 0.0), vec3(-3.9, 1.0, 0.0), 0.008));
  if (st < d) { d = st; id = 3; }
  // two oars shipped across the gunwales, blades out over the water
  for (int k = 0; k < 2; k++) {
    float sx = k == 0 ? -1.3 : 1.6;
    float sg = k == 0 ? 1.0 : -1.0;
    vec3 oa = vec3(sx - 0.5, 0.55, -0.55 * sg), ob = vec3(sx + 0.7, 0.5, 1.9 * sg);
    float oar = sdCapsule(q, oa, ob, 0.03);
    vec3 bc = ob + normalize(ob - oa) * 0.35 - vec3(0.0, 0.03, 0.0);
    vec3 bq = q - bc;
    vec3 ax = normalize(ob - oa);
    float along = dot(bq, ax);
    vec3 perp = bq - ax * along;
    float blade = max(max(abs(along) - 0.38, abs(perp.y) - 0.012), length(perp - vec3(0.0, perp.y, 0.0)) - 0.09);
    oar = min(oar, blade);
    if (oar < d) { d = oar; id = 3; }
  }
  // a coiled net on the bow platform
  vec3 cq = q - vec3(2.75, 0.42, 0.05);
  float coil = 1e9;
  for (int k = 0; k < 4; k++) {
    float rr = 0.32 - 0.05 * float(k);
    vec3 kq = cq - vec3(0.0, 0.045 * float(k), 0.0);
    coil = min(coil, length(vec2(length(kq.xz) - rr, kq.y)) - 0.03);
  }
  coil += 0.01 * (fbm(q * 30.0, 2) - 0.5);
  if (coil < d) { d = coil; id = 5; }
  // the nets heaped amidships
  float net = sdEllipsoid(q - vec3(-1.0, 0.1, 0.15), vec3(0.9, 0.32, 0.6));
  net += 0.04 * (fbm(q * 9.0, 2) - 0.5);
  net = max(net, -q.y - 0.3);
  if (net < d) { d = net; id = 5; }
  // the lantern pole at the prow and the lantern hanging from it
  float pole = sdCapsule(q, vec3(3.2, 0.5, -0.05), vec3(3.85, 1.9, -0.42), 0.03);
  if (pole < d) { d = pole; id = 3; }
  vec3 lq = q - vec3(3.75, 1.5, -0.42);
  float cord = sdCapsule(lq, vec3(0.0, 0.18, 0.0), vec3(0.04, 0.38, 0.0), 0.005);
  float lant = sdBox(lq - vec3(0.0, -0.02, 0.0), vec3(0.1, 0.14, 0.1)) - 0.012;
  float cap = sdRoundCone(lq, vec3(0.0, 0.12, 0.0), vec3(0.0, 0.2, 0.0), 0.12, 0.025);
  float base = sdBox(lq - vec3(0.0, -0.17, 0.0), vec3(0.12, 0.02, 0.12));
  float frame = min(min(cap, base), cord);
  // the glass: four panes inside four corner posts
  vec3 aq = abs(lq);
  float posts = length(vec2(aq.x - 0.105, aq.z - 0.105)) - 0.01;
  posts = max(posts, abs(lq.y + 0.02) - 0.14);
  frame = min(frame, posts);
  if (frame < d) { d = frame; id = 6; }
  if (lant < d) { d = lant; id = 7; }
  return d;
}
float boatD(vec3 p) { int i; return boatSD(p, i); }
vec3 boatNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.002;
  return normalize(e.xyy * boatD(p + e.xyy) + e.yyx * boatD(p + e.yyx) + e.yxy * boatD(p + e.yxy) + e.xxx * boatD(p + e.xxx));
}
float marchBoat(vec3 ro, vec3 rd, float tmax, out int id) {
  // bounding sphere first
  vec3 oc = ro - BPOS; float b = dot(oc, rd), c = dot(oc, oc) - 64.0;
  float h = b * b - c;
  if (h < 0.0) { id = 0; return -1.0; }
  float t = max(0.0, -b - sqrt(h));
  float t1 = -b + sqrt(h);
  for (int i = 0; i < 140; i++) {
    float d = boatSD(ro + rd * t, id);
    if (d < 0.0006 * t + 0.0005) return t;
    t += d * 0.85;
    if (t > min(t1, tmax)) break;
  }
  id = 0; return -1.0;
}
float boatShadow(vec3 ro, vec3 rd, float tmax) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 24; i++) {
    float h = boatD(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.02, 0.4);
    if (res < 0.02 || t > tmax) break;
  }
  return sat(res);
}

vec3 shadeBoat(vec3 p, vec3 rd, int id) {
  vec3 n = boatNormal(p), v = -rd;
  vec3 q = toBoat(p);
  vec3 alb; float rough = 0.7;
  if (id == 1 || id == 2) {
    // cedar planks, dark with water and pitch, tar-black below the waterline
    float plank = fract(q.y * 7.0 + 0.3 * sin(q.x * 0.6));
    // the lapped strakes catch the light along their lower edges
    if (id == 1) {
      float lap = smoothstep(0.82, 1.0, plank) - smoothstep(0.0, 0.08, plank) * 0.5;
      n = normalize(n + vec3(0.0, 0.55, 0.0) * lap);
      // butt joints and fastenings
      float seam = smoothstep(0.03, 0.0, abs(fract(q.x * 0.55 + floor(q.y * 7.0) * 0.37) - 0.5) - 0.48);
      n = normalize(n + vec3(0.25, 0.0, 0.0) * seam);
    }
    float grain = fbm(vec2(q.x * 3.0, q.y * 60.0), 3);
    alb = mix(vec3(0.12, 0.07, 0.04), vec3(0.24, 0.15, 0.08), grain) * (0.75 + 0.25 * smoothstep(0.0, 0.08, plank));
    alb = mix(alb, vec3(0.03, 0.025, 0.02), smoothstep(0.08, -0.05, p.y));
    if (id == 2) alb *= 1.2;
    rough = 0.6;
  } else if (id == 3) { alb = vec3(0.16, 0.11, 0.07); rough = 0.6; }
  else if (id == 4) { alb = vec3(0.32, 0.27, 0.2) * (0.8 + 0.2 * fbm(q.xz * 8.0, 2)); rough = 0.9; }
  else if (id == 5) { alb = vec3(0.18, 0.15, 0.11) * (0.6 + 0.5 * fbm(q * 20.0, 2)); rough = 0.95; }
  else if (id == 6) { alb = vec3(0.05, 0.04, 0.03); rough = 0.5; }
  else { alb = vec3(0.02); rough = 0.1; }
  vec3 col = vec3(0);
  // the lantern
  vec3 L = uLant - p; float d2 = dot(L, L); vec3 Ld = L * inversesqrt(d2);
  float sh = id >= 6 ? 1.0 : boatShadow(p + n * 0.01, Ld, sqrt(d2) - 0.2);
  col += alb / PI * uLantCol * (sat(dot(n, Ld)) * 0.8 + 0.2 * sat(dot(n, Ld) * 0.5 + 0.5)) / (d2 + 0.02) * (0.25 + 0.75 * sh);
  col += pointSpec(p, n, v, max(rough, 0.3), uLant, uLantCol) * sh * 0.5;
  // light bounced up off the lit water under the prow
  vec3 wp = vec3(uLant.x, 0.0, uLant.z);
  vec3 Lw = wp - p; float dw = dot(Lw, Lw);
  col += alb * uLantCol * 0.05 * sat(dot(n, Lw * inversesqrt(dw))) / (dw + 0.3);
  // sky: the faint glow and the east
  vec3 amb = skyBase(normalize(n + vec3(0.0, 0.7, 0.0)));
  col += alb * amb * 2.0;
  col += alb * skyBase(normalize(vec3(n.x, 0.1, n.z))) * 1.2 * sat(dot(n, EAST) * 0.5 + 0.5);
  col += skyBase(reflect(rd, n)) * fresnelW(n, v) * (1.0 - rough) * 0.5;
  // the lantern's glass glows
  if (id == 7) {
    vec3 lq = q - vec3(3.75, 1.5, -0.42);
    float c = exp(-length(lq.xz) / 0.07) * smoothstep(0.16, -0.04, abs(lq.y + 0.01));
    col = vec3(1.0, 0.55, 0.2) * (0.6 + 2.5 * c) * length(uLantCol) * 2.2 + skyBase(reflect(rd, n)) * 0.1;
  }
  return col;
}

vec3 boatShot(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, ro, rd0);
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  int id; float tb = marchBoat(ro, rd, min(tw, 200.0), id);
  vec3 col; float depth;
  if (tb > 0.0) {
    col = shadeBoat(ro + rd * tb, rd, id); depth = tb;
  } else {
    float tl = rd.y < 0.25 ? marchLand(ro, rd, 50.0, min(tw, 30000.0)) : -1.0;
    if (tl > 0.0) { col = landShade(ro + rd * tl, rd, tl); depth = tl; }
    else if (tw < 1e8) {
      vec3 p = ro + rd * tw; depth = tw;
      vec3 n = waterNormal(p.xz, tw), v = -rd;
      vec3 r = reflect(rd, n); r.y = abs(r.y);
      float F = fresnelW(n, v);
      vec3 refl;
      int rid; float tr = marchBoat(p + vec3(0.0, 0.01, 0.0), r, 60.0, rid);
      if (tr > 0.0) refl = shadeBoat(p + r * tr, r, rid);
      else {
        float tl2 = r.y < 0.12 ? marchLand(p, r, 50.0, 30000.0) : -1.0;
        refl = tl2 > 0.0 ? landShade(p + r * tl2, r, tl2) : skyFull(r);
        tr = 1e4;
      }
      refl += flameAt(p, r, uLant - vec3(0.0, 0.05, 0.0), 0.085, 1.0, 5.0, tr);
      refl += glowAt(p, r, uLant, tr, vec3(1.0, 0.6, 0.3) * length(uLantCol) * 0.02, 0.003, 0.03);
      col = mix(vec3(0.0004, 0.0007, 0.001), refl, F);
      col += pointSpec(p, n, v, 0.1, uLant, uLantCol) * 0.9;
      float fog = 1.0 - exp(-tw * 0.00012);
      col = mix(col, skyBase(normalize(vec3(rd.x, 0.02, rd.z))) * 0.85, fog);
    } else { col = skyFull(rd); depth = 1e5; }
  }
  // the lantern's flame, its glow and the air round it
  col += flameAt(ro, rd, uLant - vec3(0.0, 0.05, 0.0), 0.085, 1.0, 5.0, depth) * 0.6;
  col += glowAt(ro, rd, uLant, depth, vec3(1.0, 0.6, 0.3) * length(uLantCol) * 0.03, 0.002, 0.025);
  col += airGlow(ro, rd, depth, uLant, uLantCol, 0.000012);
  float trans = 1.0;
  vec3 m = mistLayers(ro, rd, depth, trans);
  return col * trans + m;
}
`;
