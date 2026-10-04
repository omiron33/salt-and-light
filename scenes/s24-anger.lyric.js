// The words of s24-anger: high on the left over the dark of the hearth wall, in two rows: the quiet
// "I tell you" above ANGER, which lands large in ash capitals as the coals flare; "also faces
// JUDGMENT" below and to the right, stepping down towards the bed as the cold light falls.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  setLine(ctx, w.slice(0, 4), t, { x: 300, y: 330, px: 170, align: 'left', alpha: a });
  setLine(ctx, w.slice(4), t, { x: 520, y: 590, px: 170, align: 'left', alpha: a });
}, { shade: 0.5 });
