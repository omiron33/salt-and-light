// The words of s44-give: the first line high on the left over the cold blue wall beside the door;
// when the second line comes it replaces it, set low across the dark of the street in front of the
// step, in two rows so it never runs into the light: "Do not turn away" / "the one who needs to borrow".
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [l1, l2] = lines; if (!l1) return;
  const a1 = l2 ? outFade(t, l2.start - 0.3, l2.start - 0.02) : outFade(t, P.to - 0.3, P.to - 0.04);
  if (a1 > 0) setLine(ctx, l1.words, t, { x: 260, y: 460, px: 150, align: 'left', alpha: a1 });
  if (l2 && t > l2.start - 0.15) {
    const a2 = outFade(t, P.to - 0.3, P.to - 0.04);
    const i = l2.words.findIndex((w, k) => k > 2 && /^the$/i.test(w.w));
    setLine(ctx, l2.words.slice(0, i), t, { x: 240, y: 460, px: 140, align: "left", alpha: a2 });
    setLine(ctx, l2.words.slice(i), t, { x: 240, y: 670, px: 140, align: "left", alpha: a2 });
  }
});
