// The words of s47-pray: quiet, on the dark wall to the left of the lamp, the line broken in two so
// it reads like a prayer: "Pray for the ones" / "who persecute you", the second line set in a little.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [l] = lines;
  if (!l) return;
  const out = outFade(t, P.to - 0.3, P.to - 0.03);
  const i = l.words.findIndex((w) => /^who$/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 240, y: 620, px: 150, align: 'left', alpha: out });
  setLine(ctx, l.words.slice(i), t, { x: 360, y: 830, px: 150, align: 'left', alpha: out });
});
