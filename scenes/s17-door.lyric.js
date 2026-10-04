// The words of s17-door: stacked on the left over the dark, moonlit side of the lane, away from the
// lit wall where the shadows give the bread: "Let your good works" / "shine before others".
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0]; if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.04);
  const i = l.words.findIndex((w) => /^shine/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 240, y: 560, px: 150, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 240, y: 800, px: 150, align: 'left', alpha: a });
});
