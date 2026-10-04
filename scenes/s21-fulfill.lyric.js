// The words of s21-fulfill: the small words quietly above, then "fulfillment" large beneath them in
// its rose italic, in the dark of the hall over the glowing page.
import { lyricModule, setLine, paint, measure, arrive, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [l] = lines;
  if (!l) return;
  const al = outFade(t, P.to - 0.25, P.to - 0.02);
  const head = l.words.slice(0, -1), last = l.words[l.words.length - 1];
  setLine(ctx, head, t, { x: 1920, y: 430, px: 120, align: 'center', voice: 'quiet', alpha: al });
  const px = 300, w = measure(ctx, last.w, px);
  const st = arrive(last, t, 0.06, 0.3);
  paint(ctx, last.w, 1920 - w / 2 + 30, 740 + (1 - st.k) * 30, px, { alpha: st.a * al });
});
