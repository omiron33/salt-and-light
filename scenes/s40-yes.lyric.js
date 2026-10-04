// The words of s40-yes: one thought in two lines, set either side of the true line. "But let your
// yes be yes" on the left in the shade beyond the lamp's reach; "And let your no be no" answering it
// lower down, also left, aligned on the same edge, so the plumb line stands between the words and
// the light. "yes" and "no" in clear white capitals.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  const end = outFade(t, P.to - 0.4, P.to - 0.05);
  if (a) setLine(ctx, a, t, { x: 1720, y: 760, px: 175, align: 'right', alpha: end * (t >= a.start - 0.1 ? 1 : 0) });
  if (b) setLine(ctx, b, t, { x: 1720, y: 1040, px: 175, align: 'right', alpha: end * (t >= b.start - 0.1 ? 1 : 0) });
}, { shade: 0.55 });
