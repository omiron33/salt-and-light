// The scroll's writing. A Torah scroll is open at Deuteronomy 5:1 to 6:9, one continuous passage: the
// Ten Words (Deut 5) and the Shema (Deut 6:4-9). The consonantal text was taken from Sefaria's
// published Hebrew (Miqra according to the Masorah: vowels and cantillation stripped, the written form
// kept where it differs from the read one, e.g. 5:10), written in columns right to left with the
// closed-section gaps (setumot) and the open section (petuchah) before the Shema where the text has them. The text is painted
// with a Hebrew system font into a canvas that becomes the parchment's ink texture:
//   R = ink, G = the one yod the film's "small mark" scene looks at.
// A second, high-resolution canvas paints the same writing around that yod (for the extreme macro).
// Everything here is laid out once, deterministically, when the scene is built.

// The sheet as laid out on the lectern (local metres; x across the sheet, z up the page).
export const TEX_X = 0.38;       // the ink texture spans local x in [-TEX_X, TEX_X]
export const TEX_Z = 0.26;       // and z in [-TEX_Z, TEX_Z]
export const COL_PITCH = 0.155;  // column centres at x = 2P, P, 0, -P, -2P (right to left)
export const COL_W = 0.122;
export const N_COLS = 5;
const TEXT_Z = 0.232;            // writing block half height
export const HEB_FONT = '"Times New Roman", "New Peninim MT", "David", serif';

const S = '|S', PE = '|P';
const TEXT = [
  'ויקרא משה אל כל ישראל ויאמר אלהם שמע ישראל את החקים ואת המשפטים אשר אנכי דבר באזניכם היום ולמדתם אתם ושמרתם לעשתם יהוה אלהינו כרת עמנו ברית בחרב לא את אבתינו כרת יהוה את הברית הזאת כי אתנו אנחנו אלה פה היום כלנו חיים פנים בפנים דבר יהוה עמכם בהר מתוך האש אנכי עמד בין יהוה וביניכם בעת ההוא להגיד לכם את דבר יהוה כי יראתם מפני האש ולא עליתם בהר לאמר',
  S,
  'אנכי יהוה אלהיך אשר הוצאתיך מארץ מצרים מבית עבדים לא יהיה לך אלהים אחרים על פני לא תעשה לך פסל כל תמונה אשר בשמים ממעל ואשר בארץ מתחת ואשר במים מתחת לארץ לא תשתחוה להם ולא תעבדם כי אנכי יהוה אלהיך אל קנא פקד עון אבות על בנים ועל שלשים ועל רבעים לשנאי ועשה חסד לאלפים לאהבי ולשמרי מצותו',
  S,
  'לא תשא את שם יהוה אלהיך לשוא כי לא ינקה יהוה את אשר ישא את שמו לשוא',
  S,
  'שמור את יום השבת לקדשו כאשר צוך יהוה אלהיך ששת ימים תעבד ועשית כל מלאכתך ויום השביעי שבת ליהוה אלהיך לא תעשה כל מלאכה אתה ובנך ובתך ועבדך ואמתך ושורך וחמרך וכל בהמתך וגרך אשר בשעריך למען ינוח עבדך ואמתך כמוך וזכרת כי עבד היית בארץ מצרים ויצאך יהוה אלהיך משם ביד חזקה ובזרע נטויה על כן צוך יהוה אלהיך לעשות את יום השבת',
  S,
  'כבד את אביך ואת אמך כאשר צוך יהוה אלהיך למען יאריכן ימיך ולמען ייטב לך על האדמה אשר יהוה אלהיך נתן לך',
  S,
  'לא תרצח',
  S,
  'ולא תנאף',
  S,
  'ולא תגנב',
  S,
  'ולא תענה ברעך עד שוא',
  S,
  'ולא תחמד אשת רעך',
  S,
  'ולא תתאוה בית רעך שדהו ועבדו ואמתו שורו וחמרו וכל אשר לרעך',
  S,
  'את הדברים האלה דבר יהוה אל כל קהלכם בהר מתוך האש הענן והערפל קול גדול ולא יסף ויכתבם על שני לחת אבנים ויתנם אלי ויהי כשמעכם את הקול מתוך החשך וההר בער באש ותקרבון אלי כל ראשי שבטיכם וזקניכם ותאמרו הן הראנו יהוה אלהינו את כבדו ואת גדלו ואת קלו שמענו מתוך האש היום הזה ראינו כי ידבר אלהים את האדם וחי ועתה למה נמות כי תאכלנו האש הגדלה הזאת אם יספים אנחנו לשמע את קול יהוה אלהינו עוד ומתנו כי מי כל בשר אשר שמע קול אלהים חיים מדבר מתוך האש כמנו ויחי קרב אתה ושמע את כל אשר יאמר יהוה אלהינו ואת תדבר אלינו את כל אשר ידבר יהוה אלהינו אליך ושמענו ועשינו וישמע יהוה את קול דבריכם בדברכם אלי ויאמר יהוה אלי שמעתי את קול דברי העם הזה אשר דברו אליך היטיבו כל אשר דברו מי יתן והיה לבבם זה להם ליראה אתי ולשמר את כל מצותי כל הימים למען ייטב להם ולבניהם לעלם לך אמר להם שובו לכם לאהליכם ואתה פה עמד עמדי ואדברה אליך את כל המצוה והחקים והמשפטים אשר תלמדם ועשו בארץ אשר אנכי נתן להם לרשתה ושמרתם לעשות כאשר צוה יהוה אלהיכם אתכם לא תסרו ימין ושמאל בכל הדרך אשר צוה יהוה אלהיכם אתכם תלכו למען תחיון וטוב לכם והארכתם ימים בארץ אשר תירשון וזאת המצוה החקים והמשפטים אשר צוה יהוה אלהיכם ללמד אתכם לעשות בארץ אשר אתם עברים שמה לרשתה למען תירא את יהוה אלהיך לשמר את כל חקתיו ומצותיו אשר אנכי מצוך אתה ובנך ובן בנך כל ימי חייך ולמען יארכן ימיך ושמעת ישראל ושמרת לעשות אשר ייטב לך ואשר תרבון מאד כאשר דבר יהוה אלהי אבתיך לך ארץ זבת חלב ודבש',
  PE,
  'שמע ישראל יהוה אלהינו יהוה אחד ואהבת את יהוה אלהיך בכל לבבך ובכל נפשך ובכל מאדך והיו הדברים האלה אשר אנכי מצוך היום על לבבך ושננתם לבניך ודברת בם בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך וקשרתם לאות על ידך והיו לטטפת בין עיניך וכתבתם על מזזות ביתך ובשעריך',
];

