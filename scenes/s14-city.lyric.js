// The words of s14-city: high on the left in the dark of the starry sky beside the town, clear of
// the lit houses and the pale mist below; "A city on a hill" first, "city" in lit amber, then
// "cannot hide" a step in and a little larger beneath it.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const w = L.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  setLine(ctx, w.slice(0, 5), t, { x: 300, y: 300, px: 150, align: 'left', alpha: a });
  setLine(ctx, w.slice(5), t, { x: 400, y: 510, px: 185, align: 'left', alpha: a });
}, { shade: 0.5 });
