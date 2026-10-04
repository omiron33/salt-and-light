// s49-rain words: "And rain on the just / and unjust". The first row low on the left under the two
// fields; the answer, "and unjust", set apart on the right, as the rain falls on both.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';

export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const w = L.words;
  const k = w.findIndex((x, i) => i > 0 && /^and$/i.test(x.w));
  setLine(ctx, w.slice(0, k), t, { x: 300, y: 1760, px: 180, align: 'left', alpha: a });
  setLine(ctx, w.slice(k), t, { x: 3540, y: 1960, px: 180, align: 'right', alpha: a });
}, { shade: 0.55 });
