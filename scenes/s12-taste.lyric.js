// The words of s12-taste: in the dark sky to the right, away from the moon. The warning runs small
// and quiet on one row; TASTE stands under it, tall in the cold salt white, as the line closes.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const i = l.words.findIndex((w) => /^taste/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 3560, y: 330, px: 150, align: 'right', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 3560, y: 640, px: 300, align: 'right', alpha: a });
});
