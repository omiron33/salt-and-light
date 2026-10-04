// The words of s36-heart: set high on the right, over the dark stone away from the flame and its
// smoke (which climbs on the left). The first line in a quieter, smaller voice; the second, the
// teaching, larger below it, with "lust", "sin" (cold ash capitals) and "heart" carrying the weight.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const end = outFade(t, P.to - 0.45, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 3600, y: 470, px: 128, align: 'right', alpha: end * (t >= a.start - 0.1 ? 1 : 0) });
  if (b) setLine(ctx, b, t, { x: 3600, y: 720, px: 176, align: 'right', alpha: end * (t >= b.start - 0.1 ? 1 : 0) });
}, { shade: 0.5 });
