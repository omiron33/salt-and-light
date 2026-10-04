// The words of s37-eye: low on the left, in the dark under the vine's arm, where the cut branch will
// fall away to the right of them. The warning line first; then "Tear it out and throw it away" set
// below it as the blade cuts. "sin" takes the cold ash capitals.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const end = outFade(t, P.to - 0.4, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 300, y: 1790, px: 130, align: 'left', alpha: end * (t >= a.start - 0.1 ? 1 : 0) });
  if (b) setLine(ctx, b, t, { x: 300, y: 1960, px: 130, align: 'left', italic: true, alpha: end * (t >= b.start - 0.1 ? 1 : 0) });
}, { shade: 0.5 });
