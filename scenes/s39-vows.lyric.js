// The words of s39-vows: one line, high on the right in the dark beyond the window's shaft of
// light, answering the cut letters across the frame.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a] = lines;
  const end = outFade(t, P.to - 0.4, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 3600, y: 470, px: 165, align: 'right', alpha: end * (t >= a.start - 0.1 ? 1 : 0) });
}, { shade: 0.55 });
