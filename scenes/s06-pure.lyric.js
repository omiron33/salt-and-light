// The words of s06: one line across the top left, in the dark starry sky above the far hills, away
// from the light that opens in the water and from its unseen source above the frame (to the right). "Pure" takes the rose italic, "God" the gold capitals
// and arrives last, as the light opens beneath it.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 280, y: 400, px: 170, align: 'left', alpha: outFade(t, P.to - 0.25, P.to) });
});
