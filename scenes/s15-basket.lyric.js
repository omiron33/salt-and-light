// The words of s15-basket: high on the left over the dark of the room, in two rows that step down
// toward the basket: "No one lights a lamp" / "to cover it", the second row set in under the first.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0]; if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.04);
  const i = l.words.findIndex((w) => /^to$/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 300, y: 470, px: 165, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 560, y: 700, px: 165, align: 'left', alpha: a });
});
