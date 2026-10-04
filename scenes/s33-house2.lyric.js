// The words of s33-house2: low on the left over the dark of the yard, beside the house as its rooms
// light; "Set it where the whole" above, "house can see" below, "house" in the lamp's lit amber.
import { lyricModule, setLine, outFade, arrive, paint, measure, speakerOf } from '/song/lib/type.js';

function row(ctx, words, t, { x, y, px, alpha }) {
  const vo = (w) => (/^house/i.test(w.w) ? 'light' : undefined);
  for (const w of words) {
    const st = arrive(w, t);
    const yy = y + (1 - st.k) * px * 0.1;
    paint(ctx, w.w, x, yy, px, { voice: vo(w), speaker: speakerOf(w), alpha: st.a * alpha });
    x += measure(ctx, w.w, px, { voice: vo(w), speaker: speakerOf(w) });
  }
}
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  setLine(ctx, w.slice(0, 5), t, { x: 280, y: 1700, px: 150, align: 'left', alpha: a });
  row(ctx, w.slice(5), t, { x: 280, y: 1930, px: 180, alpha: a });
}, { shade: 0.5 });
