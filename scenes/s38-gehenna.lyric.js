// The words of s38-gehenna: high on the left, over the dark shadowed far wall of the ravine, away from
// the fires and the pale band in the sky. Set quietly and small (the warning is grave, not loud):
// the first line, then the second beneath it; "hell" takes the cold ash capitals.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const end = outFade(t, P.to - 0.4, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 280, y: 700, px: 138, align: 'left', alpha: end * (t >= a.start - 0.1 ? 1 : 0) });
  if (b) setLine(ctx, b, t, { x: 280, y: 920, px: 138, align: 'left', alpha: end * (t >= b.start - 0.1 ? 1 : 0) });
}, { shade: 0.55 });
