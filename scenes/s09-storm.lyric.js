// The words of s09-storm: one line in two rows, low on the right over the dark slope, away from the
// lamp and the flashes; "because of Me" stepping in under it.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const i = L.words.findIndex((w) => /^because/i.test(w.w));
  const a = outFade(t, P.to - 0.35, P.to - 0.05);
  setLine(ctx, L.words.slice(0, i), t, { x: 3600, y: 1560, px: 160, align: 'right', alpha: a });
  setLine(ctx, L.words.slice(i), t, { x: 3600, y: 1800, px: 160, align: 'right', alpha: a });
});
