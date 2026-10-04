// The words of s41-cheek: "You heard an eye for an eye" small and cold, high on the left over the
// dark wall while the balance swings; "But I tell you, turn the other cheek" comes in low on the left
// as the camera turns, "turn the other cheek" the larger line, arriving in the warm light.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  if (!a) return;
  const out = outFade(t, P.to - 0.35, P.to - 0.05);
  const aOut = b ? outFade(t, b.start - 0.25, b.start + 0.05) : out;
  setLine(ctx, a, t, { x: 260, y: 420, px: 160, align: 'left', alpha: aOut, ink: '206, 216, 232' });
  if (b) {
    const i = b.words.findIndex((w) => /^turn/i.test(w.w));
    setLine(ctx, b.words.slice(0, i), t, { x: 260, y: 1560, px: 140, align: 'left', alpha: out });
    setLine(ctx, b.words.slice(i), t, { x: 260, y: 1800, px: 210, align: 'left', alpha: out });
  }
});
