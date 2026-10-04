// The words of s01-poor, in the dark to the left of the shaft: each line in two rows, the word that
// carries it ("Blessed", then "Heaven's kingdom") tall in gold above, the rest in bone Garamond below.
// The first line gives way as the second begins; the second clears by the end of the shot.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [l1, l2] = lines;
  const rows = (l, n, a) => {
    if (a <= 0 || t < l.start - 0.1) return;
    setLine(ctx, l.words.slice(0, n), t, { x: 300, y: 820, px: 205, align: 'left', alpha: a });
    setLine(ctx, l.words.slice(n), t, { x: 306, y: 1030, px: 150, align: 'left', alpha: a });
  };
  if (l1) rows(l1, 1, l2 ? outFade(t, l2.start - 0.3, l2.start - 0.02) : outFade(t, P.to - 0.3, P.to - 0.02));
  if (l2) rows(l2, 2, outFade(t, P.to - 0.35, P.to - 0.03));
});
