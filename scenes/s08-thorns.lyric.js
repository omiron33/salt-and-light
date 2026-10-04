// The words of s08-thorns: low, over the black hills under the thorns, in two rows; the second row
// ("have the kingdom") centred under the place the light breaks through.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const i = L.words.findIndex((w) => /^have/i.test(w.w));
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  setLine(ctx, L.words.slice(0, i), t, { x: 1920, y: 1600, px: 150, align: 'center', alpha: a });
  setLine(ctx, L.words.slice(i), t, { x: 1920, y: 1860, px: 190, align: 'center', alpha: a });
});
