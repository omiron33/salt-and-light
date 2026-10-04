// The words of s23-murder: low on the left over the dark ground and the stone's long shadow, the
// small words quiet on one line and MURDER beneath them in cold ash capitals, arriving on its onset.
import { lyricModule, setLine, paint, measure, arrive, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [l] = lines;
  if (!l) return;
  const al = outFade(t, P.to - 0.25, P.to - 0.02);
  const head = l.words.slice(0, -1), last = l.words[l.words.length - 1];
  setLine(ctx, head, t, { x: 280, y: 1560, px: 130, align: 'left', alpha: al });
  const st = arrive(last, t, 0.05, 0.22);
  paint(ctx, last.w, 280, 1880 + (1 - st.k) * 24, 280, { alpha: st.a * al });
});
