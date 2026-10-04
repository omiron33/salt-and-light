// The words of s25-altar: high on the left, in the dark of the court above the step, the line in two
// rows so "gift" sits near the gift and "altar" settles as the camera climbs to the fire.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.25, P.to - 0.02);
  setLine(ctx, w.slice(0, 5), t, { x: 300, y: 380, px: 175, align: 'left', alpha: a });
  setLine(ctx, w.slice(5), t, { x: 300, y: 610, px: 175, align: 'left', alpha: a });
}, { shade: 0.5 });
