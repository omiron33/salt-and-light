# Credits and licenses

**Salt and Light** — TechnoChristianity / omiron33.

The lyrics set Christ's Sermon on the Mount from Matthew 5:3–48 in a close modern paraphrase. The recording was created with Suno. The film's scenes, procedural worlds, typography and deterministic rendering code are released under this repository's MIT license. The song recording and finished film are distributed separately; they are not relicensed as software.

## Rendering dependencies

- [Three.js](https://github.com/mrdoob/three), MIT License.
- [Playwright](https://github.com/microsoft/playwright), Apache License 2.0.
- FFmpeg and Google Chrome are installed separately and retain their respective licenses.

Every image in the film is computed by the scene shaders in this repository. No photographs, textures, 3D models or generated images are used.

## The scroll

The Hebrew written on the Torah scroll (scenes s20 to s22) is Deuteronomy 5:1 to 6:9, the consonantal text of *Miqra according to the Masorah* as published by [Sefaria](https://www.sefaria.org/Deuteronomy.5), with vowels and cantillation removed. That text is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); the text strings in `lib/x-scroll-text.js` are shared under the same license, with this attribution. It is painted with the operating system's Hebrew font (see [rendering](RENDERING.md)).

## Fonts

- EB Garamond — SIL Open Font License, notice in `renderer/web/fonts/EBGaramond-OFL.txt`.
- Inter Tight — SIL Open Font License, notice in `renderer/web/fonts/InterTight-OFL.txt`.
- Bebas Neue — SIL Open Font License, notice in `fonts/OFL-bebasneue.txt`.

## Timing data

The word timings in `data/lyrics.json` were made by forced alignment of the sung lyrics against a separated vocal stem on a local machine (torchaudio CTC alignment and Hybrid Demucs separation), checked word by word against a local Whisper transcription. They are machine estimates. The optional tools that produced them are described in [scene architecture](AUTHORING.md); they are not needed to render.
