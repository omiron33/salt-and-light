"""Write film.json: one scene per stretch of the song, each cut on a measured beat just before the
first sung word of the scene (or on a beat at the time given for the instrumental stretches)."""
import json
L = json.load(open('data/lyrics.json'))
beats = L['beats']; lines = L['lines']
# (scene, first line of the scene, or a song time for an instrumental cut, hold note)
PLAN = [
    ('s00-title', 0.0, 'the title over the instrumental opening'),
    ('s01-poor', 'Blessed are the poor', 'the first blessing, sung slowly'),
    ('s02-mourn', 'Blessed are the ones who mourn', None),
    ('s03-gentle', 'Blessed are the gentle', None),
    ('s04-thirst', 'Those who hunger', None),
    ('s05-mercy', 'Mercy will meet', None),
    ('s06-pure', 'Pure hearts', None),
    ('s07-peace', 'Those who make peace', 'one long sung line'),
    ('s08-thorns', 'Those who suffer', None),
    ('s09-storm', 'When they speak', None),
    ('s10-rejoice', 'Rejoice', 'the held line into the chorus'),
    ('s11-salt', 'You are the salt', None),
    ('s12-taste', 'Do not let it lose', None),
    ('s13-shore', 'You are the light', None),
    ('s14-city', 'A city on a hill', None),
    ('s15-basket', 'No one lights a lamp', None),
    ('s16-stand', 'Set it where', None),
    ('s17-door', 'Let your good works', None),
    ('s18-glory', 'And give your Father', None),
    ('s19-night-sea', 110.0, 'the instrumental interlude: one slow glide over the night sea'),
    ('s20-law', 'Do not think I came', 'two lines of one sentence'),
    ('s21-fulfill', 'I came to bring', None),
    ('s22-mark', 'Not one small mark', 'two lines of one sentence'),
    ('s23-murder', 'You heard the command against murder', None),
    ('s24-anger', 'I tell you anger', None),
    ('s25-altar', 'When you bring your gift', None),
    ('s26-grievance', 'And remember', None),
    ('s27-go', 'Leave your gift', 'leave and return: one sentence'),
    ('s28-salt2', 'You are the salt', None),
    ('s29-taste2', 'Do not let it lose', None),
    ('s30-light2', 'You are the light', None),
    ('s31-city2', 'A city on a hill', None),
    ('s32-lamp2', 'No one lights a lamp', None),
    ('s33-house2', 'Set it where', None),
    ('s34-works2', 'Let your good works', None),
    ('s35-glory2', 'And give your Father', 'the chorus rings out'),
    ('s36-heart', 'You heard the command against adultery', 'two lines of one teaching'),
    ('s37-eye', 'If your right eye', 'two lines of one teaching'),
    ('s38-gehenna', 'Better to lose', 'two lines of one teaching'),
    ('s39-vows', 'You heard the command against false', None),
    ('s40-yes', 'But let your yes', 'yes and no, one thought'),
    ('s41-cheek', 'You heard an eye', 'eye for an eye turned into the other cheek, one sentence'),
    ('s42-cloak', 'If someone takes', None),
    ('s43-mile', 'If you are forced', None),
    ('s44-give', 'Give to the one', 'two lines of one sentence'),
    ('s45-fires', 'You heard, love', None),
    ('s46-love', 'But I tell you, love', None),
    ('s47-pray', 'Pray for the ones', None),
    ('s48-sun', 'Your Father sends', None),
    ('s49-rain', 'And rain on', None),
    ('s50-reward', 'If you love only', 'the question and its silence'),
    ('s51-perfect', 'Be perfect', 'the last line and the light that answers it'),
    ('s52-end', 296.0, 'the end title over the closing instrumental'),
]
norm = lambda s: s.lower().replace(',', '')
cuts = []
after = 0.0
prev_end = 0.0
for name, key, hold in PLAN:
    if isinstance(key, float):
        t = key if key == 0 else min(beats, key=lambda b: abs(b - key))
    else:
        l = next(l for l in lines if l['start'] >= after and norm(l['text']).startswith(norm(key)))
        after = l['start'] + 0.01
        ok = [b for b in beats if prev_end - 0.05 <= b <= l['start'] - 0.2]
        t = ok[-1] if ok else max(prev_end, l['start'] - 0.35)
        prev_end = l['end']
    cuts.append((name, round(t, 3), hold))
scenes = []
for i, (name, t, hold) in enumerate(cuts):
    to = cuts[i + 1][1] if i + 1 < len(cuts) else round(L['duration'], 3)
    s = {'id': f'{i:02d}', 'scene': name, 'from': t, 'to': to}
    if hold: s['hold'] = hold
    scenes.append(s)
json.dump({'fps': 60, 'samples': 10, 'tier': 'standard', 'lyric': {'haloSpread': 9, 'shade': 0.5}, 'scenes': scenes}, open('film.json', 'w'), indent=1)
for s in scenes: print(s['id'], s['scene'].ljust(16), f"{s['from']:7.2f} {s['to']:7.2f} {s['to']-s['from']:5.2f}")
