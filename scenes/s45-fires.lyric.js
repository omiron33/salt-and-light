// The words of s45: two lines high on the right, over the dark pre-dawn sky above the far shore and
// clear of both fires; "love" rose, "enemy" in cold ash capitals.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  const i = l.words.findIndex((w) => /^and/i.test(w.w));
  const a = outFade(t, P.to - 0.25, P.to);
  setLine(ctx, l.words.slice(0, i), t, { x: 3600, y: 360, px: 150, align: 'right', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 3600, y: 560, px: 150, align: 'right', alpha: a });
});
