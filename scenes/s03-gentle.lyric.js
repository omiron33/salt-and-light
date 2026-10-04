// The words of s03-gentle: the first line small and low on the left, close to the earth like the
// seedling; the second line high in the night sky as the field opens, "earth" in its own voice.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  if (a) setLine(ctx, a, t, { x: 300, y: 1760, px: 150, align: 'left', alpha: outFade(t, b.start - 0.3, b.start + 0.05) });
  if (b) setLine(ctx, b, t, { x: 300, y: 560, px: 180, align: 'left', alpha: outFade(t, P.to - 0.3, P.to - 0.03) });
});
