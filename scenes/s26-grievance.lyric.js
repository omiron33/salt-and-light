// The words of s26-grievance: split across the crack, as the two are. "And remember your" high on
// the left over the dark of the far court; "brother's grievance" answers high on the right, apart.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  setLine(ctx, w.slice(0, 3), t, { x: 330, y: 360, px: 170, align: 'left', alpha: a });
  setLine(ctx, w.slice(3), t, { x: 3510, y: 600, px: 170, align: 'right', alpha: a });
}, { shade: 0.5 });
