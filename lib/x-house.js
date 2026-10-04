// The house world of the lamp scenes (s15-basket, s16-stand, s17-door, s32-lamp2, s34-works2, s44-give).
// One stone house in a lane of a Galilean town. Inside: a single room of rough limestone blocks under a
// beamed roof, crossed by two transverse stone arches; flagstone floor; a low wooden table with bread;
// tall water jars along the left wall; a bronze lampstand; a small arched niche in the back wall; a
// high window behind. Outside: the house's door with a stone threshold and one step down to a lane of
// worn cobbles between two rows of houses, their doorways recessed, each with its own step.
//   room interior x -2.8..2.8, z -2.8..2.6, floor y = 0, ceiling y = 3; front wall z 2.6..3.1 with
//   the door at x -0.5..0.5; street at y = -0.5 for z 3.1..7.6; far row face at z = 7.6.
// Light is the meaning: one clay lamp (lib/x-house-lamp.js) does almost all of it, with real soft
// shadows, a breath of bounce and haze; shadow-only figures ("ghosts") are seen only as shadows.
// Each scene compiles in only what it needs with #defines (see houseFrag). Pure function of uTime.
import { LAMP_GLSL } from '/song/lib/x-house-lamp.js';

export const NEAR_DOORS = [-5.0, -10.5, -16.0, -21.5, 5.6];
export const FAR_DOORS = [0.95, -3.4, -8.2, -13.5, -19.0, 5.2];
// the lamps of the lane (s34): [x, y, z, yaw]
export const LANE_LAMPS = [
  [0.42, 0.012, 3.08, Math.PI / 2],
  [-3.4 + 0.2, -0.32, 7.47, -Math.PI / 2],
  [-5.0 - 0.2, -0.32, 3.23, Math.PI / 2],
  [-8.2 + 0.2, -0.32, 7.47, -Math.PI / 2],
  [-10.5 - 0.2, -0.32, 3.23, Math.PI / 2],
  [-13.5 + 0.2, -0.32, 7.47, -Math.PI / 2],
  [-16.0 - 0.2, -0.32, 3.23, Math.PI / 2],
  [-19.0 + 0.2, -0.32, 7.47, -Math.PI / 2],
  [-21.5 - 0.2, -0.32, 3.23, Math.PI / 2],
];
export const N_LANE = LANE_LAMPS.length;
// the lamp's flame root in world space for a lamp base and yaw (matches LAMP_WICK)
export function flameRoot(base, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), q = [0.071, 0.040, 0];
  return [base[0] + c * q[0] - s * q[2], base[1] + q[1], base[2] + s * q[0] + c * q[2]];
}

export const HOUSE_UNIFORMS = {
  uFocus: 1.0, uAper: 0.0,
  uLamp: [0, 0.755, 0], uLampYaw: 0.0, uLampI: 1.0, uLampSeed: 1.3,
  uStand: [-0.6, 0, -0.4],
  uBounce: 1.0, uHaze: 1.0, uSky: 0.0, uExpo: 1.0, uLampPow: 1.0, uMoon: 1.0, uNPow: 1.0, uWin: 0.0, uLanePow: 1.0, uFog: 0.0, uHandK: 1.0, uAmb: 1.0,
  uBasket: [0, -10, 0], uBasketTilt: 0.0,
  uCloth: 0.0, uDoor: 0.0, uNDoor: 0.0, uNLamp: 0.0,
  uWalk: [0, -50, 0], uWalkBob: 0.0, uHandR: [0, -50, 0], uHandL: [0, -50, 0],
  uLoaf: [0, -50, 0], uNHand: [0, -50, 0],
  uCarry: [0, -50, 0], uCarryK: 0.0,
  uIgn: new Array(12).fill(1e4),
  uCoin: [0, -50, 0], uCoinT: 1e4,
  uBok: new Array(32).fill(0),
};

export function houseFrag(defs = []) {
  return defs.map((d) => `#define ${d}\n`).join('') + LAMP_GLSL + HOUSE_GLSL + 'vec3 shade(vec2 fc) { return house(fc); }';
}

const arr = (a) => a.map((v) => v.toFixed(3)).join(', ');