function tokens() {
  const out = [];
  for (const t of TEXT) {
    if (t === S || t === PE) out.push(t);
    else for (const w of t.split(/\s+/).filter(Boolean)) out.push(w);
  }
  return out;
}

// Lay the words out in columns. Returns { words: [{w, xr, y, col}], font, px }, in texture pixels.
// The font size is chosen so the text just fills the five columns.
function layout(ctx, W, H, linesPer) {
  const pxm = W / (2 * TEX_X);                    // texture pixels per metre
  const colW = COL_W * pxm;
  const top = (TEX_Z - TEXT_Z) * pxm, textH = 2 * TEXT_Z * pxm;
  const pitch = textH / linesPer;
  const px = Math.round(pitch * 0.62);
  ctx.font = `700 ${px}px ${HEB_FONT}`;
  ctx.direction = 'rtl';
  const sp = ctx.measureText(' ').width * 1.15;
  const toks = tokens();
  const words = [];
  let col = 0, line = 0, i = 0;
  // the right edge of column c (columns run right to left)
  const right = (c) => (TEX_X + (2 - c) * COL_PITCH + COL_W / 2) * pxm;
  while (i < toks.length && col < N_COLS) {
    // gather a line
    const lw = []; let used = 0, endPara = false;
    while (i < toks.length) {
      const t = toks[i];
      if (t === PE) { i++; endPara = true; break; }
      if (t === S) { const g = px * 2.6; if (used + g > colW * 0.92) { i++; endPara = true; break; } lw.push({ gap: g }); used += g; i++; continue; }
      const w = ctx.measureText(t).width;
      if (used + w + (lw.length ? sp : 0) > colW) break;
      used += w + (lw.length ? sp : 0); lw.push({ w: t, width: w }); i++;
    }
    // justify full lines (a Torah column is flush on both sides), not the last of a paragraph
    const nGaps = lw.filter((x, k) => k > 0 && x.w && lw[k - 1].w).length;
    const extra = !endPara && i < toks.length && nGaps > 0 ? Math.min((colW - used) / nGaps, px * 1.2) : 0;
    let x = right(col);
    const y = top + (line + 0.78) * pitch;
    lw.forEach((it, k) => {
      if (it.gap) { x -= it.gap; return; }
      if (k > 0 && lw[k - 1].w) x -= sp + extra;
      words.push({ w: it.w, xr: x, y, col, line });
      x -= it.width;
    });
    line++;
    if (line >= linesPer) { line = 0; col++; }
  }
  return { words, px, pitch, filled: i >= toks.length, col, line };
}

