// The title of s00: SALT AND LIGHT in tall pale capitals in the dark sky over the lake (right of the
// hill, above the horizon glow), MATTHEW 5 small and tracked beneath. The letters come out of the dark
// one by one after the flame has leapt, as if the lamp's light reached them; LIGHT keeps a faint
// warmth. The title lifts away and clears as the camera rises over the lamp.
import { lyricModule, ease, clamp01, outFade, note } from '/song/lib/type.js';

const T_TITLE = 5.83, T_REF = 7.73, T_OUT0 = 14.2, T_OUT1 = 15.6;
const CX = 2420, CY = 760, PX = 270;

export default lyricModule((ctx, t) => {
  const out = outFade(t, T_OUT0, T_OUT1);
  if (t < T_TITLE - 0.2 || out <= 0) return;
  const lift = -60 * ease.inOut3(clamp01((t - T_OUT0) / (T_OUT1 - T_OUT0)));
  ctx.font = `400 ${PX}px "Bebas Neue"`;
  ctx.fontVariantCaps = 'normal';
  const track = PX * 0.16;
  ctx.letterSpacing = '0px';
  const text = 'SALT AND LIGHT';
  const widths = [...text].map((ch) => ctx.measureText(ch).width + (ch === ' ' ? PX * 0.12 : track));
  const total = widths.reduce((a, b) => a + b, 0) - track;
  let x = CX - total / 2;
  [...text].forEach((ch, i) => {
    const t0 = T_TITLE + i * 0.075;
    const k = ease.out3(clamp01((t - t0) / 0.9));
    const a = k * out;
    if (ch !== ' ' && a > 0.002) {
      const warm = i >= 9;   // L I G H T
      const y = CY + lift + (1 - k) * 26;
      if (warm) { ctx.shadowColor = `rgba(255, 150, 60, ${(0.45 * a).toFixed(3)})`; ctx.shadowBlur = PX * 0.3; }
      ctx.fillStyle = warm ? `rgba(255, 226, 186, ${a.toFixed(3)})` : `rgba(236, 232, 224, ${a.toFixed(3)})`;
      ctx.fillText(ch, x, y);
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }
    x += widths[i];
  });
  const kr = ease.out3(clamp01((t - T_REF) / 1.2)) * out;
  if (kr > 0.002) note(ctx, 'MATTHEW 5', CX, CY + lift + 150 + (1 - kr) * 14, { px: 64, align: 'center', alpha: 0.85 * kr, track: 0.55, color: '226, 214, 192' });
});
