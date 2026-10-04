// s12's world: a salt pan on the shore of the Dead Sea at night under the moon. The crust is a
// pavement of polygons (desiccation plates whose rims have pushed up into low ridges), running away
// to the still black water, with the dark hills of Moab beyond. The moon stands low on the right;
// toward it the crust glitters (each tiny crystal facet that mirrors the moon flashes; stable per
// facet, so the sparks walk as the camera glides), and its path lies on the water. In the foreground
// one patch of salt has gone dull and grey: no glints, a dead flat crust. Metres; crust at y = 0.
export const PAN_UNIFORMS = { uDull: 1.0 };

export const PAN_GLSL = /* glsl */ `
uniform float uDull;
const vec3 MOON = normalize(vec3(0.42, 0.2, 1.0));
const vec3 MOONC = vec3(0.75, 0.82, 1.0);
const float SHORE = 70.0;
const vec2 DULLC = vec2(1.9, 5.2);         // the dull patch, in the foreground of the moon's glitter

float shoreZ(float x) { return SHORE + 6.0 * sin(x * 0.05 + 1.0) + 3.0 * sin(x * 0.13); }
float dullK(vec2 q) {
  vec2 d = (q - DULLC) * vec2(0.8, 1.0);
  float r = length(d) + 1.0 * (fbm(q * 0.7, 3) - 0.5);
  return smoothstep(1.9, 1.4, r) * uDull;
}
// crust height: polygon plates with raised rims, a little uneven; sinks into the water at the shore
vec3 plates(vec2 q) { vec2 v = voronoiEdge(q * 0.75); return vec3(v, 0.0); }
float crustH(vec2 q, float lod) {
  vec2 v = voronoiEdge(q * 0.75);
  float lumpy = 0.55 + 0.9 * vnoise(q * 5.0);
  float rim = exp(-v.x / (0.05 + 0.05 * vnoise(q * 2.0))) * (0.05 + 0.05 * hash11(v.y * 13.0)) * lumpy;
  float h = rim + 0.014 * (vnoise(q * 3.0) - 0.5);
  if (lod < 1.0) h += 0.006 * (vnoise(q * 14.0) - 0.5) + 0.003 * (vnoise(q * 40.0) - 0.5);
  // the dull patch is flatter, old and slumped
  h *= 1.0 - 0.6 * dullK(q);
  h -= smoothstep(shoreZ(q.x) - 4.0, shoreZ(q.x) + 2.0, q.y) * 0.25;
  return h;
}
float marchPan(vec3 ro, vec3 rd) {
  if (rd.y >= 0.0) return -1.0;
  float t = max(0.0, (ro.y - 0.12) / -rd.y);
  float tmax = min(800.0, (ro.y + 0.4) / -rd.y);
  float lt = t;
  for (int i = 0; i < 120; i++) {
    vec3 p = ro + rd * t;
    float lod = t > 15.0 ? 1.0 : 0.0;
    // far off the rims are below a pixel: finish on the mean crust plane
    if (t > 70.0) return max(t, (ro.y - 0.03) / -rd.y);
    float h = crustH(p.xz, lod);
    if (p.y < h) {
      float a = lt, b = t;
      for (int k = 0; k < 6; k++) { float m = 0.5 * (a + b); vec3 q = ro + rd * m; if (q.y < crustH(q.xz, lod)) b = m; else a = m; }
      return b;
    }
    lt = t;
    t += max(0.01, (p.y - h) * 0.6) * (1.0 + t * 0.02);
    if (t > tmax) break;
  }
  return -1.0;
}

vec3 skyPan(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(vec3(0.03, 0.04, 0.07), vec3(0.006, 0.009, 0.022), pow(y, 0.5));
  float m = dot(d, MOON);
  // the moon, its halo in the haze over the sea
  c += MOONC * (smoothstep(0.99993, 0.99996, m) * 12.0 + pow(sat(m), 300.0) * 0.4 + pow(sat(m), 12.0) * 0.06);
  // stars, fewer near the moon and the horizon
  vec2 sp = vec2(atan(d.x, d.z), d.y) * 300.0;
  vec2 id = floor(sp);
  float st = step(0.996, hash12(id)) * smoothstep(0.02, 0.2, y) * (1.0 - pow(sat(m), 6.0));
  float tw = 0.6 + 0.4 * sin(uTime * 3.0 + hash12(id + 3.0) * 30.0);
  c += vec3(0.8, 0.85, 1.0) * st * tw * smoothstep(0.4, 0.0, length(fract(sp) - 0.5)) * 1.2;
  return c;
}
// the hills of Moab across the water
float moabH(vec3 d) { float az = atan(d.x, d.z); return 0.035 + 0.025 * fbm(vec2(az * 4.0, 1.0), 4) + 0.01 * sin(az * 2.0); }
vec3 farPan(vec3 d) {
  float hh = moabH(d);
  if (d.y > hh) return skyPan(d);
  // near-black ridges, a faint moonlit edge
  return vec3(0.006, 0.008, 0.014) + MOONC * 0.02 * smoothstep(hh - 0.004, hh, d.y);
}

// the crust's glitter: facets at a size that shrinks to the pixel with distance; a facet whose normal
// sits on the half vector to the moon flashes
float glitter(vec3 p, vec3 rd, vec3 n, float t) {
  float scale = 40.0;
  vec2 q = p.xz * scale;
  vec2 id = floor(q);
  vec3 h = hash33(vec3(id, 7.0));
  vec3 fnrm = normalize(n + vec3(h.x - 0.5, 0.0, h.y - 0.5) * 0.7);
  vec3 hv = normalize(MOON - rd);
  float g = pow(sat(dot(fnrm, hv)), 1000.0);
  float spot = smoothstep(0.45, 0.2, length(fract(q) - 0.25 - 0.5 * h.yz));
  return g * spot * step(0.4, h.z) * 380.0 * smoothstep(40.0, 8.0, t);
}

vec3 shadePan(vec3 p, vec3 rd, float t) {
  float lod = t > 15.0 ? 1.0 : 0.0;
  vec2 e = vec2(0.004 + t * 0.002, 0.0);
  vec3 n = normalize(vec3(crustH(p.xz - e.xy, lod) - crustH(p.xz + e.xy, lod), 2.0 * e.x, crustH(p.xz - e.yx, lod) - crustH(p.xz + e.yx, lod)));
  vec2 v = voronoiEdge(p.xz * 0.75);
  float dk = dullK(p.xz);
  // white crust, creamier in the plates' hearts, the rims bright and broken; the dull patch grey
  vec3 alb = mix(vec3(0.7, 0.71, 0.7), vec3(0.85, 0.86, 0.86), exp(-v.x / 0.1));
  alb *= 0.85 + 0.2 * vnoise(p.xz * 6.0) + 0.1 * (hash11(v.y * 7.0) - 0.5);
  alb = mix(alb, vec3(0.25, 0.24, 0.22) * (0.8 + 0.4 * fbm(p.xz * 4.0, 3)), dk);
  // wet, darker crust toward the water's edge
  float wet = smoothstep(shoreZ(p.x) - 10.0, shoreZ(p.x) - 1.0, p.z);
  alb *= 1.0 - 0.6 * wet;
  float ml = sat(dot(n, MOON));
  vec3 col = alb * MOONC * 0.55 * (ml * 0.9 + 0.22);
  col += alb * vec3(0.02, 0.025, 0.045) * (0.5 + 0.5 * n.y);   // sky fill
  // sheen toward the moon (a broad forward glow of the crystal crust)
  vec3 hv = normalize(MOON - rd);
  col += MOONC * 0.06 * pow(sat(dot(n, hv)), 30.0) * (1.0 - dk) * (1.0 + wet * 3.0);
  col += alb * MOONC * 0.08 * pow(sat(dot(n, hv)), 4.0) * dk;
  // glitter, only on the living crust
  col += MOONC * glitter(p, rd, n, t) * (1.0 - dk) * (1.0 - wet * 0.7) * smoothstep(0.0, 0.3, ml);
  return col;
}

vec3 waterPan(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  vec2 g = vec2(vnoise(p.xz * vec2(0.08, 0.3) + vec2(uTime * 0.05, 0.0)), vnoise(p.xz * vec2(0.12, 0.4) - vec2(0.0, uTime * 0.07) + 9.0)) - 0.5;
  float amp = 0.02 / (1.0 + t * 0.004);
  vec3 n = normalize(vec3(g.x * amp, 1.0, g.y * amp * 2.0));
  vec3 r = reflect(rd, n);
  float fr = 0.02 + 0.98 * pow(1.0 - sat(-rd.y), 5.0);
  vec3 refl = r.y > moabH(r) ? skyPan(r) : farPan(r);
  // the moon path: a broad shimmering column
  refl += MOONC * pow(sat(dot(r, MOON)), 60.0) * 0.8 * (0.6 + 0.8 * vnoise(p.xz * vec2(0.5, 2.0) + uTime * 0.3));
  return refl * fr + vec3(0.002, 0.003, 0.006);
}

vec3 pan(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  vec3 col;
  float t = marchPan(ro, rd);
  // water plane
  float tw = rd.y < 0.0 ? (ro.y + 0.05) / -rd.y : -1.0;
  bool water = false;
  if (tw > 0.0) { vec3 pw = ro + rd * tw; water = pw.z > shoreZ(pw.x) && (t < 0.0 || tw < t); }
  float depth;
  if (water) { col = waterPan(ro, rd, tw); depth = tw; }
  else if (t > 0.0) { col = shadePan(ro + rd * t, rd, t); depth = t; }
  else { col = farPan(rd); depth = 1e4; }
  // haze over the sea, lit by the moon
  float fog = 1.0 - exp(-depth * 0.004);
  vec3 hz = vec3(0.025, 0.032, 0.05) + MOONC * 0.05 * pow(sat(dot(rd, MOON)), 6.0);
  col = mix(col, hz, fog * 0.8);
  return col;
}
`;
