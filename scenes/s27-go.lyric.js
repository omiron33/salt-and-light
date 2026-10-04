// The words of s27-go: one sentence, out and back. "Leave your gift" low on the left beside the gift;
// "and go make peace" takes over high in the dark sky above the road; at the cut back to the altar,
// "Then come and offer it" sets high on the left, clear of the incense and its light.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines; if (!A) return;
  const w = A.words;
  const tGo = w.find((x) => /^go/i.test(x.w)).start;
  const tBack = 159.34;
  const a1 = outFade(t, tGo - 0.45, tGo - 0.2);
  setLine(ctx, w.slice(0, 3), t, { x: 300, y: 1880, px: 175, align: 'left', alpha: a1 });
  const a2 = outFade(t, tBack - 0.12, tBack + 0.0) * (t >= tGo - 0.3 ? 1 : 0);
  setLine(ctx, w.slice(3), t, { x: 1920, y: 420, px: 180, align: 'center', alpha: a2 });
  if (B && t >= tBack) {
    const a3 = outFade(t, P.to - 0.25, P.to - 0.02);
    setLine(ctx, B.words, t, { x: 300, y: 380, px: 175, align: 'left', alpha: a3 });
  }
}, { shade: 0.5 });
