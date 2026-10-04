# Scene architecture

The film is deterministic: each frame is a pure function of the scene parameters and song time, and any randomness is seeded by position. `film.json` defines 53 contiguous intervals cut on measured beats. Each scene has a picture module and a separate lyric module (the instrumental night-sea interlude, s19, has no words), so typography can change without re-rendering its world.

## Picture modules

Every picture module exports `kind = 'shader'` and a default factory receiving the scene parameters (`id`, `from`, `to`). The result provides `from`, `to`, a GLSL fragment shader, uniforms, a camera function (position, target, field of view, focus distance and aperture for the thin lens) and optional update and finishing functions. These scenes render through `renderer/web/premium/`.

`lib/look.js` is the shared look: palette, the grade, timing, easing and camera helpers. The worlds live in `lib/x-*.js`:

- `x-galilee*.js` — the Sea of Galilee at night: sky, stars, hills and water, the clay lamp on its rock (title and end), the fishing boat, the still lake, the storm clouds parting, and the two fires across the water.
- `x-dawn*.js` — the same sea and mount from the blue hour to full sunrise: shore lamps, the first light on the ridge, fields of wheat and thorns, rain and the final dawn.
- `x-city*.js` — the city on a hill: terraced stone houses with lamplit windows, olive groves, valley mist, the rising glory, and the lone window at dawn.
- `x-house*.js` — the stone house and its lane: the clay lamp and its flame, the basket, the lampstand, the niche, the doorways and the lamps lit down the lane.
- `x-salt*.js`, `x-vessel*.js` — salt crystals, the Dead Sea salt pan and the salt-crusted shore; the bowl filled with light, the oil poured into the lamp, salt and bread.
- `x-nature*.js` — night rain at a doorway, sprouting furrows, the cup at the spring, the olive grove, thorns against the light and the storm over the hills.
- `x-scroll*.js` — the Torah scroll and its letters, the smallest mark, and the carved stone in the night field.
- `x-temple*.js`, `x-ember.js` — the altar court, the gift, the cracked pavement, the road out and back, the incense; the coals of anger.
- `x-heart*.js`, `x-plumb.js` — the guttering lamp, the pruned vine, the valley of Gehenna; the plumb line for yes and no.
- `x-road*.js`, `x-vigil*.js`, `x-fires.js` — the scales and the pillar, the cloak, the milestone; the vigil lamp and prayer rope.

## Lyric modules

Each `scenes/<name>.lyric.js` exports a factory for a transparent text layer. `lib/type.js` holds the typography: the teaching in upright EB Garamond, with words of meaning set in their own voice (the Father and His Kingdom in gold capitals, salt in white, light and the lamp in lit amber italic, mercy and peace in a soft rose italic, sin and judgment in cold ash capitals, yes and no in clear white capitals). `data/lyrics.json` gives the measured sung-word and line intervals; words appear on their measured onsets, not on estimated beats.

The lyric canvas is 3840 × 2160 and is composited into the 1920 × 1080 output. Every word stays inside a 200 px margin of that canvas. The film-wide lyric backing (halo and shade) is set in `film.json`. Lyric modules may import only what the picture does not, so a typography change never re-renders a picture.

## Working on a scene

```sh
node tools/params.mjs s14-city --times
npm run still -- --scene s14-city --time 90.4 --samples 4
node tools/render.mjs scene --scene s14-city --from 89 --to 91 --draft
```

`docs/BRIEF.md` is the visual brief and `docs/STORYBOARD.md` gives each scene's intent. Keep scene times as they are in `film.json`; the cuts sit on beats.

## Optional planning and timing tools

The released timing data is sufficient for rendering; none of these run during installation or rendering, and running them overwrites authored files, so use a separate branch.

- `tools/plan.py` — rebuilds `film.json` from lyric lines and measured beats.
- `tools/analyze.py` — measures beats and loudness from the recording with NumPy (`python tools/analyze.py media/song.wav data/audio.json`).
- `tools/timing.py` — rebuilds `data/lyrics.json` from a forced alignment of `intake/sung-lyrics.txt` (the alignment file and recording are not included).
- `tools/vocals.py` — separates a vocal stem with a locally supplied Hybrid Demucs checkpoint (`python tools/vocals.py <checkpoint> <song.wav> <vocals.wav>`), so forced alignment hears the voice alone. Requires PyTorch and torchaudio.
