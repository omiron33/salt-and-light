// The words of s10: "Rejoice;" alone and large in the rose italic, low on the left over the dark
// underside of the storm while we are still inside it; then, as the clouds part, "your reward is in
// heaven" across the top left, in the dark starry sky away from the light, "heaven" in gold.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  const [w1, ...rest] = l.words;
  const r0 = rest[0]?.start ?? P.to;
  if (t >= w1.start - 0.1) {
    const a = outFade(t, r0 - 0.6, r0 - 0.1);
    if (a > 0) setLine(ctx, [w1], t, { x: 300, y: 1760, px: 300, align: 'left', alpha: a });
  }
  if (rest.length && t >= r0 - 0.1) setLine(ctx, rest, t, { x: 300, y: 380, px: 170, align: 'left', alpha: outFade(t, P.to - 0.25, P.to) });
});
