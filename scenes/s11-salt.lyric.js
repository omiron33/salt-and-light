// The words of s11-salt: one inscription row across the dark above the drift of crystals; "salt"
// and "earth" stand tall in their cold-white and earth capitals, the small words in quiet bone.
import { lyricModule, inscribe, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  inscribe(ctx, l.words, t, { x: 1920, y: 560, small: 150, big: 290, alpha: outFade(t, P.to - 0.3, P.to - 0.02) });
});
