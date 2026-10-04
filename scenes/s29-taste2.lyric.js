// The words of s29-taste2: low on the left, in the dark of the table's near edge below the bread,
// left-aligned in two rows: "Do not let it lose" quietly, then "its TASTE" with the salt-white
// capital landing as the focus reaches the bread.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l) return;
  const a = outFade(t, P.to - 0.3, P.to - 0.02);
  const i = l.words.findIndex((w) => /^its/i.test(w.w));
  setLine(ctx, l.words.slice(0, i), t, { x: 280, y: 1640, px: 160, align: 'left', alpha: a });
  setLine(ctx, l.words.slice(i), t, { x: 280, y: 1920, px: 230, align: 'left', alpha: a });
});
