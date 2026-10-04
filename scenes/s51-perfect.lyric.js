// s51-perfect words: "Be perfect, / as your Father in heaven is perfect". Low on the left over the
// dark crest of the mount: "Be PERFECT," set large in gold first; then the long line beneath it as an
// inscription (small bone words, the Father's words in gold capitals). Both hold through the last
// "perfect" and fade as the camera crests the hill into the light.
import { lyricModule, inscribe, setLine, outFade, linesAt } from '/song/lib/type.js';

export default lyricModule((ctx, t, P, lines) => {
  const [L1, L2] = [lines[0], lines[1]];
  if (!L1) return;
  const end = (L2 ?? L1).end;
  const a = outFade(t, end + 0.9, end + 1.6);
  if (a <= 0) return;
  // "Be perfect," split from the rest of the sung line when the timing has it as one line
  const i = L1.words.findIndex((w, k) => k > 0 && /^as$/i.test(w.w));
  const first = i > 0 ? L1.words.slice(0, i) : L1.words;
  const second = i > 0 ? L1.words.slice(i) : (L2?.words ?? []);
  setLine(ctx, first, t, { x: 300, y: 1730, px: 215, align: 'left', alpha: a });
  if (second.length) inscribe(ctx, second, t, { x: 1500, y: 1950, small: 160, big: 180, alpha: a });
}, { shade: 0.5 });
