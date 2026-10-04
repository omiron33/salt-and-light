// The words of s16-stand: low and wide across the floor of the room, under the lamp, so the line
// sits like the house itself round the light: "Set it where the whole" / "house can see".
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0]; if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.04);
  const i = l.words.findIndex((w) => /^house/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 260, y: 1700, px: 150, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 3580, y: 1930, px: 190, align: 'right', alpha: a });
});
