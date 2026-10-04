// s21-fulfill: "I came to bring them to fulfillment". The same scroll, seen from the reader's place
// a little above the page: the letters fill with gold light from within, column after column, from
// the right as the writing reads, the last on "fulfillment"; then the whole page swells with it and
// the glow spreads off the parchment into the dark of the hall.
import { grade, ease, clamp01, drift, linesAt, wordIn } from '/song/lib/look.js';
import { SCROLL_GLSL, SCROLL_UNIFORMS, toW } from '/song/lib/x-scroll.js';
import { scrollTextures } from '/song/scenes/s20-law.js';

export const kind = 'shader';

export default async (P) => {
  const { sc, ink, detail } = await scrollTextures();
  const [line] = linesAt(P.from - 0.6, 'I came to bring');
  const full = wordIn(line, 'fulfillment').start;
  // columns fill right to left (index 0 is the reader's right), the fourth (the open page's last) on "fulfillment"
  const fills = [P.from + 0.02, wordIn(line, 'came').start, wordIn(line, 'bring').start, wordIn(line, 'them').start + 0.2, full - 0.05];
  const dur = P.to - P.from;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from + 0.3) / (dur + 0.6)));
    const d = drift(t, 0.002);
    const pos = toW([0.035 - 0.03 * p + d[0], 0.235 - 0.03 * p + d[1], -0.38 + 0.05 * p]);
    const target = toW([0.0 - 0.01 * p, 0.03, 0.12]);
    return { pos, target, fov: 40, focusPt: toW([0.0, 0.0, 0.0]) };
  };
  return {
    name: 's21-fulfill', from: P.from, to: P.to,
    frag: SCROLL_GLSL + 'vec3 shade(vec2 fc) { return scroll(fc); }',
    uniforms: { ...SCROLL_UNIFORMS, uInk: ink, uDetail: detail, uDetRect: sc.detRect, uAper: 0.004, uFill: fills },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(...c.focusPt.map((v, i) => v - c.pos[i]));
      // the whole page swells with light after the last column, and holds
      u.uGold.value = 0.25 * clamp01((t - fills[1]) / 1.5) + 0.75 * ease.out3(clamp01((t - full) / 1.2));
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.14, threshold: 1.0, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.004, 0.012], highlights: [1.0, 0.94, 0.82], amount: 0.35 } }; },
  };
};
