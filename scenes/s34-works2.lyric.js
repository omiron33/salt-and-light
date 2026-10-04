// The words of s34-works2: low on the left over the dark street stones and the shadowed wall, away
// from the rose sky down the lane: "Let your good works" / "shine before others".
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0]; if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.04);
  const i = l.words.findIndex((w) => /^shine/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 640, y: 1700, px: 150, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 640, y: 1930, px: 150, align: 'left', alpha: a });
});
