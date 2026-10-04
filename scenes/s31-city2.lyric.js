// The words of s31-city2: low on the right over the dark slope of the hill below the town, clear of
// the pale sky, the sea and the lit houses; the line in two rows, right-aligned against the slope.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  setLine(ctx, w.slice(0, 5), t, { x: 3600, y: 1660, px: 165, align: 'right', alpha: a });
  setLine(ctx, w.slice(5), t, { x: 3600, y: 1900, px: 190, align: 'right', alpha: a });
}, { shade: 0.5 });
