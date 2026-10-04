// s05's world: close and warm on a rough table at night. A small dark clay oil lamp, empty, its linen
// wick lying dry in the pinched spout. A little clay juglet tilts above it and pours a thread of
// golden olive oil into the bowl (uPour0..uPour1: when the oil leaves the jar's mouth); the oil pools
// and rises (uFill 0..1), creeps up the wick and darkens it (uSoak 0..1), and the flame rises from
// the wick's end (uFlame: song time it catches). Lit before the flame by a warm lamp somewhere off to
// the left, far out of focus; after it, by the new flame itself. Metres; the table top is y = 0.
import { VESSEL_GLSL } from '/song/lib/x-vessel.js';
import { LENS_GLSL } from '/song/lib/x-salt.js';

export const LAMP_UNIFORMS = { uFocus: 0.35, uAper: 0.003, uFill: 0.0, uSoak: 0.0, uPour0: 1e4, uPour1: 1e4, uFlame: 1e4, uTilt: 1.9, uLift: 0.0 };

export const LAMPW_GLSL = LENS_GLSL + VESSEL_GLSL + /* glsl */ `
uniform float uFocus, uAper, uFill, uSoak, uPour0, uPour1, uFlame, uTilt, uLift;
const vec3 LO = vec3(0.0);                          // the lamp
const vec3 KEY = vec3(0.5, 0.3, -0.12);              // the warm lamp off to the left
const vec3 RIM = vec3(-0.4, 0.3, 0.45);              // and a faint second one behind, right
const vec3 KEYC = vec3(1.0, 0.62, 0.3);
const vec3 OILC = vec3(1.0, 0.68, 0.16);

// the jar's frame: its mouth sits over the lamp, tilted by uTilt (radians from upright, toward +x)
vec3 jarDir() { return vec3(sin(uTilt), cos(uTilt), 0.0); }
vec3 jarMouth() { return vec3(-0.012 - 0.05 * uLift, 0.105 + 0.08 * uLift, 0.002 + 0.03 * uLift); }
vec3 jarBase() { return jarMouth() - jarDir() * 0.108 * 0.72; }
vec3 jarLocal(vec3 p) {
  vec3 q = p - jarBase();
  float c = cos(uTilt), s = sin(uTilt);
  return vec3(c * q.x - s * q.y, s * q.x + c * q.y, q.z);
}

// the flame: how far it has grown (0 unlit .. 1 with a flare as it catches)
float flameK() { float x = uTime - uFlame; return x < 0.0 ? 0.0 : 1.0 - exp(-x * 4.0) * cos(x * 7.0) * 0.9; }
float flameFlare() { float x = uTime - uFlame; return x < 0.0 ? 0.0 : exp(-x * 3.0) * smoothstep(0.0, 0.06, x); }
vec3 flameBase() { return lampWickTip(LO) + vec3(0.002, 0.003, 0.0); }
float flick() { return 0.85 + 0.15 * vnoise(vec2(uTime * 9.0, 3.0)); }
vec3 flameLight() { return vec3(1.0, 0.6, 0.28) * (flameK() * flick() + 1.5 * flameFlare()); }

// the thread of oil: particles leave the mouth at speed v0 along the jar's axis and fall; ages
// from the tail (if pouring has stopped) to the head (or where it meets the oil)
vec3 streamAt(float a) {
  vec3 v0 = jarDir() * 0.12;
  return jarMouth() + jarDir() * 0.004 + v0 * a + vec3(0.0, -4.9, 0.0) * a * a + vec3(0.0006 * sin(uTime * 13.0 + a * 90.0), 0.0, 0.0005 * cos(uTime * 11.0 + a * 70.0));
}
float hitAge() {
  // when a particle reaches the oil (or the lamp floor)
  float y0 = jarMouth().y + jarDir().y * 0.004 - (lampOilY(uFill) + LO.y);
  float vy = jarDir().y * 0.12;
  return (vy + sqrt(vy * vy + 4.0 * 4.9 * y0)) / (2.0 * 4.9);
}
float streamSD(vec3 p, out float along) {
  along = 0.0;
  float ah = min(uTime - uPour0, hitAge());
  float at = max(uTime - uPour1, 0.0);
  if (ah <= at || uTime < uPour0) return 1e3;
  float d = 1e3;
  vec3 prev = streamAt(at);
  for (int i = 1; i <= 6; i++) {
    float a = mix(at, ah, float(i) / 6.0);
    vec3 cur = streamAt(a);
    float r = 0.0024 / sqrt(1.0 + a * 40.0) * (0.9 + 0.1 * sin(a * 300.0 - uTime * 40.0));
    float dd = sdCapsule(p, prev, cur, r);
    if (dd < d) { d = dd; along = a; }
    prev = cur;
  }
  return d;
}

float mapL(vec3 p, out int id) {
  float d = lampSD(p, LO); id = 1;
  float w = wickSD(p, LO);
  if (w < d) { d = w; id = 2; }
  float j = jarSD(jarLocal(p) / 0.72) * 0.72;
  if (j < d) { d = j; id = 3; }
  float tb = p.y - tableH(p.xz);
  if (tb < d) { d = tb; id = 4; }
  float wall = 1.6 - p.z;
  if (wall < d) { d = wall; id = 5; }
  return d;
}
vec3 normL(vec3 p) {
  int i; const vec2 e = vec2(1.0, -1.0) * 0.00015;
  return normalize(e.xyy * mapL(p + e.xyy, i) + e.yyx * mapL(p + e.yyx, i) + e.yxy * mapL(p + e.yxy, i) + e.xxx * mapL(p + e.xxx, i));
}
float marchL(vec3 ro, vec3 rd, out int id) {
  float t = 0.01;
  for (int i = 0; i < 150; i++) {
    float d = mapL(ro + rd * t, id);
    if (d < 0.00008 + 0.0002 * t) return t;
    t += d * 0.9;
    if (t > 3.0) break;
  }
  id = -1; return -1.0;
}
float softShadow(vec3 p, vec3 L, float maxt) {
  float res = 1.0, t = 0.003; int id;
  for (int i = 0; i < 18; i++) {
    float h = mapL(p + L * t, id);
    res = min(res, 12.0 * h / t);
    t += clamp(h, 0.002, 0.03);
    if (res < 0.01 || t > maxt) break;
  }
  return sat(res);
}

vec3 lightsAt(vec3 p, vec3 n, vec3 v, vec3 alb, float rough) {
  vec3 col = vec3(0);
  vec3 Lk = normalize(KEY - p);
  float dk = length(KEY - p);
  float pool = exp(-dot(p.xz, p.xz) / 0.09);   // the light falls off away from the lamp
  col += brdf(n, v, Lk, alb, rough, KEYC * 1.3 / (dk * dk + 0.02) * (0.15 + 0.85 * pool) * softShadow(p + n * 0.001, Lk, 0.3));
  vec3 Lr = normalize(RIM - p); float dr = length(RIM - p);
  col += brdf(n, v, Lr, alb, rough, KEYC * 0.6 / (dr * dr + 0.02) * (0.2 + 0.8 * pool));
  float fk = flameK() + 1.5 * flameFlare();
  if (fk > 0.001) {
    vec3 fp = flameBase() + vec3(0.0, 0.012, 0.0);
    vec3 Lf = fp - p; float df = length(Lf); Lf /= df;
    col += brdf(n, v, Lf, alb, rough, flameLight() * 0.0035 / (df * df + 0.0004) * softShadow(p + n * 0.001, Lf, df - 0.006));
  }
  // dim cool night fill
  col += alb * vec3(0.02, 0.025, 0.04) * (0.5 + 0.5 * n.y);
  return col;
}

vec3 env(vec3 d) {
  // what shiny things see: the warm key off left, dark room
  return KEYC * 4.0 * pow(sat(dot(d, normalize(KEY))), 60.0) + KEYC * 0.04 * pow(sat(dot(d, normalize(KEY))), 3.0) + vec3(0.035, 0.022, 0.012) * sat(d.y + 0.3);
}

vec3 shadeL(vec3 p, vec3 rd, int id) {
  vec3 n = normL(p), v = -rd;
  vec3 alb; float rough;
  if (id == 1) {
    float soot = smoothstep(0.05, 0.075, p.x - LO.x) * smoothstep(0.02, 0.04, p.y) * 0.8;
    alb = clayAlb(p, soot, rough) * 0.55;
  } else if (id == 2) {
    // linen wick: pale, darkening and glossy as the oil climbs it; charred at the tip once lit
    float x = (p.x - LO.x - 0.02) / 0.051;
    float wet = smoothstep(uSoak + 0.05, uSoak - 0.05, x);
    alb = mix(vec3(0.55, 0.5, 0.42), vec3(0.16, 0.1, 0.03), wet);
    alb *= 0.8 + 0.3 * sin(atan(p.z, p.y - 0.03) * 6.0 + x * 40.0);
    rough = mix(0.9, 0.3, wet);
    alb = mix(alb, vec3(0.02), smoothstep(0.9, 1.0, x) * step(uFlame, uTime));
  } else if (id == 3) {
    alb = clayAlb(p * 1.3 + 3.0, 0.0, rough) * 0.8;
  } else if (id == 4) {
    alb = tableAlb(p, rough) * 1.4;
  } else {
    vec3 nn = vec3(0, 0, -1);
    alb = stoneAlb(p, nn, rough) * 0.35;
  }
  // fired clay is never smooth: grit and tool marks tilt the normal
  if (id == 1 || id == 3) { n = normalize(n + (vec3(vnoise(p * 500.0), vnoise(p * 500.0 + 3.0), vnoise(p * 500.0 + 6.0)) - 0.5) * 0.1); rough = max(rough, 0.7); }
  vec3 col = lightsAt(p, n, v, alb, rough);
  // glossy fired clay picks up the key
  if (id == 1 || id == 3) col += env(reflect(rd, n)) * 0.04 * (1.0 - rough);
  return col;
}

vec3 lampWorld(vec2 fc) {
  vec3 ro, rd0; vec3 rd = lensRay(fc, uFocus, uAper, ro, rd0);
  int id;
  float t = marchL(ro, rd, id);
  vec3 col = vec3(0.0);
  float depth = 3.0;
  if (t > 0.0) { col = shadeL(ro + rd * t, rd, id); depth = t; }
  // the oil in the lamp: a golden surface at the fill level, inside the bowl
  if (uFill > 0.001 && rd.y < 0.0) {
    float ly = LO.y + lampOilY(uFill);
    float tl = (ly - ro.y) / rd.y;
    vec3 q = ro + rd * tl;
    if (tl > 0.0 && tl < depth + 0.0005 && length((q - LO).xz) < 0.07) {
      // inside the bowl's cavity: test the inner ellipsoid
      vec3 s = q - LO;
      float ang = atan(s.z, s.x);
      float pinch = exp(-ang * ang * 6.0);
      vec3 ss = s; ss.z *= 1.0 + 1.2 * pinch * smoothstep(0.02, 0.05, s.x);
      float inner = sdEllipsoid(ss - vec3(0.0, 0.03, 0.0), vec3(0.048 + 0.012 * pinch, 0.022, 0.048));
      if (inner < -0.0005) {
        // ripples from where the thread falls in
        vec2 hp = streamAt(hitAge()).xz - LO.xz;
        float r = length(s.xz - hp);
        float pour = step(uPour0 + hitAge(), uTime) * step(uTime, uPour1 + 0.4);
        float rip = sin(r * 900.0 - uTime * 30.0) * exp(-r * 60.0) * 0.06 * pour;
        vec3 n = normalize(vec3((s.xz - hp).x / (r + 1e-4) * rip, 1.0, (s.xz - hp).y / (r + 1e-4) * rip));
        n = normalize(n + vec3((vnoise(s.xz * 300.0 + uTime) - 0.5) * 0.04, 0.0, (vnoise(s.xz * 300.0 - uTime) - 0.5) * 0.04));
        float fr = 0.04 + 0.96 * pow(1.0 - sat(dot(n, -rd)), 5.0);
        vec3 refl = env(reflect(rd, n));
        float fk = flameK() + 1.5 * flameFlare();
        // the flame mirrored in the oil
        refl += flameAt(q + n * 0.0005, reflect(rd, n), flameBase(), 0.03, flameK(), 7.0, 1.0) * 0.6;
        // the flame's light lying across the oil: a soft warm sheen toward the spout
        refl += vec3(1.0, 0.6, 0.25) * fk * 0.6 * pow(sat(dot(reflect(rd, n), normalize(flameBase() + vec3(0, 0.012, 0) - q))), 12.0);
        // the body: deep amber, lit through by the key and the flame
        float depthO = (ly - LO.y - 0.008) / 0.025;
        // the body: clear amber oil over the dark clay floor, deeper (darker, richer) toward the middle
        float rr = length(s.xz) / 0.05;
        float dep = (1.0 - rr * rr) * depthO;
        vec3 tint = exp(-vec3(0.25, 0.8, 3.2) * (0.3 + 1.6 * dep));
        float fl = 0.0035 / (dot(flameBase() - q, flameBase() - q) + 0.0004);
        vec3 body = tint * (0.22 + 0.2 * (1.0 - fk) + fl * flameLight() * 0.12) * (0.8 + 0.4 * fbm(s.xz * 400.0, 2));
        refl += KEYC * 5.0 * pow(sat(dot(reflect(rd, n), normalize(RIM - q))), 80.0);
        // the key light caught in the oil as a long soft streak
        refl += KEYC * 8.0 * pow(sat(dot(reflect(rd, n), normalize(KEY - q))), 120.0);
        col = mix(body, refl, fr) + OILC * 0.02;
        depth = tl;
      }
    }
  }
  // the thread of oil: golden, glassy, the key light running down it
  if (uTime > uPour0 && uTime < uPour1 + 0.5) {
    float ts = 0.01; float along; bool hit = false;
    for (int i = 0; i < 48; i++) {
      float d = streamSD(ro + rd * ts, along);
      if (d < 0.00005) { hit = true; break; }
      ts += d;
      if (ts > depth) break;
    }
    if (hit && ts < depth) {
      vec3 q = ro + rd * ts;
      vec2 e = vec2(0.00008, 0.0);
      float a0;
      vec3 n = normalize(vec3(streamSD(q + e.xyy, a0) - streamSD(q - e.xyy, a0), streamSD(q + e.yxy, a0) - streamSD(q - e.yxy, a0), streamSD(q + e.yyx, a0) - streamSD(q - e.yyx, a0)));
      float fr = 0.04 + 0.96 * pow(1.0 - sat(dot(n, -rd)), 5.0);
      vec3 refl = env(reflect(rd, n)) * 1.5;
      // light through the thread: a hot golden core where the key shines through it
      float back = pow(sat(dot(rd, normalize(RIM - q))), 2.0);
      float edge = pow(1.0 - sat(dot(n, -rd)), 2.0);
      vec3 through = vec3(1.0, 0.6, 0.1) * (0.25 + 3.0 * back) * (1.0 - 0.7 * edge) + vec3(1.0, 0.9, 0.6) * 1.5 * pow(sat(dot(reflect(rd, n), normalize(KEY - q))), 30.0);
      col = mix(through, refl, fr);
      depth = ts;
    }
  }
  // the flame and the soft glow it hangs in the air
  float fk = flameK();
  if (fk > 0.001) {
    col += flameAt(ro, rd, flameBase(), 0.03 * (1.0 + 0.4 * flameFlare()), fk, 7.0, depth);
    vec3 gc = flameBase() + vec3(0.0, 0.012, 0.0);
    vec3 og = gc - ro; float tg = dot(og, rd);
    if (tg > 0.0 && tg < depth + 0.02) {
      float hg = sqrt(max(dot(og, og) - tg * tg, 0.0));
      col += vec3(1.0, 0.62, 0.32) * (fk + 2.0 * flameFlare()) * (0.12 * exp(-hg / 0.005) + 0.035 * exp(-hg / 0.035));
    }
  }
  // far off: the warm lamp off to the left, a soft out-of-focus disc on the wall's dark
  {
    vec3 kd = normalize(RIM - uCamPos);
    float a = acos(clamp(dot(rd0, kd), -1.0, 1.0));
    col += KEYC * (smoothstep(0.075, 0.07, a) * 0.22 + exp(-a / 0.08) * 0.06) * (0.9 + 0.1 * vnoise(vec2(uTime * 3.0, 1.0)));
  }
  return col;
}
`;
