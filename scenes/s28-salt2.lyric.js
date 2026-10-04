// The words of s28-salt2: high in the dark blue sky on the left, above the cold band of dawn.
// "You are the" quietly, then SALT and EARTH in their tall capitals on the row beneath.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const i = l.words.findIndex((w) => /^salt/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 300, y: 330, px: 140, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 300, y: 600, px: 230, align: 'left', alpha: a });
});
