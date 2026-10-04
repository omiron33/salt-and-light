// The words of s07-peace: one long sung line, set in two rows high in the dark between the crowns,
// "peace" first; "God's children" stepping in beneath as the shadows' hands meet.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const i = L.words.findIndex((w) => /^will/i.test(w.w));
  const a = outFade(t, P.to - 0.35, P.to - 0.05);
  setLine(ctx, L.words.slice(0, i), t, { x: 300, y: 430, px: 175, align: 'left', alpha: a });
  setLine(ctx, L.words.slice(i), t, { x: 520, y: 680, px: 175, align: 'left', alpha: a });
});
