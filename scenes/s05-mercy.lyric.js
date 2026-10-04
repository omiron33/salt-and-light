// The words of s05-mercy: one line high in the dark above the lamp, "Mercy" leading in rose italic and
// "merciful" answering at the end as the flame rises beneath it. Set as two rows, stepped: the first
// two words to the left, the rest under them a little to the right, so the line leans toward the lamp.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  setLine(ctx, l.words.slice(0, 3), t, { x: 330, y: 430, px: 210, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(3), t, { x: 900, y: 690, px: 210, align: 'left', alpha: a });
});
