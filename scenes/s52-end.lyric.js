// The end title of s52, over the deep blue-rose sky above the dawn sea (well clear of the sun, which
// sits low on the left): SALT AND LIGHT in the same tall pale capitals as the opening, MATTHEW 5:3–48
// small beneath, and then the credit, smaller still, low on the left over the dark water. Everything
// clears before the music ends.
import { lyricModule, ease, clamp01, outFade, note } from '/song/lib/type.js';

const T_TITLE = 296.4, T_REF = 297.83, T_CREDIT = 299.74, T_OUT0 = 303.9, T_OUT1 = 305.3;
const CX = 2300, CY = 470, PX = 240;

export default lyricModule((ctx, t) => {
  const out = outFade(t, T_OUT0, T_OUT1);
  if (t < T_TITLE - 0.2 || out <= 0) return;
  ctx.font = `400 ${PX}px "Bebas Neue"`;
  ctx.fontVariantCaps = 'normal';
  ctx.letterSpacing = '0px';
  const track = PX * 0.16;
  const text = 'SALT AND LIGHT';
  const widths = [...text].map((ch) => ctx.measureText(ch).width + (ch === ' ' ? PX * 0.12 : track));
  const total = widths.reduce((a, b) => a + b, 0) - track;
  let x = CX - total / 2;
  [...text].forEach((ch, i) => {
    const k = ease.out3(clamp01((t - T_TITLE - i * 0.06) / 1.1));
    const a = k * out;
    if (ch !== ' ' && a > 0.002) {
      const warm = i >= 9;
      if (warm) { ctx.shadowColor = `rgba(255, 150, 60, ${(0.4 * a).toFixed(3)})`; ctx.shadowBlur = PX * 0.3; }
      ctx.fillStyle = warm ? `rgba(255, 228, 190, ${a.toFixed(3)})` : `rgba(240, 236, 228, ${a.toFixed(3)})`;
      ctx.fillText(ch, x, CY + (1 - k) * 22);
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }
    x += widths[i];
  });
  const kr = ease.out3(clamp01((t - T_REF) / 1.3)) * out;
  if (kr > 0.002) note(ctx, 'MATTHEW 5:3–48', CX, CY + 140 + (1 - kr) * 12, { px: 62, align: 'center', alpha: 0.88 * kr, track: 0.5, color: '232, 220, 200' });
  const kc = ease.out3(clamp01((t - T_CREDIT) / 1.6)) * out;
  if (kc > 0.002) {
    ctx.font = 'italic 500 66px "EB Garamond"';
    ctx.letterSpacing = '1px';
    const s = 'Song and film by omiron33';
    ctx.fillStyle = `rgba(236, 226, 210, ${(0.85 * kc).toFixed(3)})`;
    ctx.fillText(s, 300, 1930 + (1 - kc) * 10);
    ctx.letterSpacing = '0px';
  }
}, { shade: 0.35 });
