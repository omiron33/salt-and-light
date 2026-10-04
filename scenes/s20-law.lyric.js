// The words of s20-law: the sentence in two lines, set in the dark of the hall between the lamp and
// the far edge of the page, the second line stepped in under the first (one thought, two breaths).
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const al = outFade(t, P.to - 0.3, P.to - 0.02);
  if (a && t >= a.start - 0.1) setLine(ctx, a, t, { x: 1920, y: 820, px: 150, align: 'center', alpha: al });
  if (b && t >= b.start - 0.1) setLine(ctx, b, t, { x: 1920, y: 1040, px: 150, align: 'center', alpha: al });
});
