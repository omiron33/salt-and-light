// The words of s35-glory2: low on the left, over the dark shoulder of the hill and the unlit roofs,
// well below the brightening sky; "And give your" small above, FATHER GLORY large below in the gold
// capitals, set a step to the right.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.45, P.to - 0.05);
  setLine(ctx, w.slice(0, 3), t, { x: 300, y: 1690, px: 130, align: 'left', alpha: a });
  setLine(ctx, w.slice(3), t, { x: 360, y: 1945, px: 215, align: 'left', alpha: a });
}, { shade: 0.6 });
