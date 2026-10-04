// s22-mark: "Not one small mark will fall away / Before all is accomplished". Extreme macro on one yod
// (the smallest letter, opening a word at the start of a line near the top of a column).
// Dust drifts down through the lamplight and settles on the skin round it, but nothing settles on the
// mark: it stays, glowing warmly from within. The lens creeps in and holds; the focus never leaves it.
import { grade, ease, clamp01, drift, linesAt, wordIn } from '/song/lib/look.js';
import { SCROLL_GLSL, SCROLL_UNIFORMS, toW } from '/song/lib/x-scroll.js';
import { scrollTextures } from '/song/scenes/s20-law.js';

export const kind = 'shader';

export default async (P) => {
  const { sc, ink, detail } = await scrollTextures();
  const [yx, yz] = sc.yodLocal;
  const Y = [yx, 0.0018, yz];
  const dur = P.to - P.from;
  const [line] = linesAt(P.from - 0.6, 'Not one small mark');
  const sung0 = wordIn(line, 'Not').start, sung1 = wordIn(line, 'mark').end;
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from + 0.3) / (dur + 0.3)));
    const d = drift(t, 0.00025);
    const dist = 0.026 - 0.005 * p;
    const el = 0.42 - 0.04 * p;                 // elevation above the page (radians)
    // from beside the line's start, so the rest of the word and the lines round it recede into blur
    const az = -0.62 + 0.08 * p;
    const off = [Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -Math.cos(az) * Math.cos(el) * dist];
    const pos = toW([Y[0] + off[0] + d[0], Y[1] + off[1] + d[1], Y[2] + off[2]]);
    // the mark sits right of centre and a little low, the page falling away beyond it
    const target = toW([Y[0] + 0.0085, Y[1], Y[2] + 0.0075]);
    return { pos, target, fov: 34 };
  };
  return {
    name: 's22-mark', from: P.from, to: P.to,
    frag: SCROLL_GLSL + 'vec3 shade(vec2 fc) { return scroll(fc); }',
    yodWord: sc.yodWord,
    uniforms: { ...SCROLL_UNIFORMS, uInk: ink, uDetail: detail, uDetRect: sc.detRect, uYod: Y, uMacro: 1, uLamp: 0.2, uKeyK: 0.012, uKeyPos: toW([Y[0] - 0.05, Y[1] + 0.013, Y[2] + 0.055]), uAper: 0.00008, uTexDof: 0.008 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      const yw = toW(Y);
      u.uFocus.value = Math.hypot(...yw.map((v, i) => v - c.pos[i]));
      u.uDust.value = clamp01((t - P.from + 1.0) / (dur + 1.0));
      // the glow wakes on "Not one small mark" and keeps growing a little as the dust falls past it
      u.uYodGlow.value = 0.3 + 0.4 * ease.inOut3(clamp01((t - sung0) / (sung1 - sung0))) + 0.3 * ease.inOut3(clamp01((t - sung1) / (P.to - sung1)));
    },
    post(t) { return grade(t, { exposure: 1.45, bloom: 0.12, threshold: 1.0, vignette: 0.55 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.004, 0.012], highlights: [1.0, 0.94, 0.84], amount: 0.35 } }; },
  };
};
