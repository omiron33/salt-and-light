// The words of s43-mile: low on the left over the dark road, clear of the stone. "If you are forced"
// / "to walk one mile" in two short rows; they clear for "Go with them another", larger, alone, as the
// camera passes the stone and looks on down the road.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const out = outFade(t, P.to - 0.35, P.to - 0.05);
  if (a) {
    const i = a.words.findIndex((w) => /^to$/i.test(w.w));
    const aa = b ? outFade(t, b.start - 0.3, b.start + 0.02) : out;
    setLine(ctx, a.words.slice(0, i), t, { x: 260, y: 1620, px: 140, align: 'left', alpha: aa });
    setLine(ctx, a.words.slice(i), t, { x: 260, y: 1820, px: 140, align: 'left', alpha: aa });
  }
  if (b && t > b.start - 0.2) setLine(ctx, b, t, { x: 260, y: 1800, px: 200, align: 'left', alpha: out });
});