const HOUSE_GLSL = /* glsl */ `
uniform float uFocus, uAper;
uniform vec3 uLamp; uniform float uLampYaw, uLampI, uLampSeed;
uniform vec3 uStand;
uniform float uBounce, uHaze, uSky, uExpo, uLampPow, uMoon, uNPow, uWin, uLanePow, uFog, uHandK, uAmb;
uniform vec3 uBasket; uniform float uBasketTilt;
uniform float uCloth, uDoor, uNDoor, uNLamp;
uniform vec3 uWalk; uniform float uWalkBob; uniform vec3 uHandR, uHandL, uLoaf, uNHand;
uniform vec3 uCarry; uniform float uCarryK;
uniform float uIgn[12];
uniform vec3 uCoin; uniform float uCoinT;
uniform float uBok[32];   // 8 small far lights: x, y, z, intensity (drawn as lens discs)

const float NEARD[${NEAR_DOORS.length}] = float[](${arr(NEAR_DOORS)});
const float FARD[${FAR_DOORS.length}] = float[](${arr(FAR_DOORS)});
#define NND ${NEAR_DOORS.length}
#define NFD ${FAR_DOORS.length}
#define NLANE ${N_LANE}
const vec4 LANEL[NLANE] = vec4[](${LANE_LAMPS.map((l) => `vec4(${arr(l)})`).join(', ')});

int gSub = -1;
const vec3 BR = vec3(0.16, 0.14, 0.16);   // basket radii

// ---------------- the time of day ----------------
// uSky: 0 night (moon behind the house), 1 the grey-blue before dawn, 2 dawn (glow down the lane, -x)
vec3 toMoon() { return normalize(vec3(-0.35, 0.78, -0.55)); }
vec3 skyCol(vec3 rd) {
  float h = max(rd.y, 0.0);
  vec3 night = mix(vec3(0.013, 0.015, 0.024), vec3(0.003, 0.0035, 0.008), pow(h, 0.45));
  // stars
  vec3 sd = rd * 260.0; vec3 ci = floor(sd); vec3 f = fract(sd) - 0.5;
  float s = hash13(ci); vec3 o = (hash33(ci) - 0.5) * 0.7;
  float star = smoothstep(0.06, 0.0, length(f - o)) * step(0.985, s) * (0.5 + 0.5 * sin(uTime * (2.0 + 3.0 * s) + s * 40.0));
  night += vec3(0.8, 0.85, 1.0) * star * 0.5 * smoothstep(0.02, 0.2, rd.y);
  night += vec3(0.03, 0.035, 0.045) * pow(max(dot(rd, toMoon()), 0.0), 12.0);
  vec3 pre = mix(vec3(0.075, 0.095, 0.15), vec3(0.025, 0.035, 0.075), pow(h, 0.5));
  pre += vec3(0.06, 0.06, 0.08) * pow(max(dot(rd, normalize(vec3(-1.0, 0.05, 0.1))), 0.0), 3.0);
  float e = max(dot(normalize(rd.xz), vec2(-1.0, 0.0)), 0.0);
  vec3 dawn = mix(vec3(0.2, 0.16, 0.2), vec3(0.06, 0.08, 0.16), pow(h, 0.5));
  dawn += vec3(0.9, 0.42, 0.22) * pow(e, 6.0) * exp(-h * 7.0) * 0.9 + vec3(0.5, 0.25, 0.22) * pow(e, 2.0) * exp(-h * 3.0) * 0.3;
  vec3 c = uSky < 1.0 ? mix(night, pre, uSky) : mix(pre, dawn, uSky - 1.0);
  return c;
}
// light from the open sky onto a surface (normal n), before occlusion
vec3 skyIrr(vec3 n) {
  vec3 night = vec3(0.010, 0.013, 0.024) * (0.55 + 0.45 * n.y);
  vec3 pre = vec3(0.06, 0.075, 0.11) * (0.55 + 0.45 * n.y);
  vec3 dawn = vec3(0.16, 0.14, 0.17) * (0.55 + 0.45 * n.y) + vec3(0.3, 0.15, 0.1) * max(-n.x, 0.0) * 0.6;
  return uSky < 1.0 ? mix(night, pre, uSky) : mix(pre, dawn, uSky - 1.0);
}
vec3 moonCol() { return vec3(0.22, 0.27, 0.4) * (1.0 - smoothstep(0.0, 1.0, uSky)) * uMoon; }

// ---------------- props ----------------
float sdJar(vec3 q, float h) {
  // a tall storage jar: swelling body, narrow neck, thick rim
  float y = q.y / h;
  float r = 0.07 + 0.14 * sin(clamp(y, 0.0, 1.0) * 2.6) * smoothstep(1.0, 0.55, y) + 0.055 * smoothstep(0.78, 0.95, y);
  float body = max(length(q.xz) - r * h / 0.75, max(-q.y, q.y - h));
  body = body * 0.7;
  float rim = length(vec2(length(q.xz) - 0.075 * h / 0.75, q.y - h)) - 0.018;
  float d = min(body, rim);
  return max(d, -(max(length(q.xz) - 0.055 * h / 0.75, -(q.y - h * 0.8))));
}
float sdLoaf(vec3 q, float r) {
  float d = sdEllipsoid(q - vec3(0.0, r * 0.32, 0.0), vec3(r, r * 0.42, r));
  // a scored cross on top
  float sc = min(abs(q.x), abs(q.z)) - 0.004;
  return smax(d, -max(sc, -(q.y - r * 0.58)), 0.006);
}

// the open-able door leaf of our house: hinged at x = +0.5 on the outer face, opening outward (+z)
float sdLeaf(vec3 p, float ang) {
  vec3 q = p - vec3(0.5, 0.0, 3.08);
  q.xz = rot(ang) * q.xz;   // rotate into the leaf's frame
  return sdBox(q - vec3(-0.5, 1.0, -0.035), vec3(0.49, 1.0, 0.035));
}
// the neighbour's door (s17): across the lane at x = 0.95, hinged on its inner side, opening inward
float sdNLeaf(vec3 p, float ang) {
  vec3 q = p - vec3(1.4, 0.0, 7.88);
  q.xz = rot(-ang) * q.xz;
  return sdBox(q - vec3(-0.45, 0.5, 0.03), vec3(0.44, 1.0, 0.03));
}

// the lampstand: a round foot, a turned shaft and a dish at the top (lamp base sits at y = 1.37)
float sdStand(vec3 q) {
  float foot = sdRoundCone(q, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.07, 0.0), 0.15, 0.05);
  float sh = sdCapsule(q, vec3(0.0, 0.05, 0.0), vec3(0.0, 1.33, 0.0), 0.017 + 0.006 * sin(q.y * 9.0) * sin(q.y * 9.0));
  float k1 = length(vec2(length(q.xz) - 0.03, q.y - 0.45)) - 0.012;
  float k2 = length(vec2(length(q.xz) - 0.028, q.y - 0.95)) - 0.011;
  float dish = max(sdEllipsoid(q - vec3(0.0, 1.355, 0.0), vec3(0.085, 0.022, 0.085)), -sdEllipsoid(q - vec3(0.0, 1.375, 0.0), vec3(0.075, 0.012, 0.075)));
  return min(min(foot, sh), min(min(k1, k2), dish));
}

// ---------------- the ghosts: shadow-only figures ----------------
#ifdef GHOSTS
float sdGhost(vec3 p) {
  float d = 1e9;
  vec3 q = p - vec3(uWalk.x, -0.5, uWalk.y);
  if (dot(q.xz, q.xz) < 2.2 * 2.2 + 0.0) {
    vec2 fw = vec2(sin(uWalk.z), cos(uWalk.z));
    vec3 l = vec3(dot(q.xz, vec2(fw.y, -fw.x)), q.y - uWalkBob, dot(q.xz, fw));   // x right, z forward
    // a long robe falling in folds to a flared hem, a mantle over the head and shoulders
    float fold = 0.018 * sin(atan(l.z, l.x) * 7.0 + l.y * 2.0) * smoothstep(1.2, 0.2, l.y);
    float robe = sdRoundCone(l, vec3(0.0, 0.1, -0.02), vec3(0.0, 1.2, 0.0), 0.27, 0.17) - fold;
    robe = smax(robe, -(l.y + 0.0), 0.02);
    float sh = sdCapsule(l, vec3(-0.15, 1.33, 0.0), vec3(0.15, 1.33, 0.0), 0.095);
    float head = sdEllipsoid(l - vec3(0.0, 1.58, 0.0), vec3(0.11, 0.13, 0.12));
    float mantle = sdRoundCone(l, vec3(0.0, 1.3, -0.02), vec3(0.0, 1.6, -0.01), 0.21, 0.125);
    mantle = smax(mantle, l.z - 0.07 - 0.25 * (l.y - 1.3), 0.03);
    d = smin(smin(robe, sh, 0.1), min(head, mantle), 0.06);
    // arms from the shoulders to the hands (world-space hands)
    vec3 shR = vec3(uWalk.x, -0.5 + 1.34 + uWalkBob, uWalk.y) + vec3(fw.y, 0.0, -fw.x) * 0.2;
    vec3 shL = vec3(uWalk.x, -0.5 + 1.34 + uWalkBob, uWalk.y) - vec3(fw.y, 0.0, -fw.x) * 0.2;
    d = smin(d, sdRoundCone(p, shR, mix(shR, uHandR, 0.92), 0.07, 0.05), 0.05);
    d = smin(d, sdRoundCone(p, shL, mix(shL, uHandL, 0.92), 0.07, 0.05), 0.05);
    d = min(d, sdRoundCone(p, mix(shR, uHandR, 0.8), uHandR, 0.035, 0.028));
    d = min(d, sdRoundCone(p, mix(shL, uHandL, 0.8), uHandL, 0.035, 0.028));
    // hands: a flat palm and fingers beyond the wrist, and a thumb
    vec3 dR = normalize(uHandR - shR), dL = normalize(uHandL - shL);
    d = min(d, sdCapsule(p, uHandR, uHandR + dR * 0.1, 0.03));
    d = min(d, sdCapsule(p, uHandR + dR * 0.02, uHandR + dR * 0.05 + vec3(0.0, 0.045, 0.0), 0.014));
    d = min(d, sdCapsule(p, uHandL, uHandL + dL * 0.1, 0.03));
    d = min(d, sdCapsule(p, uHandL + dL * 0.02, uHandL + dL * 0.05 + vec3(0.0, 0.045, 0.0), 0.014));
  } else d = length(q.xz) - 2.0;
  // the loaf carried
  d = min(d, sdEllipsoid(p - uLoaf, vec3(0.15, 0.075, 0.12)));
#ifdef NEIGHBOR
  // the neighbour's arm reaching out of the doorway
  vec3 nsh = vec3(0.85, 0.75, 7.75);
  vec3 dn = normalize(uNHand - nsh);
  d = min(d, sdRoundCone(p, nsh, uNHand, 0.05, 0.034));
  d = min(d, sdCapsule(p, uNHand, uNHand + dn * 0.1, 0.03));
  d = min(d, sdCapsule(p, uNHand + dn * 0.02, uNHand + dn * 0.05 + vec3(0.0, 0.045, 0.0), 0.014));
#endif
  return d;
}
#endif

// ---------------- the world ----------------
float rowHeightN(float x) { return abs(x) < 3.3 ? 3.45 : 3.0 + 1.4 * hash11(floor((x + 3.3) / 5.4) + 7.0); }
float rowHeightF(float x) { return 3.1 + 1.6 * hash11(floor((x + 1.6) / 4.9) + 31.0); }

float map(vec3 p, out int id) {
  id = 1; gSub = -1;
  // the near row of houses (ours among them) and the far row, solid masonry
  float row = max(max(p.z - 3.1, -3.3 - p.z), p.y - rowHeightN(p.x));
  float far = max(max(7.6 - p.z, p.z - 14.0), p.y - rowHeightF(p.x));
  float lane = min(row, far);
  lane = max(lane, -80.0 - p.x);
  // our room
  float room = sdBox(p - vec3(0.0, 1.5, -0.1), vec3(2.8, 1.5, 2.7));
  float d = max(lane, -room);
  // our doorway, the high window, the niche
  d = max(d, -sdBox(p - vec3(0.0, 1.0, 2.85), vec3(0.5, 1.0, 0.4)));
  d = max(d, -sdBox(p - vec3(-1.6, 2.25, -3.05), vec3(0.19, 0.23, 0.4)));
  float nic = min(sdBox(p - vec3(1.2, 1.3, -2.95), vec3(0.21, 0.2, 0.16)), max(length(p.xy - vec2(1.2, 1.5)) - 0.21, abs(p.z + 2.95) - 0.16));
  d = max(d, -nic);
  // doorways of the lane: recesses with closed plank doors and a step each
  float doors = 1e9, steps = 1e9;
  if (abs(p.z - 3.1) < 1.0) for (int i = 0; i < NND; i++) {
    float x0 = NEARD[i]; if (abs(p.x - x0) > 1.5) continue;
    d = max(d, -sdBox(p - vec3(x0, 0.5, 3.1), vec3(0.45, 1.0, 0.28)));
    doors = min(doors, sdBox(p - vec3(x0, 0.5, 2.84), vec3(0.44, 1.0, 0.03)));
    steps = min(steps, sdBox(p - vec3(x0, -0.42, 3.22), vec3(0.6, 0.07, 0.11)) - 0.025);
  }
  if (abs(p.z - 7.6) < 1.0) for (int i = 0; i < NFD; i++) {
    float x0 = FARD[i]; if (abs(p.x - x0) > 1.5) continue;
#ifdef NEIGHBOR
    if (i == 0) {
      // the neighbour's doorway goes through into a lit room
      d = max(d, -sdBox(p - vec3(x0, 0.5, 7.7), vec3(0.45, 1.0, 0.31)));
      d = max(d, -sdBox(p - vec3(x0 - 0.2, 0.9, 9.4), vec3(1.6, 1.4, 1.4)));
      doors = min(doors, sdNLeaf(p, uNDoor));
      steps = min(steps, sdBox(p - vec3(x0, -0.42, 7.48), vec3(0.6, 0.07, 0.11)) - 0.025);
      continue;
    }
#endif
    d = max(d, -sdBox(p - vec3(x0, 0.5, 7.6), vec3(0.45, 1.0, 0.28)));
    doors = min(doors, sdBox(p - vec3(x0, 0.5, 7.86), vec3(0.44, 1.0, 0.03)));
    steps = min(steps, sdBox(p - vec3(x0, -0.42, 7.48), vec3(0.6, 0.07, 0.11)) - 0.025);
  }
  // the street (with a gutter down the middle) and our threshold and step
  float street = p.y + 0.5 + 0.012 * smoothstep(0.5, 0.0, abs(p.z - 5.35));
  d = min(d, street);
  steps = min(steps, sdBox(p - vec3(0.0, -0.375, 3.3), vec3(0.86, 0.125, 0.2)) - 0.012);
  steps = min(steps, sdBox(p - vec3(0.0, -0.02, 2.88), vec3(0.6, 0.03, 0.33)) - 0.008);
  if (steps < d) { d = steps; id = 14; }
  if (doors < d) { d = doors; id = 15; }
  // lintels over our door
  float lint = sdBox(p - vec3(0.0, 2.08, 2.85), vec3(0.72, 0.09, 0.27));
  if (lint < d) { d = lint; id = 4; }
#if defined(DOOR_LEAF)
  float lf = sdLeaf(p, uDoor);
  if (lf < d) { d = lf; id = 4; }
#endif

  // ---- inside the room ----
  if (p.z < 2.7 && abs(p.x) < 2.9 && p.y < 3.1) {
    // two transverse arches
    for (int k = 0; k < 2; k++) {
      float z0 = k == 0 ? -1.05 : 1.25;
      float r = length(vec2(p.x, p.y - 0.75));
      float ring = max(abs(r - 2.52) - 0.24, abs(p.z - z0) - 0.21);
      ring = max(ring, 0.75 - p.y);
      float pier = sdBox(vec3(abs(p.x) - 2.55, p.y - 0.375, p.z - z0), vec3(0.25, 0.375, 0.21));
      float a = min(ring, pier);
      if (a < d) { d = a; id = 1; }
    }
    // roof beams across and the reed ceiling above them
    float bx = mod(p.z + 0.2, 0.62) - 0.31;
    float beam = sdBox(vec3(p.x, p.y - 2.93, bx), vec3(2.9, 0.07, 0.065)) - 0.01;
    if (beam < d) { d = beam; id = 4; }
    // the table
    vec3 tq = p - vec3(0.5, 0.0, -0.05);
    float top = sdBox(tq - vec3(0.0, 0.715, 0.0), vec3(0.62, 0.035, 0.38)) - 0.006;
    vec3 lq = vec3(abs(tq.x) - 0.54, tq.y - 0.34, abs(tq.z) - 0.31);
    float legs = sdBox(lq, vec3(0.035, 0.34, 0.035));
    float tab = min(top, legs);
    if (tab < d) { d = tab; id = 4; }
    // bread on the table, and a broken piece
    float br = min(sdLoaf(p - vec3(0.62, 0.75, -0.2), 0.1), sdLoaf(p - vec3(0.86, 0.75, 0.07), 0.085));
    br = min(br, sdEllipsoid(p - vec3(0.66, 0.765, 0.15), vec3(0.05, 0.02, 0.035)));
    if (br < d) { d = br; id = 8; }
    // water jars along the left wall
    for (int k = 0; k < 3; k++) {
      vec3 jp = k == 0 ? vec3(-2.38, 0.0, -2.25) : k == 1 ? vec3(-2.3, 0.0, -1.72) : vec3(-2.36, 0.0, 0.35);
      float h = k == 1 ? 0.62 : 0.78;
      float j = sdJar(p - jp, h);
      if (j < d) { d = j; id = 7; gSub = k; }
    }
#ifdef STAND
    float st = sdStand(p - uStand);
    if (st < d) { d = st; id = 9; }
#endif
#ifdef NICHE
    // a linen cloth hanging over the niche, sliding off to the right
    {
      float off = uCloth * 0.78;
      float cx = 1.2 + off;
      vec2 c = p.xy - vec2(cx, 1.31);
      float fold = 0.005 * sin((p.x - off) * 40.0 + 1.0) + 0.005 * sin((p.x - off) * 21.0 + p.y * 3.0) * (1.0 + 1.5 * uCloth);
      float bunch = uCloth * 0.02 * smoothstep(-0.3, 0.3, c.x);
      float zc = -2.775 + fold + bunch;
      float hw = 0.33 - 0.12 * uCloth;
      float cl = max(abs(p.z - zc) - 0.004, sdBox(vec3(c, 0.0), vec3(hw, 0.36 - 0.02 * sin(c.x * 9.0), 1.0))) * 0.6;
      if (cl < d) { d = cl; id = 10; }
      float rod = sdCapsule(p, vec3(0.82, 1.685, -2.765), vec3(2.25, 1.685, -2.765), 0.011);
      // a worn stone shelf projecting from the sill of the niche
      float shelf = sdBox(p - vec3(1.2, 1.085, -2.725), vec3(0.25, 0.02, 0.035)) - 0.006;
      if (shelf < d) { d = shelf; id = 14; }
      if (rod < d) { d = rod; id = 4; }
    }
#endif
  }
  // the main lamp
  if (uLampI > 0.0) {
    vec3 q = toLampLocal(p, uLamp, uLampYaw);
    float lb = length(q - vec3(0.02, 0.02, 0.0)) - 0.09;
    if (lb < 0.02) { int part; float l = sdLampLocal(q, part); if (l < d) { d = l; id = part == 2 ? 6 : 5; gSub = -1; } }
    else d = min(d, lb);
  }
#ifdef NEIGHBOR
  if (p.z > 7.9) {
    float ledge = sdJar(p - vec3(1.72, -0.5, 8.75), 0.81) * 1.0;
    if (ledge < d) { d = ledge; id = 1; }
    vec3 q = toLampLocal(p, vec3(1.68, 0.31, 8.75), 0.0);
    int part; float l = sdLampLocal(q, part);
    if (l < d) { d = l; id = part == 2 ? 6 : 5; gSub = 30; }
  }
#endif
#ifdef LANE
  for (int i = 0; i < NLANE; i++) {
    vec4 L = LANEL[i];
    vec3 q = toLampLocal(p, L.xyz, L.w);
    float lb = length(q - vec3(0.02, 0.02, 0.0)) - 0.09;
    if (lb < 0.02) { int part; float l = sdLampLocal(q, part); if (l < d) { d = l; id = part == 2 ? 6 : 5; gSub = i; } }
    else d = min(d, lb);
  }
  if (uCarryK > 0.0) {
    // the hand that carries it, cupped under the lamp, and the sleeve running back out of frame
    float hb = length(p - uHandR) - 3.0;
    if (uHandK < 0.5) hb = 1e9;
    if (hb < 0.05) {
      vec3 hp = uHandR;
      float palm = sdEllipsoid(p - hp, vec3(0.055, 0.022, 0.05));
      vec3 dir = normalize(uHandL - hp);
      float wrist = sdRoundCone(p, hp + dir * 0.03, hp + dir * 0.12, 0.026, 0.03);
      vec3 side = normalize(cross(dir, vec3(0, 1, 0)));
      vec3 sa = hp + dir * 0.13, sb = uHandL + dir * 2.0;
      float sh2 = sat(dot(p - sa, sb - sa) / dot(sb - sa, sb - sa));
      float sl = length(sb - sa) * sh2;
      // wool sleeve: loose, gathered in soft folds toward the wrist
      float folds = 0.008 * sin(sl * 38.0 + atan(dot(p - sa, side), (p - sa).y) * 3.0) + 0.006 * sin(sl * 17.0 + 1.3) + 0.01 * (vnoise(p * 30.0) - 0.5);
      float sleeve = sdRoundCone(p, sa, sb, 0.04, 0.13) - folds * smoothstep(0.0, 0.08, sl);
      sleeve *= 0.8;
      // fingers curled up round the lamp's side
      float fing = sdCapsule(p, hp - dir * 0.03 + side * 0.035, hp - dir * 0.045 + side * 0.03 + vec3(0, 0.03, 0), 0.011);
      fing = min(fing, sdCapsule(p, hp - dir * 0.04 - side * 0.0, hp - dir * 0.065 + vec3(0, 0.025, 0), 0.011));
      fing = min(fing, sdCapsule(p, hp - dir * 0.03 - side * 0.035, hp - dir * 0.045 - side * 0.03 + vec3(0, 0.03, 0), 0.011));
      float hand = smin(smin(palm, wrist, 0.02), fing, 0.012);
      if (hand < d) { d = hand; id = 12; }
      if (sleeve < d) { d = sleeve; id = 13; }
    } else d = min(d, hb);
    vec3 q = toLampLocal(p, uCarry, 0.0);
    float lb = length(q - vec3(0.02, 0.02, 0.0)) - 0.09;
    if (lb < 0.02) { int part; float l = sdLampLocal(q, part); if (l < d) { d = l; id = part == 2 ? 6 : 5; gSub = 20; } }
    else d = min(d, lb);
  }
#endif
#ifdef GIVE
  // the loaf and the coins set down on the step outside the door
  float lf2 = sdLoaf(p - vec3(-0.2, -0.237, 3.36), 0.105);
  if (lf2 < d) { d = lf2; id = 8; }
  for (int k = 0; k < 4; k++) {
    vec3 cp = k == 0 ? vec3(0.08, -0.237, 3.34) : k == 1 ? vec3(0.135, -0.237, 3.42) : k == 2 ? vec3(0.07, -0.23, 3.41) : uCoin;
    vec3 q = p - cp;
    if (k == 2) q.xy = rot(0.25) * q.xy;
    if (k == 3) { q.yz = rot(uCoinT) * q.yz; }
    float c = max(length(q.xz) - 0.0115, abs(q.y - 0.0018) - 0.0018) - 0.0004;
    if (c < d) { d = c; id = 11; gSub = k; }
  }
#endif
  return d;
}

float mapShadow(vec3 p) {
  int id; float d = map(p, id);
#ifdef GHOSTS
  d = min(d, sdGhost(p));
#endif
  return d;
}

vec3 calcNormal(vec3 p, float t) {
  float e = 0.0004 + 0.0002 * t;
  vec2 h = vec2(1.0, -1.0) * e; int i;
  return normalize(h.xyy * map(p + h.xyy, i) + h.yyx * map(p + h.yyx, i) + h.yxy * map(p + h.yxy, i) + h.xxx * map(p + h.xxx, i));
}
float march(vec3 ro, vec3 rd, float tmax, out int id) {
  float t = 0.0;
  for (int i = 0; i < 200; i++) {
    float d = map(ro + rd * t, id);
    if (abs(d) < 0.0002 + 0.0006 * t) return t;
    t += d * 0.92;
    if (t > tmax) break;
  }
  id = 0; return -1.0;
}
float softShadow(vec3 p, vec3 L, float rad) {
  vec3 dir = L - p; float D = length(dir); dir /= D;
  // penumbra: an occluder with clearance h at distance t from the receiver shades a light of radius
  // rad at distance D when h < rad * t / D
  float k = max(D / rad, 2.0);
  float res = 1.0, t = 0.012;
  for (int i = 0; i < 64; i++) {
    if (t > D - 0.03) break;
    float h = mapShadow(p + dir * t);
    res = min(res, k * h / t);
    if (res < 0.002) break;
    t += clamp(h, 0.006, 0.35);
  }
  return smoothstep(0.0, 1.0, res);
}
float calcAO(vec3 p, vec3 n, float s) {
  float o = 0.0, w = 1.0; int i;
  for (int k = 1; k <= 5; k++) {
    float h = s * float(k) / 5.0;
    o += w * (h - map(p + n * h, i)); w *= 0.6;
  }
  return sat(1.0 - 2.2 * o / s);
}
#ifdef GHOSTS
// soft shadow of the ghosts alone (for the lamps of the lane)
float ghostShadow(vec3 p, vec3 L) {
  vec3 dir = L - p; float D = length(dir); dir /= D;
  // bounding: the segment must pass near the figure
  vec3 c = vec3(uWalk.x, 0.4, uWalk.y);
  float tc = clamp(dot(c - p, dir), 0.0, D);
  if (length(p + dir * tc - c) > 1.4) return 1.0;
  float res = 1.0, t = 0.02, k = clamp(D / 0.02, 2.0, 30.0);
  for (int i = 0; i < 36; i++) {
    if (t > D - 0.05) break;
    float h = sdGhost(p + dir * t);
    res = min(res, k * h / t);
    if (res < 0.002) break;
    t += clamp(h, 0.01, 0.3);
  }
  return smoothstep(0.0, 1.0, res);
}
#endif

// ---------------- the basket (s15) ----------------
#ifdef BASKET
vec3 bLocal(vec3 p) { vec3 q = p - uBasket; q.xy = rot(-uBasketTilt) * q.xy; return q; }
// coverage of the plaited shell at a local point (1 = fibre, 0 = a gap); also over/under shade
float weave(vec3 h, out float sh) {
  // a coiled-grass basket: thick bundles of grass spiralling up from the rim, sewn coil to coil
  // with a split-palm stitch. The coils are irregular, so slits open between them here and there;
  // fibres fray at the edges; the rim coil is thicker and worn.
  vec3 u = h / BR;
  float th = asin(clamp(u.y, 0.0, 1.0));
  float ph = atan(u.z, u.x);
  float NC = 13.0;
  float wob = 0.18 * (vnoise(vec2(ph * 3.0, 1.0)) - 0.5) + 0.1 * (vnoise(vec2(ph * 11.0, th * 4.0)) - 0.5);
  float B = th / 1.5707963 * NC + ph / 6.2831853 + wob;           // the spiral: one coil per turn
  float ci = floor(B), fb = fract(B);
  float fray = 0.06 * (vnoise(vec2(ph * 260.0, ci * 7.0)) - 0.5) + 0.04 * (vnoise(vec2(ph * 90.0, ci * 3.0 + B * 9.0)) - 0.5);
  // coil cross-section 0 at the seams, 1 at the crown
  float cs = sin(PI * fb);
  // the slit between coils: usually closed, opens in runs where the sewing has loosened
  float open = smoothstep(0.6, 0.9, vnoise(vec2(ph * 6.0 + ci * 3.7, ci * 1.3))) * 0.1 + 0.012 * hash11(ci * 5.0) - 0.01;
  float gap = smoothstep(open + 0.015, open - 0.01, min(fb, 1.0 - fb) + fray);
  // stitches: slanting wraps across each coil at intervals round the basket
  float sa = ph / 6.2831853 * (22.0 + 2.0 * hash11(ci)) + fb * 0.35 + ci * 0.37 + 0.08 * vnoise(vec2(ph * 40.0, ci));
  float st = smoothstep(0.1, 0.0, abs(fract(sa) - 0.5) - 0.38);
  // little holes punched by the stitching awl
  float hole = smoothstep(0.035, 0.0, length(vec2((fract(sa) - 0.5) * 0.5, min(fb, 1.0 - fb) - 0.02))) * step(0.6, hash11(floor(sa) + ci * 31.0));
  float cov = 1.0 - max(gap, hole);
  cov = max(cov, smoothstep(0.8, 0.95, u.y));
  cov = max(cov, smoothstep(0.12, 0.04, th));
  float fib = 0.7 + 0.3 * vnoise(vec2(ph * 400.0 + ci, fb * 6.0)) * (0.8 + 0.2 * vnoise(vec2(ph * 60.0, ci)));
  sh = (0.35 + 0.65 * sqrt(cs)) * fib * mix(1.0, 0.65, st) * (0.8 + 0.4 * hash11(ci * 2.3));
  // worn, darker rim
  sh *= mix(0.75, 1.0, smoothstep(0.0, 0.15, th));
  return cov;
}
// ray against the shell (upper half of the ellipsoid); returns the two roots
vec2 basketHit(vec3 ro, vec3 rd) {
  vec3 o = bLocal(ro) / BR; vec3 d = rd; d.xy = rot(-uBasketTilt) * d.xy; d /= BR;
  float a = dot(d, d), b = dot(o, d), c = dot(o, o) - 1.0, h = b * b - a * c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2((-b - h) / a, (-b + h) / a);
}
// light passing from p to L through the plait
float basketTrans(vec3 p, vec3 L) {
  vec3 dir = L - p;
  vec2 r = basketHit(p, dir);
  float T = 1.0, sh;
  for (int k = 0; k < 2; k++) {
    float s = k == 0 ? r.x : r.y;
    if (s <= 0.0 || s >= 1.0) continue;
    vec3 h = bLocal(p + dir * s);
    if (h.y < 0.0) continue;
    T *= mix(1.0, 0.035, weave(h, sh));
  }
  return T;
}
#endif

// ---------------- what the main lamp's light passes ----------------
float clothTrans(vec3 p, vec3 L) {
#ifdef NICHE
  float z0 = -2.775;
  if ((p.z - z0) * (L.z - z0) >= 0.0) return 1.0;
  float s = (z0 - p.z) / (L.z - p.z);
  vec3 h = p + (L - p) * s;
  float off = uCloth * 0.78, hw = 0.33 - 0.12 * uCloth;
  if (abs(h.x - 1.2 - off) < hw && abs(h.y - 1.31) < 0.36) return 0.07;
#endif
  return 1.0;
}
float lampVis(vec3 p, vec3 L) {
  float v = 1.0;
#ifdef BASKET
  v *= basketTrans(p, L);
#endif
#ifdef NICHE
  v *= clothTrans(p, L);
#endif
  return v;
}
// analytic visibility of the lamp for the haze (no march): apertures the light must pass
float hazeVis(vec3 p, vec3 L) {
  float v = lampVis(p, L);
#ifdef DOORSHAFT
  if (p.z > 2.6 && L.z < 2.6) {
    for (int k = 0; k < 2; k++) {
      float z0 = k == 0 ? 2.6 : 3.1;
      if (p.z < z0) continue;
      float s = (z0 - p.z) / (L.z - p.z);
      vec3 h = p + (L - p) * s;
      v *= smoothstep(0.52, 0.48, abs(h.x)) * smoothstep(1.99, 1.97, h.y) * step(-0.02, h.y);
    }
  }
#endif
#ifdef NICHE
  if (p.z > -2.8 && L.z < -2.8) {
    float s = (-2.8 - p.z) / (L.z - p.z);
    vec3 h = p + (L - p) * s;
    float inN = max(step(abs(h.x - 1.2), 0.21) * step(abs(h.y - 1.3), 0.2), step(length(h.xy - vec2(1.2, 1.5)), 0.21));
    v *= inN;
  }
#endif
  return v;
}
// the moon through the high window, for the haze inside
float windowVis(vec3 p) {
  vec3 m = toMoon();
  if (p.z > -2.8 && p.z < 2.6 && abs(p.x) < 2.8) {
    float s0 = (-2.8 - p.z) / m.z, s1 = (-3.3 - p.z) / m.z;
    vec3 a = p + m * s0, b = p + m * s1;
    return step(abs(a.x + 1.6), 0.19) * step(abs(a.y - 2.25), 0.23) * step(abs(b.x + 1.6), 0.19) * step(abs(b.y - 2.25), 0.23);
  }
  return 0.0;
}

// ---------------- materials ----------------
// rubble masonry: rough, irregular fieldstones in rough courses, bedded in mud mortar; returns
// albedo and a bump height h (stone faces domed and pitted, mortar sunk)
vec3 stoneWall(vec2 uv, out float h) {
  vec2 q = uv * vec2(4.6, 6.8);
  q.x += 0.35 * sin(q.y * 1.3) + 0.25 * (vnoise(q * 0.7) - 0.5);
  vec2 v = voronoiEdge(q + 0.18 * vec2(vnoise(q * 3.0), vnoise(q * 3.0 + 7.0)));
  float e = v.x;
  float id = v.y;
  float rough = fbm(uv * 22.0 + id * 13.0, 5);
  float fine = vnoise(uv * 140.0);
  float ee = e + 0.06 * (rough - 0.5);
  float mortar = 1.0 - smoothstep(0.025, 0.06, ee);
  float dome = sqrt(sat((ee - 0.06) / 0.4));
  h = dome * 0.75 + 0.3 * rough + 0.06 * fine - 0.2 * smoothstep(0.62, 0.8, fbm(uv * 45.0 + 3.0, 3));
  // limestone in warm and grey tones, now and then a dark basalt stone
  vec3 lime = mix(vec3(0.42, 0.37, 0.31), vec3(0.62, 0.57, 0.49), hash11(id * 91.0));
  lime *= mix(vec3(1.0), vec3(1.05, 0.98, 0.9), hash11(id * 37.0));
  lime = mix(lime, vec3(0.44, 0.42, 0.39), smoothstep(0.6, 0.9, hash11(id * 17.0)));
  vec3 a = id > 0.93 ? vec3(0.3, 0.28, 0.26) : lime;
  a *= 0.7 + 0.45 * rough;
  a *= 0.9 + 0.1 * fine;
  vec3 mud = vec3(0.2, 0.18, 0.15) * (0.65 + 0.5 * fbm(uv * 60.0, 3));
  // the stone's rim catches less light where it rolls into the joint
  a *= 0.85 + 0.15 * smoothstep(0.04, 0.2, ee);
  return mix(a, mud * 1.1, mortar);
}
// coursed, rough-hewn limestone blocks (outside walls): courses of varying height, blocks of varying
// length, edges broken and faces pitched by the chisel
vec3 ashlar(vec2 uv, out float h) {
  vec2 w = uv + 0.05 * vec2(vnoise(uv * 5.0) - 0.5, vnoise(uv * 5.0 + 3.0) - 0.5) + 0.015 * vec2(vnoise(uv * 27.0) - 0.5, vnoise(uv * 23.0 + 5.0) - 0.5);
  float rowH = 0.32;
  float row = floor(w.y / rowH);
  float fy = fract(w.y / rowH) * rowH;
  float off = hash11(row * 3.7) * 2.0;
  float u = w.x + off;
  // blocks of irregular length along each course
  float bl = 0.42 + 0.4 * hash11(row * 1.9);
  float col = floor(u / bl);
  float fx = fract(u / bl) * bl;
  float e = min(min(fx, bl - fx), min(fy, rowH - fy));
  float id = hash12(vec2(col, row));
  float pit = fbm(uv * 16.0 + id * 9.0, 5);
  float fine = vnoise(uv * 160.0);
  float chip = smoothstep(0.62, 0.78, fbm(uv * 9.0 + id * 3.0, 3));
  float ee = e - 0.03 * chip;
  float joint = 1.0 - smoothstep(0.0, 0.012, ee + 0.02 * (fbm(uv * 30.0 + 3.0, 3) - 0.5));
  // the face pillowed to its edges, a little tilted per block
  float face = sqrt(sat(ee / 0.08));
  h = face * 0.9 + 0.45 * pit + 0.05 * fine + 0.15 * (hash11(id * 13.0) - 0.5) * (fx / bl - 0.5);
  vec3 a = mix(vec3(0.47, 0.42, 0.35), vec3(0.6, 0.55, 0.47), id) * mix(vec3(1.0), vec3(1.04, 0.98, 0.91), hash11(id * 41.0));
  a *= 0.74 + 0.38 * pit;
  a *= 0.93 + 0.07 * fine;
  // big stains of age across many stones, darker low down where rain splashes
  a *= 0.8 + 0.3 * fbm(uv * 0.9 + 17.0, 4);
  a *= mix(0.75, 1.0, smoothstep(-0.5, 0.6, uv.y));
  a *= 0.55 + 0.45 * smoothstep(0.0, 0.07, ee);   // the stone rolls away into the joint
  vec3 mud = vec3(0.22, 0.19, 0.15) * (0.6 + 0.6 * fbm(uv * 40.0, 3));
  return mix(a, mud, joint);
}
// worn basalt and limestone paving of the lane
vec3 paving(vec2 uv, out float h) {
  // irregular worn fieldstones of many sizes bedded in packed earth: two voronoi scales, the stones
  // domed and rounded, their gaps uneven, grit and small pebbles in the earth between
  vec2 w = uv + 0.06 * vec2(fbm(uv * 3.0, 3) - 0.5, fbm(uv * 3.0 + 7.0, 3) - 0.5);
  vec2 v = voronoiEdge(w * 4.6 + 0.35 * vec2(fbm(uv * 9.0, 3), fbm(uv * 9.0 + 4.0, 3)));
  float n = fbm(uv * 8.0 + v.y * 17.0, 5);
  float fine = vnoise(uv * 220.0);
  float gapw = 0.035 + 0.04 * hash11(v.y * 9.0) + 0.03 * (vnoise(uv * 12.0) - 0.5);
  float e = v.x - gapw + 0.04 * (n - 0.5);
  float g = smoothstep(0.0, 0.06, e);
  h = g * 0.7 * sqrt(sat(e / 0.3)) + 0.35 * n + 0.05 * fine + 0.25 * (hash11(v.y * 5.0) - 0.5) * (uv.x + uv.y);
  vec3 basalt = vec3(0.2, 0.19, 0.18), lime = vec3(0.44, 0.4, 0.34);
  vec3 a = mix(basalt, lime, smoothstep(0.3, 0.65, hash11(v.y * 3.7))) * (0.65 + 0.5 * n) * (0.9 + 0.1 * fine);
  a *= 0.75 + 0.4 * hash11(v.y * 13.0);
  // polished crowns where feet pass
  a *= 0.6 + 0.4 * smoothstep(0.0, 0.15, e);
  a *= 0.7 + 0.6 * fbm(uv * 2.5 + 9.0, 3);
  float peb = smoothstep(0.75, 0.85, vnoise(uv * 70.0));
  vec3 earth = vec3(0.2, 0.17, 0.13) * (0.6 + 0.6 * fbm(uv * 30.0, 3)) + vec3(0.12, 0.1, 0.08) * peb;
  return mix(earth, a, g);
}
vec3 flagFloor(vec2 uv, float sc, out float h) {
  vec2 q = uv * sc;
  vec2 v = voronoiEdge(q + 0.25 * vec2(vnoise(q * 2.0), vnoise(q * 2.0 + 5.0)));
  float n = fbm(uv * 11.0 + v.y * 7.0, 5);
  float fine = vnoise(uv * 160.0);
  float g = smoothstep(0.01, 0.035, v.x + 0.03 * (n - 0.5));
  h = g * 0.5 * sqrt(sat((v.x - 0.01) / 0.3)) + 0.3 * n + 0.05 * fine;
  vec3 a = mix(vec3(0.36, 0.32, 0.27), vec3(0.5, 0.45, 0.38), v.y) * (0.65 + 0.5 * n) * (0.92 + 0.08 * fine);
  float crack = (1.0 - smoothstep(0.0, 0.0025, abs(fbm(uv * 2.5 + v.y * 9.0, 3) - 0.5))) * step(0.55, hash11(v.y * 31.0));
  a *= 1.0 - 0.7 * crack;
  // a film of pale dust, thicker toward the walls and in the hollows
  float dust = smoothstep(0.4, 0.8, fbm(uv * 4.0 + 6.0, 3));
  a = mix(a, vec3(0.5, 0.46, 0.4), dust * 0.25);
  vec3 dirt = a * 0.55 * (0.7 + 0.5 * fbm(uv * 30.0, 3));
  return mix(dirt, a, g);
}
vec3 woodAlb(vec3 p, vec3 n) {
  vec2 uv = abs(n.y) > 0.5 ? p.xz : abs(n.x) > 0.5 ? p.zy : p.xy;
  // planks along u, each its own tone, grain running along them, worn paler where hands go
  float pl = floor(uv.y / 0.13);
  float seam = smoothstep(0.004, 0.0, min(fract(uv.y / 0.13), 1.0 - fract(uv.y / 0.13)) * 0.13);
  float g = fbm(vec2(uv.x * 2.5 + pl * 7.0, uv.y * 70.0), 5);
  float knot = smoothstep(0.75, 0.9, fbm(uv * vec2(6.0, 18.0) + pl, 3));
  vec3 a = mix(vec3(0.16, 0.1, 0.06), vec3(0.3, 0.2, 0.12), hash11(pl * 3.3)) * (0.65 + 0.6 * g);
  a *= 1.0 - 0.5 * knot;
  return a * (1.0 - 0.7 * seam);
}
// ---------------- light ----------------
vec3 lampRoot() { return fromLampLocal(LAMP_WICK, uLamp, uLampYaw); }
float ggx(vec3 n, vec3 v, vec3 l, float r) {
  vec3 h = normalize(v + l); float nh = sat(dot(n, h)); float a2 = max(r * r, 0.002); a2 *= a2;
  float d = nh * nh * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d) * 0.25;
}
// direct light of one point lamp
vec3 pointLight(vec3 p, vec3 n, vec3 v, vec3 alb, float rough, float spec, vec3 L, float I, float vis, float wrap) {
  vec3 l = L - p; float d2 = dot(l, l); l *= inversesqrt(d2);
  float nl = sat((dot(n, l) + wrap) / (1.0 + wrap));
  vec3 E = FLAME_COL * I * vis / (d2 + 0.06);
  return E * nl * (alb / PI + spec * ggx(n, v, l, rough));
}

vec3 shadeSurf(vec3 p, vec3 n, vec3 rd, int id, int sub, float t) {
  vec3 v = -rd;
  vec3 alb = vec3(0.4); float rough = 0.8, spec = 0.04, wrap = 0.0; vec3 emit = vec3(0);
  bool inside = p.z < 2.62 && abs(p.x) < 2.82 && p.y > -0.05 && p.y < 3.05;
  if (id == 1) {
    float h = 0.0, hx, hy;
    if (n.y > 0.6) {
      // floors: flagstones inside, cobbles in the street, worn slabs on steps and thresholds
      bool street = p.y < -0.45 && p.z > 3.1;
      float sc = inside ? 1.7 : 3.6;
      vec2 e = vec2(0.003, 0.0);
      if (street) { alb = paving(p.xz, h); paving(p.xz + e.xy, hx); paving(p.xz + e.yx, hy); }
      else { alb = flagFloor(p.xz, sc, h); flagFloor(p.xz + e.xy, sc, hx); flagFloor(p.xz + e.yx, sc, hy); }
      if (inside) {
        // beaten earth floor, flags only here and there, swept smooth
        float m = smoothstep(0.45, 0.6, fbm(p.xz * 0.9 + 4.0, 3));
        float n2 = fbm(p.xz * 14.0, 4);
        vec3 earth = vec3(0.3, 0.25, 0.19) * (0.7 + 0.45 * n2);
        alb = mix(earth, alb, m); h = mix(0.25 * n2, h, m); hx = mix(0.25 * fbm((p.xz + e.xy) * 14.0, 4), hx, m); hy = mix(0.25 * fbm((p.xz + e.yx) * 14.0, 4), hy, m);
      }
      n = normalize(n + vec3(-(hx - h), 0.0, -(hy - h)) * (street ? 5.0 : 5.0));
      rough = 0.7; spec = street ? 0.06 : 0.04;
      if (street) alb *= vec3(0.86, 0.86, 0.9);
    } else if (n.y < -0.6) {
      alb = vec3(0.12, 0.09, 0.06) * (0.7 + 0.5 * fbm(p.xz * 6.0, 3));   // reed and clay ceiling
    } else {
      vec2 uv = abs(n.x) > abs(n.z) ? vec2(p.z, p.y) : vec2(p.x, p.y);
      vec3 n0 = n;
      vec2 e = vec2(0.003, 0.0);
      if (inside) { alb = stoneWall(uv, h); stoneWall(uv + e.xy, hx); stoneWall(uv + e.yx, hy); }
      else { alb = ashlar(uv, h); ashlar(uv + e.xy, hx); ashlar(uv + e.yx, hy); hx = h + (hx - h) * 0.8; hy = h + (hy - h) * 0.8; }
      vec3 tu = abs(n.x) > abs(n.z) ? vec3(0, 0, 1) : vec3(1, 0, 0);
      n = normalize(n - (tu * (hx - h) + vec3(0, 1, 0) * (hy - h)) * 6.0);
      // inside, the walls are mud-plastered and limewashed long ago; the plaster has fallen away in
      // places and the stones show through
      if (inside) {
        // lime plaster over rubble, hand-spread: it follows the stones beneath in soft lumps, has a
        // coarse sandy grain, trowel marks, hairline cracks, and is darkened by years of lamp smoke
        // toward the ceiling. Only at the very bottom, where feet and water wear it, the stones show.
        float pm = 1.0 - smoothstep(0.1, 0.0, p.y + 0.12 * (fbm(uv * 3.0, 3) - 0.5)) ;
        float lump = fbm(uv * 2.2 + 3.0, 4) + 0.35 * fbm(uv * 9.0 + 1.0, 3);
        float tr = fbm(vec2(uv.x * 7.0 + 2.0 * fbm(uv * 1.3, 2), uv.y * 2.5), 4);
        float sand = vnoise(uv * 380.0) * 0.6 + vnoise(uv * 150.0) * 0.4;
        float hair = 1.0 - smoothstep(0.0, 0.004, abs(fbm(uv * vec2(2.0, 5.0) + 9.0, 4) - 0.5));
        hair *= smoothstep(0.62, 0.72, fbm(uv * 1.7 + 21.0, 3));
        float soot = smoothstep(1.4, 2.9, p.y) * (0.6 + 0.4 * fbm(uv * vec2(4.0, 1.2), 3));
        float pit = smoothstep(0.75, 0.9, fbm(uv * 70.0, 2)) * 0.6;
        vec3 plas = vec3(0.68, 0.63, 0.55) * (0.84 + 0.18 * tr) * (0.85 + 0.15 * sand) * (0.82 + 0.25 * fbm(uv * 5.0 + 7.0, 3)) * (0.7 + 0.45 * fbm(uv * 0.7 + 13.0, 4)) * (1.0 - 0.25 * pit);
        plas *= 1.0 - 0.15 * hair;
        plas = mix(plas, vec3(0.12, 0.1, 0.085), soot * 0.72);
        // rubble edge of the plaster near the floor
        alb = mix(alb * 0.6, plas, pm);
        vec2 e2 = vec2(0.003, 0.0);
        float H0 = 0.5 * fbm(uv * 2.2 + 3.0, 4) + 0.12 * tr + 0.02 * sand;
        float Hx = 0.5 * fbm((uv + e2.xy) * 2.2 + 3.0, 4) + 0.12 * fbm(vec2((uv.x + e2.x) * 7.0 + 2.0 * fbm((uv + e2.xy) * 1.3, 2), uv.y * 2.5), 4) + 0.02 * (vnoise((uv + e2.xy) * 380.0) * 0.6 + vnoise((uv + e2.xy) * 150.0) * 0.4);
        float Hy = 0.5 * fbm((uv + e2.yx) * 2.2 + 3.0, 4) + 0.12 * fbm(vec2(uv.x * 7.0 + 2.0 * fbm((uv + e2.yx) * 1.3, 2), (uv.y + e2.y) * 2.5), 4) + 0.02 * (vnoise((uv + e2.yx) * 380.0) * 0.6 + vnoise((uv + e2.yx) * 150.0) * 0.4);
        float Ma = 0.25 * fbm(uv * 9.0 + 1.0, 3), Mx = 0.25 * fbm((uv + e2.xy) * 9.0 + 1.0, 3), My = 0.25 * fbm((uv + e2.yx) * 9.0 + 1.0, 3);
        vec3 pnrm = normalize(n0 - (tu * (Hx - H0 + Mx - Ma) + vec3(0, 1, 0) * (Hy - H0 + My - Ma)) * 16.0);
        n = normalize(mix(n, pnrm, pm));
        rough = 0.92;
        // inside the niche: blackened by years of the lamp's smoke, darkest over the flame
        if (p.z < -2.81 && abs(p.x - 1.2) < 0.3) alb *= mix(0.3, 0.06, smoothstep(1.15, 1.55, p.y)) * (0.7 + 0.6 * fbm(uv * 14.0, 4));
        else if (p.z < -2.7) alb *= 1.0 - 0.8 * exp(-length((p.xy - vec2(1.2 + 0.08 * (p.y - 1.7), 1.95)) * vec2(3.2, 1.1)) * 2.2) * smoothstep(1.45, 1.7, p.y);
      }
      if (!inside) rough = 0.85;
    }
  } else if (id == 4) {
    alb = woodAlb(p, n); rough = 0.6; spec = 0.05;
  } else if (id == 15) {
    // plank doors: vertical boards of old weathered cedar, grey at the edges, a dark iron stud or two
    vec2 uv = abs(n.x) > abs(n.z) ? p.zy : p.xy;
    float bw = 0.15;
    float pl = floor(uv.x / bw);
    float fx = fract(uv.x / bw);
    float seam = 1.0 - smoothstep(0.0, 0.05, min(fx, 1.0 - fx));
    float g = fbm(vec2(uv.x * 40.0 + pl * 3.0, uv.y * 2.2), 5);
    float g2 = fbm(vec2(uv.x * 160.0, uv.y * 6.0 + pl), 3);
    vec3 a = mix(vec3(0.13, 0.1, 0.08), vec3(0.22, 0.19, 0.16), hash11(pl * 5.1)) * (0.7 + 0.45 * g) * (0.8 + 0.35 * g2);
    a = mix(a, vec3(0.22, 0.21, 0.2), 0.4 * smoothstep(0.45, 0.8, fbm(uv * 3.0, 3)));   // silvered by weather
    // cross battens
    float bat = smoothstep(0.035, 0.025, abs(uv.y - 0.15)) + smoothstep(0.035, 0.025, abs(uv.y - 1.2));
    alb = a * (1.0 - 0.75 * seam) * (1.0 - 0.25 * sat(bat));
    float stud = smoothstep(0.012, 0.008, length(vec2(fx - 0.5, (fract((uv.y - 0.15) / 1.05 + 0.5) - 0.5) * 1.05 / bw) * vec2(bw, bw)));
    alb = mix(alb, vec3(0.05, 0.045, 0.04), stud);
    rough = 0.75; spec = 0.03;
    n = normalize(n + (abs(n.x) > abs(n.z) ? vec3(0, 0, 1) : vec3(1, 0, 0)) * (g2 - 0.5) * 0.15);
  } else if (id == 14) {
    // worn limestone step: smooth where feet go, pitted, a few chips on the edge
    float pit = fbm(p.xz * 18.0 + p.y * 3.0, 5);
    float fine = vnoise(p.xz * 140.0 + p.y * 40.0);
    float wear = smoothstep(0.1, 0.0, abs(p.x - floor(p.x / 5.0 + 0.5) * 5.0) - 0.25);
    alb = vec3(0.5, 0.46, 0.4) * (0.72 + 0.4 * pit) * (0.92 + 0.08 * fine);
    alb *= 0.8 + 0.3 * fbm(p.xz * 2.0 + 7.0, 3);
    rough = mix(0.8, 0.5, wear); spec = 0.04;
    vec3 e = vec3(0.004, 0.0, 0.0);
    float hx = fbm((p.xz + e.xy) * 18.0 + p.y * 3.0, 5), hz = fbm((p.xz + e.yx) * 18.0 + p.y * 3.0, 5);
    n = normalize(n + vec3(-(hx - pit), 0.0, -(hz - pit)) * 2.0 * step(0.6, n.y));
  } else if (id == 5) {
    vec3 q;
    if (sub < 0) q = toLampLocal(p, uLamp, uLampYaw);
    else if (sub == 30) q = toLampLocal(p, vec3(1.68, 0.31, 8.75), 0.0);
#ifdef LANE
    else if (sub == 20) q = toLampLocal(p, uCarry, 0.0);
    else q = toLampLocal(p, LANEL[sub].xyz, LANEL[sub].w);
#endif
    alb = clayAlbedo(q); rough = 0.55; spec = 0.05; wrap = 0.2;
  } else if (id == 6) {
    alb = vec3(0.04, 0.03, 0.025); rough = 0.9;
    // the glowing end of the wick
    vec3 q; float k = uLampI;
    if (sub < 0) q = toLampLocal(p, uLamp, uLampYaw);
    else if (sub == 30) { q = toLampLocal(p, vec3(1.68, 0.31, 8.75), 0.0); k = uNLamp; }
#ifdef LANE
    else if (sub == 20) { q = toLampLocal(p, uCarry, 0.0); k = uCarryK; }
    else { q = toLampLocal(p, LANEL[sub].xyz, LANEL[sub].w); k = sat((uTime - uIgn[sub]) * 4.0); }
#endif
    emit = vec3(1.0, 0.28, 0.04) * 1.2 * smoothstep(0.0375, 0.0405, q.y) * min(k, 1.0);
  } else if (id == 7) {
    // jars: sandy clay, a little damp near the rim, the water dark inside
    alb = vec3(0.52, 0.38, 0.27) * (0.8 + 0.3 * fbm(p * 18.0, 3)) * (0.9 + 0.1 * sin(p.y * 160.0));
    rough = 0.65; spec = 0.05;
  } else if (id == 8) {
    // bread: a crust baked unevenly, dark where it rose, flour dusted in the score, cracked
    float n2 = fbm(p * 40.0, 5);
    float blist = vnoise(p * 260.0);
    alb = mix(vec3(0.3, 0.14, 0.05), vec3(0.66, 0.44, 0.2), smoothstep(0.3, 0.75, n2)) * (0.85 + 0.25 * blist);
    float flour = smoothstep(0.55, 0.8, fbm(p * 90.0 + 3.0, 3));
    alb = mix(alb, vec3(0.75, 0.7, 0.6), flour * 0.35);
    vec3 e3 = vec3(0.002, 0.0, 0.0);
    n = normalize(n - vec3(fbm((p + e3.xyy) * 40.0, 5) - n2, fbm((p + e3.yxy) * 40.0, 5) - n2, fbm((p + e3.yyx) * 40.0, 5) - n2) * 6.0);
    rough = 0.7; spec = 0.03; wrap = 0.15;
  } else if (id == 9) {
    alb = vec3(0.5, 0.33, 0.16) * (0.6 + 0.3 * fbm(p * 40.0, 3)); rough = 0.38; spec = 0.9;   // bronze
  } else if (id == 10) {
    if (dot(n, rd) > 0.0) n = -n;
    n = normalize(n * vec3(0.5, 0.5, 1.0) + vec3(0.0, 0.0, 0.3));
    alb = vec3(0.52, 0.45, 0.36) * (0.88 + 0.12 * vnoise(vec2(p.x * 700.0, p.y * 90.0))) * (0.9 + 0.1 * vnoise(vec2(p.x * 80.0, p.y * 600.0))); rough = 0.9; wrap = 0.1;
  } else if (id == 12) {
    alb = vec3(0.32, 0.18, 0.12); rough = 0.5; spec = 0.03; wrap = 0.5;   // a hand, dark against the light
  } else if (id == 13) {
    alb = vec3(0.13, 0.11, 0.1) * (0.8 + 0.3 * fbm(p * 80.0, 3)); rough = 0.95; wrap = 0.3;   // a wool sleeve
  } else if (id == 11) {
    alb = sub == 1 ? vec3(0.62, 0.62, 0.6) : vec3(0.7, 0.48, 0.25); rough = 0.28; spec = 0.25; wrap = 0.3;
    alb *= 0.7 + 0.3 * fbm(p.xz * 900.0, 2);
  }
#ifdef DOOR_LEAF
  // while the door is shut, lamplight leaks through the gaps round it: under the door onto the
  // threshold, and thin lines along the plank seams and the jamb
  if (uDoor < 0.4 && uLampI > 0.0) {
    float shut = 1.0 - smoothstep(0.0, 0.4, abs(uDoor));
    float fl = flameLightI(uLampI, uLampSeed) * 3.0;
    if ((id == 1 || id == 14) && n.y > 0.5) emit += FLAME_COL * fl * shut * 0.25 * exp(-max(p.z - 3.12, 0.0) / 0.035) * step(abs(p.x), 0.5) * step(p.y, 0.06) * step(-0.05, p.y);
    if (id == 4 && p.z > 3.0 && abs(p.x) < 0.52 && p.y < 2.02) {
      float seam = 1.0 - smoothstep(0.0, 0.006, min(fract(p.y / 0.13), 1.0 - fract(p.y / 0.13)) * 0.13);
      float edge = 1.0 - smoothstep(0.0, 0.012, min(min(0.5 - abs(p.x), p.y), 2.0 - p.y));
      emit += FLAME_COL * fl * shut * 0.12 * (seam * 0.5 + edge) * (0.6 + 0.4 * vnoise(p.xy * 30.0));
    }
  }
#endif
  float metalAlb = spec > 0.5 ? 1.0 : 0.0;
  vec3 diff = alb * (1.0 - metalAlb);
  vec3 sp = spec > 0.5 ? alb : vec3(spec);
  float ao = calcAO(p, n, inside ? 0.25 : 0.4);
  if (id == 10) ao = 0.9;
  vec3 col = emit;
  // the main lamp
  if (uLampI > 0.0) {
    vec3 root = lampRoot();
    vec3 L = flameLightPos(root, min(uLampI, 1.3), uLampSeed);
    float I = flameLightI(uLampI, uLampSeed) * 0.85 * uLampPow;
    // light shape jitter (a small, moving flame), for soft weave and door edges
    vec3 j = (vec3(hash12(gl_FragCoord.xy + uJitter * 97.0), hash12(gl_FragCoord.yx + uJitter * 53.0), hash12(gl_FragCoord.xy * 1.7 + uJitter * 19.0)) - 0.5) * vec3(0.012, 0.03, 0.012);
    vec3 Lj = L + j;
    float vis = lampVis(p, Lj);
    if (vis > 0.002 && dot(n, Lj - p) > -0.05) vis *= softShadow(p + n * 0.003, Lj, 0.012);
    vec3 dl = pointLight(p, n, v, diff, rough, 0.0, Lj, I, vis, wrap);
    float d = length(L - p);
    col += dl + FLAME_COL * I * vis / (d * d + 0.06) * sat(dot(n, normalize(Lj - p))) * sp * ggx(n, v, normalize(Lj - p), rough);
    // a breath of bounce: the room giving back the lamp's light
    float bo = (inside ? 1.0 : 0.25 * smoothstep(4.5, 3.2, p.z) * smoothstep(1.6, 0.6, abs(p.x))) / uLampPow;
    col += FLAME_COL * I * diff * ao * uBounce * bo * 0.3 / (0.6 + 0.12 * d * d) * (0.7 + 0.3 * n.y);
    // the cloth glows where the lamp shines through it
    if (id == 10) {
      // light through the linen from behind: brightest straight in front of the flame, falling off
      // softly, and only where the niche (not the wall) is behind the cloth
      vec2 dq = p.xy - L.xy;
      float niche = smoothstep(0.03, -0.03, max(abs(p.x - 1.2) - 0.2, p.y - 1.5 - 0.2 * sqrt(sat(1.0 - pow((p.x - 1.2) / 0.21, 2.0))))) * smoothstep(1.08, 1.12, p.y);
      float tr = niche * (0.25 + exp(-length(dq * vec2(1.4, 0.9)) / 0.09));
      col += FLAME_COL * I * alb * 0.14 * tr / (dot(L - p, L - p) + 0.01);
    }
  }
#ifdef NEIGHBOR
  if (uNLamp > 0.0) {
    vec3 L = flameLightPos(vec3(1.751, 0.35, 8.75), max(uNLamp, 0.01), 7.7);
    float I = flameLightI(uNLamp, 7.7) * 0.8 * uNPow;
    float vis = softShadow(p + n * 0.003, L, 0.02);
    col += pointLight(p, n, v, diff, rough, spec, L, I, vis, 0.0);
    col += FLAME_COL * I * diff * ao * 0.05 / (0.4 + 0.2 * dot(L - p, L - p)) * (p.z > 7.7 ? 1.0 : 0.15);
  }
#endif
#ifdef LANE
  for (int i = 0; i < NLANE; i++) {
    float k = sat((uTime - uIgn[i]) * 3.0); k = k * (1.0 + 0.6 * exp(-(uTime - uIgn[i]) * 5.0) * step(uIgn[i], uTime));
    if (k <= 0.001) continue;
    vec3 root = fromLampLocal(LAMP_WICK, LANEL[i].xyz, LANEL[i].w);
    vec3 L = flameLightPos(root, k, float(i) * 3.1);
    float vis = 1.0;
    // the lamp sits on the step in front of its own wall: no light behind that wall
    vis *= step(0.0, (p.z - 5.35) * (L.z - 5.35)) + step((p.z - 5.35) * (L.z - 5.35), 0.0) * step(abs(p.z - 5.35), 2.3);
#ifdef GHOSTS
    vis *= ghostShadow(p + n * 0.005, L);
#endif
    float d = length(L - p);
    if (d < 0.18) vis *= softShadow(p + n * 0.003, L, 0.025);
    col += pointLight(p, n, v, diff, rough, spec, L, flameLightI(k, float(i) * 3.1) * 0.7 * uLanePow, vis, wrap);
  }
  if (uCarryK > 0.0) {
    vec3 root = fromLampLocal(LAMP_WICK, uCarry, 0.0);
    vec3 L = flameLightPos(root, uCarryK, 17.0);
    float vis = 1.0;
#ifdef GHOSTS
    vis *= ghostShadow(p + n * 0.005, L);
#endif
    if (length(L - p) < 0.18) vis *= softShadow(p + n * 0.003, L, 0.01);
    col += pointLight(p, n, v, diff, rough, spec, L, flameLightI(uCarryK, 17.0) * 0.7 * uLanePow, vis, wrap);
  }
#endif
  // the cold light of the sky through the high window, spread over the room (an area light, unshadowed)
  if (uWin > 0.0 && inside) {
    // (the sky light of the doorway and the high window, as one soft source high toward the front)
    vec3 W = vec3(-0.8, 2.4, 1.8);
    vec3 l = W - p; float d2 = dot(l, l); l *= inversesqrt(d2);
    col += vec3(0.3, 0.38, 0.6) * uWin * diff * (0.3 + 0.7 * sat(dot(n, l))) * ao * 1.2 / (1.0 + 0.3 * d2);
  }
  // moon and sky
  {
    vec3 m = toMoon();
    vec3 mc = moonCol();
    float mo = 0.0;
    if (dot(mc, vec3(1.0)) > 0.001 && dot(n, m) > 0.0) mo = softShadow(p + n * 0.004, p + m * 12.0, 0.6);
    col += mc * mo * sat(dot(n, m)) * diff / PI * 3.0;
    float open = inside ? 0.04 + 0.3 * sat(uSky) * (1.0 - 0.5 * sat(uSky - 1.0)) : 1.0;
    // the lane is a narrow canyon: walls see less sky low down
    if (!inside && p.z > 2.0) open *= mix(0.45, 1.0, sat((p.y + 0.5) / 3.6)) * (n.y > 0.5 ? 0.8 : 1.0);
    col += skyIrr(n) * diff * mix(1.0, ao, 0.55) * open * uAmb;
  }
  return col;
}

// ---------------- the frame ----------------
vec3 house(vec2 fc) {
  vec3 ro; vec3 rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  vec3 rd = normalize(fp - ro);

  int id;
  float t = march(ro, rd, 60.0, id);
  int sub = gSub;
  vec3 col;
  float depth = t > 0.0 ? t : 60.0;
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    int id2; map(p, id2); sub = gSub;
    vec3 n = calcNormal(p, t);
    col = shadeSurf(p, n, rd, id, sub, t);
  } else {
    col = skyCol(rd);
  }
  // morning air down the lane: distance turns to the colour of the sky low in the east
  if (uFog > 0.0) col = mix(col, skyCol(normalize(vec3(rd.x, 0.02, rd.z))) * 0.3, (1.0 - exp(-max(depth - 3.0, 0.0) * uFog)));

  // ---- haze: the lamp's light in the air, shafts through apertures, moonlight through the window
  vec3 root = lampRoot();
  vec3 L = flameLightPos(root, min(uLampI, 1.3), uLampSeed);
  float I = flameLightI(uLampI, uLampSeed) * uLampPow;
  {
    float tm = min(depth, 16.0);
    const int NS = 30;
    float dt = tm / float(NS);
    float tt = dt * hash12(gl_FragCoord.xy * 0.73 + uJitter * 211.0);
    vec3 acc = vec3(0);
    for (int i = 0; i < NS; i++) {
      vec3 x = ro + rd * tt;
      if (uLampI > 0.0) {
        vec3 l = L - x; float d2 = dot(l, l);
        float vis = hazeVis(x, L);
        float ph = 0.6 + 0.8 * pow(sat(dot(rd, l * inversesqrt(d2))), 4.0);
        bool inR = x.z < 2.6 && abs(x.x) < 2.8;
        acc += FLAME_COL * I * vis * ph / (d2 + 0.03) * (inR ? 0.004 : 0.008) * dt;
      }
#ifdef WINDOW
      acc += vec3(0.45, 0.55, 0.85) * windowVis(x) * 0.02 * dt * (1.0 + uSky);
#endif
      tt += dt;
    }
    col += acc * uHaze;
  }
  // analytic glow close round the flame (where the samples are too coarse)
  if (uLampI > 0.0) {
    vec3 oc = L - ro; float tc = dot(oc, rd); float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-7));
    float g = (atan((min(depth, 20.0) - tc) / h) + atan(tc / h)) / h;
    float vis = hazeVis(ro + rd * clamp(tc, 0.0, depth), L);
    col += FLAME_COL * I * g * 0.00005 * uHaze * vis;
  }

  // ---- the basket over the lamp: two plaited layers, lit from within
#ifdef BASKET
  {
    vec2 bh = basketHit(ro, rd);
    for (int k = 1; k >= 0; k--) {
      float s = k == 0 ? bh.x : bh.y;
      if (s <= 0.0 || s >= depth) continue;
      vec3 bp = ro + rd * s;
      vec3 h = bLocal(bp);
      if (h.y < 0.0) continue;
      float shd; float cov = weave(h, shd);
      vec3 nl = normalize(h / (BR * BR));
      vec3 nw = nl; nw.xy = rot(uBasketTilt) * nw.xy;
      vec3 l = L - bp; float d2 = dot(l, l); l *= inversesqrt(d2);
      vec3 alb = vec3(0.36, 0.25, 0.13) * shd * (0.8 + 0.3 * fbm(h * 160.0, 2));
      // which side of the shell the lamp is on, and which side we see
      bool lampIn = dot(bLocal(L), bLocal(L) / (BR * BR)) < 1.0;
      float facing = dot(nw, -rd);   // > 0: we see the outside
      vec3 E = FLAME_COL * I / (d2 + 0.03);
      vec3 c;
      float nlit = abs(dot(nw, l));
      if ((facing > 0.0) == !lampIn) c = E * nlit * alb / PI;            // the lit face
      else c = E * (0.4 + 0.6 * nlit) * alb / PI * 0.012 * vec3(1.0, 0.8, 0.55);       // light through the straw
      c += skyIrr(nw) * alb * 0.6 + FLAME_COL * I * alb * 0.03 * uBounce;
      // the room's own dim light on the outside of the basket: cool from the doorway, warm from the embers
      c += 4.0 * alb * (vec3(0.05, 0.06, 0.09) * (0.3 + 0.7 * sat(dot(nw, normalize(vec3(-0.7, 0.5, 0.6))))) + vec3(0.09, 0.045, 0.015) * sat(dot(nw, normalize(vec3(0.8, 0.4, 0.6)))));
      col = mix(col, c, cov);
    }
  }
#endif

  // ---- flames and their halos
  if (uLampI > 0.0) {
    float hv = 1.0;
#ifdef BASKET
    { vec2 bh = basketHit(ro, rd); if (bh.x > 0.0 && bh.x < depth) { vec3 h = bLocal(ro + rd * bh.x); float s; if (h.y >= 0.0) hv = 1.0 - weave(h, s); } }
#endif
    col += flameRay(ro, rd, root, min(uLampI, 1.3), uLampSeed, depth) * hv;
    col += flameHalo(ro, rd, root, uLampI, uLampSeed, depth) * hv * uHaze;
  }
#ifdef NEIGHBOR
  if (uNLamp > 0.0) {
    vec3 nr = vec3(1.751, 0.35, 8.75);
    col += flameRay(ro, rd, nr, uNLamp, 7.7, depth);
    col += flameHalo(ro, rd, nr, uNLamp, 7.7, depth) * 2.5;
    // its light in the air of their room and out of their door
    vec3 oc = nr - ro; float tc = dot(oc, rd); float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-7));
    float g = (atan((min(depth, 20.0) - tc) / h) + atan(tc / h)) / h;
    col += FLAME_COL * uNLamp * g * 0.00012;
  }
#endif
#ifdef LANE
  for (int i = 0; i < NLANE; i++) {
    float k = sat((uTime - uIgn[i]) * 3.0);
    float fl = exp(-(uTime - uIgn[i]) * 5.0) * step(uIgn[i], uTime);
    if (k <= 0.001) continue;
    vec3 rt = fromLampLocal(LAMP_WICK, LANEL[i].xyz, LANEL[i].w);
    col += flameRay(ro, rd, rt, k * (1.0 + 0.5 * fl), float(i) * 3.1, depth);
    col += flameHalo(ro, rd, rt, k * (1.0 + 1.5 * fl), float(i) * 3.1, depth);
    // seen from afar, each lamp is a warm point with a soft round glow
    {
      vec3 c = flameLightPos(rt, max(k, 0.01), float(i) * 3.1);
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if (tc > 0.0 && tc < depth + 0.05) {
        float ang = sqrt(max(dot(oc, oc) - tc * tc, 0.0)) / tc;
        float far = smoothstep(1.5, 5.0, tc);
        col += vec3(1.0, 0.6, 0.28) * k * (1.0 + 2.0 * fl) * far * (2.5 * exp(-ang / 0.0022) + 0.3 * exp(-ang / 0.01));
      }
    }
    vec3 Lp = flameLightPos(rt, k, float(i) * 3.1);
    vec3 oc = Lp - ro; float tc = dot(oc, rd); float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-7));
    float g = (atan((min(depth, 40.0) - tc) / h) + atan(tc / h)) / h;
    col += FLAME_COL * k * g * 0.00003 * uHaze;
  }
  if (uCarryK > 0.0) {
    vec3 rt = fromLampLocal(LAMP_WICK, uCarry, 0.0);
    col += flameRay(ro, rd, rt, uCarryK, 17.0, depth);
    col += flameHalo(ro, rd, rt, uCarryK, 17.0, depth);
    {
      vec3 c = flameLightPos(rt, uCarryK, 17.0);
      vec3 oc = c - ro; float tc = dot(oc, rd);
      if (tc > 0.0 && tc < depth + 0.05) {
        float ang = sqrt(max(dot(oc, oc) - tc * tc, 0.0)) / tc;
        col += vec3(1.0, 0.6, 0.28) * uCarryK * smoothstep(1.5, 5.0, tc) * (2.5 * exp(-ang / 0.0022) + 0.3 * exp(-ang / 0.01));
      }
    }
    vec3 Lp = flameLightPos(rt, uCarryK, 17.0);
    vec3 oc = Lp - ro; float tc = dot(oc, rd); float h = sqrt(max(dot(oc, oc) - tc * tc, 1e-7));
    float g = (atan((min(depth, 40.0) - tc) / h) + atan(tc / h)) / h;
    col += FLAME_COL * uCarryK * g * 0.00003 * uHaze;
  }
#endif
  // far small lights (embers, lamps in other rooms) as soft, gently defocused discs
  for (int i = 0; i < 8; i++) {
    float I = uBok[i * 4 + 3];
    if (I <= 0.0) continue;
    vec3 bp = vec3(uBok[i * 4], uBok[i * 4 + 1], uBok[i * 4 + 2]);
    vec3 dv = bp - uCamPos; float dd = length(dv);
    if (depth < dd - 0.15 && t > 0.0) continue;
    float ang = acos(clamp(dot(rd0, dv / dd), -1.0, 1.0));
    float coc = max(0.009, uAper * abs(dd - uFocus) / (dd * uFocus));
    float disc = smoothstep(coc, coc * 0.7, ang) * (0.75 + 0.25 * smoothstep(coc * 0.3, coc * 0.95, ang));
    float flick = 0.85 + 0.15 * vnoise(vec2(uTime * 3.0, float(i) * 7.0));
    col += vec3(1.0, 0.5, 0.18) * I * flick * disc * 0.000035 / (coc * coc);
  }
  return col * uExpo;
}
`;
