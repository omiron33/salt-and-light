// The words of s04-thirst: the long first line across the dark sky at the top, the answer
// "Will be filled" low on the right, beside the cup, as it overflows.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  if (a) setLine(ctx, a, t, { x: 1920, y: 330, px: 150, align: 'center', alpha: outFade(t, b.start - 0.35, b.start + 0.05) });
  if (b) setLine(ctx, b, t, { x: 3560, y: 1820, px: 190, align: 'right', alpha: outFade(t, P.to - 0.3, P.to - 0.03) });
});
