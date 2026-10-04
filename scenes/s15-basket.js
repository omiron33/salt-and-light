// s15-basket: "No one lights a lamp to cover it".
// A dark stone house at night. On the table a clay lamp burns under an upturned plaited basket: the
// light leaks through the weave in glowing points, scattering a field of soft sparks over the walls,
// the arch and the beams. On "cover it" the basket is lifted away (up and out of frame, tilting), the
// points of light sweep up the walls and go, and the flame stands free and brightens; the room wakes.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { houseFrag, HOUSE_UNIFORMS } from '/song/lib/x-house.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'No one lights a lamp');
  const lamp = wordIn(L, 'lamp').start, cover = wordIn(L, 'cover').start;
  const LAMP = [0.25, 0.756, -0.02], YAW = 0.35;
  const lift0 = lamp + 0.35, lift1 = cover + 0.75;
  const liftK = (t) => ease.inOut3(clamp01((t - lift0) / (lift1 - lift0)));
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const k = liftK(t);
    const d = drift(t, 0.004);
    // close on the basket at table height; once the flame is free, a slow pull back and up
    const k2 = ease.inOut3(clamp01((t - lift0 - 0.2) / (P.to - lift0 + 0.3)));
    return {
      pos: [0.54 + 0.14 * k2 + d[0], 0.94 + 0.1 * k2 + d[1], -0.55 - 0.25 * k2 - 0.03 * p],
      target: [0.26 + 0.02 * k2, 0.84 + 0.04 * k, 0.1],
      fov: 36 + 4 * k2,
    };
  };
  return {
    name: 's15-basket', from: P.from, to: P.to,
    frag: houseFrag(['BASKET', 'WINDOW']),
    uniforms: { ...HOUSE_UNIFORMS, uLamp: LAMP, uLampYaw: YAW, uAper: 0.0035,
      // embers in the hearth by the door and a lamp in the far corner, behind the basket
      uBok: [-1.1, 1.4, 2.5, 0.6, -0.75, 1.15, 2.52, 0.45, -1.6, 0.95, 2.45, 0.7, 1.0, 1.25, 2.5, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    camera: cam,
    update(t, u) {
      const k = liftK(t);
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - LAMP[0] - 0.02, c.pos[1] - LAMP[1] - 0.06, c.pos[2] - LAMP[2]);
      // the basket rises and tips away toward the back-left as it is lifted out of frame
      u.uBasket.value.set(LAMP[0] + 0.02 - 0.25 * k, LAMP[1] + 0.85 * k * k + 0.05 * k, LAMP[2] - 0.2 * k);
      u.uBasketTilt.value = 0.55 * k;
      // the flame, freed, breathes up and brightens
      const free = ease.out3(clamp01((t - (lift0 + 0.3)) / 1.6));
      u.uLampI.value = 0.95 + 0.3 * free;
      u.uBounce.value = 0.6 + 0.4 * ease.inOut3(clamp01((t - lift0) / (lift1 - lift0 + 0.6)));
      const cov = 1 - ease.inOut3(clamp01((t - lift0) / (lift1 - lift0 + 0.4)));
      u.uHaze.value = 1.5 + 16.0 * cov; u.uMoon.value = 0.35;
      u.uExpo.value = 1.7 + 0.6 * cov;
    },
    post(t) { return grade(t, { grain: 0.012, ca: 0.05, exposure: 1.5, bloom: 0.09, threshold: 1.1, vignette: 0.5, saturation: 1.0 }); },
    finish(t) { return { flare: { amount: 0.012, threshold: 0.9, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.008, 0.025], highlights: [1.0, 0.93, 0.82], amount: 0.4 } }; },
  };
};
