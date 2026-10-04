// The words of s18-glory: on the left of the rising sky, away from the gold light that opens on the
// right. "And give your" quietly above; FATHER and GLORY below in the gold capitals of the holy words,
// stepped to the right as the camera climbs.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.4, P.to - 0.05);
  setLine(ctx, w.slice(0, 3), t, { x: 300, y: 560, px: 150, align: 'left', alpha: a });
  setLine(ctx, w.slice(3), t, { x: 360, y: 860, px: 230, align: 'left', alpha: a });
}, { shade: 0.5 });
