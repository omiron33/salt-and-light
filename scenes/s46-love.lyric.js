// The words of s46: "But I tell you," small, then "love your enemies" large, across the dark sky at
// the top left, above the water the boat crosses.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  const i = l.words.findIndex((w) => /^love/i.test(w.w));
  const a = outFade(t, P.to - 0.25, P.to);
  setLine(ctx, l.words.slice(0, i), t, { x: 260, y: 300, px: 120, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 260, y: 540, px: 210, align: 'left', alpha: a });
});