// Build the ink canvases. Returns the canvases and where the yod is (texture px and local metres).
export async function scrollCanvases({ W = 6144, D = 2048, S: scale = 8 } = {}) {
  try { await document.fonts.load(`700 80px ${HEB_FONT}`, 'שמע'); } catch {}
  const H = Math.round(W * TEX_Z / TEX_X / 16) * 16;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // fewest lines per column (largest letters) that still fit all the text in the five columns
  let L = 24, lay;
  L = 20; for (; L <= 60; L++) { lay = layout(ctx, W, H, L); if (lay.filled) break; }
  const { words, px } = lay;
  // the yod: the first letter of a word in the top line of an inner column (so the page's top edge,
  // and the dark beyond it, lie just past it): "ישראל" if there is one, else another word beginning with yod
  // prefer a word that opens its line (so nothing sits on the yod's near side but the column's margin)
  const opens = (w) => !words.some((o) => o.col === w.col && o.line === w.line && o.xr > w.xr);
  let cand = words.filter((w) => w.line <= 1 && w.col >= 1 && w.col <= 3 && w.w.startsWith('י') && opens(w));
  if (!cand.length) cand = words.filter((w) => w.line === 0 && w.col >= 1 && w.col <= 3 && w.w.startsWith('י'));
  if (!cand.length) cand = words.filter((w) => w.line <= 2 && w.col >= 1 && w.col <= 3 && w.w.startsWith('י'));
  const yw = cand.find((w) => w.w === 'ישראל') ?? cand.find((w) => w.w !== 'יהוה') ?? cand[0] ?? words.find((w) => w.w.startsWith('י'));
  ctx.font = `700 ${px}px ${HEB_FONT}`; ctx.direction = 'rtl'; ctx.textAlign = 'right';
  const m = ctx.measureText('י');
  const yod = {
    x0: yw.xr - m.actualBoundingBoxLeft, x1: yw.xr + m.actualBoundingBoxRight,
    y0: yw.y - m.actualBoundingBoxAscent, y1: yw.y + m.actualBoundingBoxDescent,
  };
  const draw = (g) => {
    g.font = `700 ${px}px ${HEB_FONT}`; g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgb(255,0,0)';
    for (const w of words) g.fillText(w.w, w.xr, w.y);
    // the yod again, in red + green
    g.fillStyle = 'rgb(255,255,0)';
    g.fillText('י', yw.xr, yw.y);
  };
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  draw(ctx);
  // detail canvas around the yod
  const R = D / scale;
  const cx = (yod.x0 + yod.x1) / 2, cy = (yod.y0 + yod.y1) / 2;
  const dx0 = cx - R / 2, dy0 = cy - R / 2;
  const d = document.createElement('canvas'); d.width = D; d.height = D;
  const g = d.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, D, D);
  g.setTransform(scale, 0, 0, scale, -dx0 * scale, -dy0 * scale);
  draw(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const pxm = W / (2 * TEX_X);
  // the canvas is laid on the sheet mirrored in x (the reader looks up the page along +z, so his right is -x)
  const toLocal = (x, y) => [TEX_X - x / pxm, TEX_Z - y / pxm];
  return {
    canvas: c, detail: d, W, H, px, lines: L,
    // detail rect in main uv (flipY: v = 1 - y/H)
    detRect: [dx0 / W, 1 - (dy0 + R) / H, (dx0 + R) / W, 1 - dy0 / H],
    yodLocal: toLocal(cx, cy), yodSize: [(yod.x1 - yod.x0) / pxm, (yod.y1 - yod.y0) / pxm],
    letterM: px / pxm, yodWord: yw,
  };
}

// One yod alone, large, white on black (the carved mark of s23 uses the same glyph).
export async function yodCanvas(size = 512) {
  try { await document.fonts.load(`700 80px ${HEB_FONT}`, 'י'); } catch {}
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const px = size * 1.6;
  g.font = `700 ${px}px ${HEB_FONT}`; g.direction = 'rtl'; g.textAlign = 'right';
  const m = g.measureText('י');
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const sc = (size * 0.62) / Math.max(w, h);
  g.setTransform(sc, 0, 0, sc, size / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 * sc, size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 * sc);
  g.fillStyle = '#fff';
  g.fillText('י', 0, 0);
  return { canvas: c, aspect: w / h };
}
