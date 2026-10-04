// The words of s02-mourn: both lines high on the left, over the dark doorway and wall, away from the
// lamp; the second line steps in under the first.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const a = outFade(t, P.to - 0.35, P.to - 0.05);
  setLine(ctx, lines[0], t, { x: 300, y: 520, px: 150, align: 'left', alpha: a });
  if (lines[1]) setLine(ctx, lines[1], t, { x: 400, y: 740, px: 150, align: 'left', alpha: a });
});
