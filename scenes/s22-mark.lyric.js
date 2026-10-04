// The words of s22-mark: two lines high on the left, over the dark beyond the page, the second
// stepped in under the first; the small mark below them on the right answers "small mark".
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const al = outFade(t, P.to - 0.3, P.to - 0.02);
  if (a && t >= a.start - 0.1) setLine(ctx, a, t, { x: 300, y: 250, px: 140, align: 'left', alpha: al });
  if (b && t >= b.start - 0.1) setLine(ctx, b, t, { x: 500, y: 420, px: 140, align: 'left', alpha: al });
});
