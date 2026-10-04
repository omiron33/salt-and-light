// The shared camera and timing of s45-fires and s46-love: one slow drift along the near shore past
// the near fire, the far fire held across the water. k runs 0..1 over both scenes.
import { drift, clamp01, ease, keys } from '/song/lib/look.js';
import { FIRE_A, FIRE_B, PATH_A, PATH_B, BOAT_YAW } from '/song/lib/x-galilee-fires.js';
import { lanternPos, boatBob } from '/song/lib/x-galilee-boat.js';

export const S45 = [256.6, 260.727], S46END = 264.22;
export const firesK = (t) => clamp01((t - S45[0]) / (S46END - S45[0]));
export function firesCam(t) {
  const k = firesK(t), e = ease.inOut3(k);
  const d = drift(t, 0.006);
  const pos = [1.45 - 0.9 * e + d[0], 0.95 + 0.08 * e + d[1], 9.4 - 0.5 * e];
  const target = [-26.0 + 3.0 * e, 1.2, -60.0];
  return { pos, target, fov: 40 };
}
// the boat: drawn up at the near shore beside the fire from the first frame of s45, lantern lit,
// rocking on the water; it pushes off just after "But" and touches the far shore on "enemies"
export const PUSH = 260.95, LAND = 263.44;
export function boatAt(t) {
  const x = clamp01((t - PUSH) / (LAND - PUSH));
  const e = x < 1 ? ease.inOut3(x) : 1;
  const pos = [PATH_A[0] + (PATH_B[0] - PATH_A[0]) * e, -0.08, PATH_A[2] + (PATH_B[2] - PATH_A[2]) * e];
  return { k: e, pos, lant: lanternPos(t, pos, BOAT_YAW) };
}
export function firesUpdate(t, u, flick) {
  const c = firesCam(t);
  const b = boatAt(t);
  u.uBoatK.value = b.k;
  u.uBPos.value.set(...b.pos);
  u.uBob.value = boatBob(t) - 0.03;
  u.uRoll.value = 0.02 * Math.sin(t * 0.8);
  u.uLant.value.set(...b.lant);
  const I = 4.0 * flick(t);
  u.uLantCol.value.set(1.0 * I, 0.58 * I, 0.26 * I);
  // on "enemies" both fires brighten and the trail joins the shores
  const j = ease.out3(clamp01((t - LAND + 0.1) / 0.8));
  u.uJoin.value = j;
  u.uFAk.value = 1.0 + 0.45 * j;
  u.uFBk.value = 1.0 + 0.9 * j;
  u.uL1Pos.value.set(FIRE_A[0], 0.4, FIRE_A[2]);
  const a = 0.55 * u.uFAk.value;
  u.uL1Col.value.set(1.0 * a, 0.5 * a, 0.18 * a);
  // focus: the near fire, easing out to the water and the far shore as the boat crosses
  const fN = Math.hypot(c.pos[0] - FIRE_A[0], c.pos[2] - FIRE_A[2]);
  const fF = Math.hypot(c.pos[0] - FIRE_B[0], c.pos[2] - FIRE_B[2]);
  const fk = ease.inOut3(clamp01((t - PUSH) / (LAND - PUSH)));
  u.uFocus.value = fN + (fF - fN) * fk;
}
