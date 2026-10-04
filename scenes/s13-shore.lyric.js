// s13-shore words: "You are the light for the world", set as one low inscription over the dark water
// below the lamps' reflections: the small words in quiet bone, "light" large in lamp amber.
import { lyricModule, inscribe, outFade } from '/song/lib/type.js';

export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L) return;
  const a = outFade(t, P.to - 0.22, P.to - 0.02);
  inscribe(ctx, L.words, t, { x: 1920, y: 1890, small: 140, big: 290, alpha: a });
}, { shade: 0.4 });
