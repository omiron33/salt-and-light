// s48-sun words: "Your Father sends sunlight / on evil and good". The first row low across the dark
// near slope; then "on evil" sits under the thorn field and "and good" under the wheat, so the line
// is laid on the two fields the light falls on alike.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';

export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const w = L.words;
  const k = w.findIndex((x) => /^on$/i.test(x.w));
  const g = w.findIndex((x, i) => i > k + 1 && /^and$/i.test(x.w));
  setLine(ctx, w.slice(0, k), t, { x: 1920, y: 1760, px: 170, align: 'center', alpha: a });
  setLine(ctx, w.slice(k, g), t, { x: 960, y: 1990, px: 150, align: 'center', alpha: a });
  setLine(ctx, w.slice(g), t, { x: 2880, y: 1990, px: 150, align: 'center', alpha: a });
}, { shade: 0.55 });
