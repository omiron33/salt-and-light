// The words of s42-cloak: high on the right over the cold blue of the sky away from the dawn, the
// first line small and plain; "Give your cloak as well" larger beneath it, set in as the red cloak
// comes down.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const out = outFade(t, P.to - 0.35, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 3600, y: 330, px: 140, align: 'right', alpha: out * (b ? outFade(t, b.start - 0.1, b.start + 0.6) * 0.45 + 0.55 : 1) });
  if (b) setLine(ctx, b, t, { x: 3600, y: 560, px: 200, align: 'right', alpha: out });
});
