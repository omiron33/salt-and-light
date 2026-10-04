// The words of s32-lamp2: low on the left over the dark lower wall and floor, the niche and its
// light high on the right: "No one lights a lamp" / "to cover it", the second row indented.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0]; if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.04);
  const i = l.words.findIndex((w) => /^to$/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 280, y: 1560, px: 160, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 520, y: 1790, px: 160, align: 'left', alpha: a });
});
