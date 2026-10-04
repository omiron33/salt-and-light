// The words of s50-reward: low over the dark stone and ground. The first line on the left beneath
// the lamp while the window is close; then the question alone on the right, over the dark slope
// below the dawn, held through its silence.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  if (a) {
    const i = a.words.findIndex((w) => /^those$/i.test(w.w));
    const aa = b ? outFade(t, b.start - 0.35, b.start - 0.05) : 1;
    setLine(ctx, a.words.slice(0, i), t, { x: 300, y: 1700, px: 150, align: 'left', alpha: aa });
    setLine(ctx, a.words.slice(i), t, { x: 300, y: 1900, px: 150, align: 'left', alpha: aa });
  }
  if (b) setLine(ctx, b, t, { x: 3580, y: 1900, px: 190, align: 'right', alpha: outFade(t, P.to - 0.5, P.to - 0.05), italic: true });
}, { shade: 0.55 });
