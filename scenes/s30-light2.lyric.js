// s30-light2 words: "You are the light for the world", in two rows low on the left over the dark
// slope where the night's lamps still burn: "You are the light" / "for the world", stepped in.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';

export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const i = L.words.findIndex((w) => /^for/i.test(w.w));
  setLine(ctx, L.words.slice(0, i), t, { x: 300, y: 1800, px: 180, align: 'left', alpha: a });
  setLine(ctx, L.words.slice(i), t, { x: 520, y: 1975, px: 140, align: 'left', alpha: a });
}, { shade: 0.45 });
