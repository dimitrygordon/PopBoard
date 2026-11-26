# Constellation art atlas: credits and license

## Credit
Constellation illustrations by **Johan Meuris**, from the Stellarium project's "western" (modern IAU) sky culture.

- Original files: https://github.com/Stellarium/stellarium-skycultures/tree/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations
- Repository: https://github.com/Stellarium/stellarium-skycultures (pinned commit `2d80ce70984c14bba7da2d31a0f9b27e292861c9`)
- Original license: Free Art License 1.3, as stated in `western/description.md` ("Illustrations: Free Art License").
- Stellarium: https://stellarium.org

## License of this atlas
The files `constellations-atlas.png` and `constellations-atlas.webp` are a modified work of the originals above.
They are released under the **Free Art License 1.3** (full text in `LICENSE-FAL.txt` beside this file,
also at https://artlibre.org/licence/lal/en/). You may copy, share and change them under that license.
Keep this file and `LICENSE-FAL.txt` with the atlas.

The alignment data in `art-atlas.json` (anchor stars and pixel positions) comes from Stellarium's
`western/index.json`, which is "Text and data: CC BY-SA" by the Stellarium team. Our remapping of it
into atlas coordinates is shared under CC BY-SA 4.0.

## What we changed (modifications, as the Free Art License asks)
1. Black floor removed and grey levels re-normalized and lifted, so each figure reads as bright ghost white.
2. A soft glow, a bright soft rim and a light blur were added; fills were dimmed. (Night Sky look for PopBoard.)
3. Andromeda was downscaled from 1024x1024 to 512x512, its size declared in `index.json`. No other image was resized.
4. All 85 images were repacked into one 4096x4096 single channel atlas with 8 pixel gutters.
5. Converted to PNG (lossless) and WebP (lossy, quality 88).
6. Color is not baked in. The app tints the atlas in its shader (pale lavender white `#E6E6FF`).

Pup, Ser and Vel have no illustration in the source, so they are not in the atlas.

Built by `tools/build-art-atlas.py` (PopBoard). Not legal advice.

## Original files used
| IAU | Name | Original file | Source pixels | Atlas pixels |
|---|---|---|---|---|
| And | Andromeda | [andromeda.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/andromeda.webp) | 1024x1024 | 512x512 |
| Ant | Antlia | [antlia.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/antlia.webp) | 128x128 | 128x128 |
| Aps | Apus | [apus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/apus.webp) | 256x256 | 256x256 |
| Aql | Aquila | [aquila.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/aquila.webp) | 512x512 | 512x512 |
| Aqr | Aquarius | [aquarius.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/aquarius.webp) | 512x512 | 512x512 |
| Ara | Ara | [ara.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/ara.webp) | 256x256 | 256x256 |
| Ari | Aries | [aries.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/aries.webp) | 256x256 | 256x256 |
| Aur | Auriga | [auriga.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/auriga.webp) | 512x512 | 512x512 |
| Boo | Bootes | [bootes.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/bootes.webp) | 512x512 | 512x512 |
| CMa | Canis Major | [canis-major.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/canis-major.webp) | 512x512 | 512x512 |
| CMi | Canis Minor | [canis-minor.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/canis-minor.webp) | 256x256 | 256x256 |
| CVn | Canes Venatici | [canes-venatici.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/canes-venatici.webp) | 256x256 | 256x256 |
| Cae | Caelum | [caelum.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/caelum.webp) | 256x256 | 256x256 |
| Cam | Camelopardalis | [camelopardalis.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/camelopardalis.webp) | 256x256 | 256x256 |
| Cap | Capricornus | [capricornus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/capricornus.webp) | 512x512 | 512x512 |
| Car | Carina | [argonavis.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/argonavis.webp) | 512x512 | 512x512 |
| Cas | Cassiopeia | [cassiopeia.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/cassiopeia.webp) | 512x512 | 512x512 |
| Cen | Centaurus | [centaurus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/centaurus.webp) | 512x512 | 512x512 |
| Cep | Cepheus | [cepheus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/cepheus.webp) | 512x512 | 512x512 |
| Cet | Cetus | [cetus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/cetus.webp) | 512x512 | 512x512 |
| Cha | Chamaeleon | [chamaeleon.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/chamaeleon.webp) | 256x256 | 256x256 |
| Cir | Circinus | [circinus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/circinus.webp) | 256x256 | 256x256 |
| Cnc | Cancer | [cancer.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/cancer.webp) | 256x256 | 256x256 |
| Col | Columba | [columba.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/columba.webp) | 256x256 | 256x256 |
| Com | Coma Berenices | [coma-berenices.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/coma-berenices.webp) | 256x256 | 256x256 |
| CrA | Corona Australis | [corona-australis.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/corona-australis.webp) | 256x256 | 256x256 |
| CrB | Corona Borealis | [corona-borealis.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/corona-borealis.webp) | 256x256 | 256x256 |
| Crt | Crater | [crater.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/crater.webp) | 256x256 | 256x256 |
| Cru | Crux | [crux.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/crux.webp) | 128x128 | 128x128 |
| Crv | Corvus | [corvus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/corvus.webp) | 256x256 | 256x256 |
| Cyg | Cygnus | [cygnus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/cygnus.webp) | 512x512 | 512x512 |
| Del | Delphinus | [delphinus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/delphinus.webp) | 256x256 | 256x256 |
| Dor | Dorado | [dorado.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/dorado.webp) | 256x256 | 256x256 |
| Dra | Draco | [draco.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/draco.webp) | 512x512 | 512x512 |
| Equ | Equuleus | [equuleus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/equuleus.webp) | 256x256 | 256x256 |
| Eri | Eridanus | [eridanus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/eridanus.webp) | 512x512 | 512x512 |
| For | Fornax | [fornax.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/fornax.webp) | 256x256 | 256x256 |
| Gem | Gemini | [gemini.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/gemini.webp) | 256x256 | 256x256 |
| Gru | Grus | [grus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/grus.webp) | 256x256 | 256x256 |
| Her | Hercules | [hercules.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/hercules.webp) | 512x512 | 512x512 |
| Hor | Horologium | [horlogium.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/horlogium.webp) | 256x256 | 256x256 |
| Hya | Hydra | [hydra.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/hydra.webp) | 512x512 | 512x512 |
| Hyi | Hydrus | [hydrus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/hydrus.webp) | 256x256 | 256x256 |
| Ind | Indus | [indus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/indus.webp) | 256x256 | 256x256 |
| LMi | Leo Minor | [leo-minor.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/leo-minor.webp) | 256x256 | 256x256 |
| Lac | Lacerta | [lacerta.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/lacerta.webp) | 256x256 | 256x256 |
| Leo | Leo | [leo.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/leo.webp) | 512x512 | 512x512 |
| Lep | Lepus | [lepus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/lepus.webp) | 256x256 | 256x256 |
| Lib | Libra | [libra.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/libra.webp) | 256x256 | 256x256 |
| Lup | Lupus | [lupus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/lupus.webp) | 512x512 | 512x512 |
| Lyn | Lynx | [lynx.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/lynx.webp) | 512x512 | 512x512 |
| Lyr | Lyra | [lyra.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/lyra.webp) | 256x256 | 256x256 |
| Men | Mensa | [mensa.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/mensa.webp) | 256x256 | 256x256 |
| Mic | Microscopium | [microscopium.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/microscopium.webp) | 256x256 | 256x256 |
| Mon | Monoceros | [monoceros.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/monoceros.webp) | 512x512 | 512x512 |
| Mus | Musca | [musca.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/musca.webp) | 256x256 | 256x256 |
| Nor | Norma | [norma.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/norma.webp) | 128x128 | 128x128 |
| Oct | Octans | [octans.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/octans.webp) | 256x256 | 256x256 |
| Oph | Ophiuchus | [ophiuchus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/ophiuchus.webp) | 512x512 | 512x512 |
| Ori | Orion | [orion.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/orion.webp) | 512x512 | 512x512 |
| Pav | Pavo | [pavo.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/pavo.webp) | 256x256 | 256x256 |
| Peg | Pegasus | [pegasus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/pegasus.webp) | 512x512 | 512x512 |
| Per | Perseus | [perseus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/perseus.webp) | 512x512 | 512x512 |
| Phe | Phoenix | [phoenix.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/phoenix.webp) | 256x256 | 256x256 |
| Pic | Pictor | [pictor.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/pictor.webp) | 256x256 | 256x256 |
| PsA | Piscis Austrinus | [piscis-austrinus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/piscis-austrinus.webp) | 256x256 | 256x256 |
| Psc | Pisces | [pisces.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/pisces.webp) | 512x512 | 512x512 |
| Pyx | Pyxis | [pyxis.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/pyxis.webp) | 256x256 | 256x256 |
| Ret | Reticulum | [reticulum.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/reticulum.webp) | 128x128 | 128x128 |
| Scl | Sculptor | [sculptor.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/sculptor.webp) | 256x256 | 256x256 |
| Sco | Scorpius | [scorpius.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/scorpius.webp) | 512x512 | 512x512 |
| Sct | Scutum | [scutum.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/scutum.webp) | 256x256 | 256x256 |
| Sex | Sextans | [sextans.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/sextans.webp) | 128x128 | 128x128 |
| Sge | Sagitta | [sagitta.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/sagitta.webp) | 256x256 | 256x256 |
| Sgr | Sagittarius | [sagittarius.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/sagittarius.webp) | 512x512 | 512x512 |
| Tau | Taurus | [taurus.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/taurus.webp) | 512x512 | 512x512 |
| Tel | Telescopium | [telescopium.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/telescopium.webp) | 128x128 | 128x128 |
| Tra | Triangulum Australe | [triangulum-australe.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/triangulum-australe.webp) | 128x128 | 128x128 |
| Tri | Triangulum | [triangulum.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/triangulum.webp) | 128x128 | 128x128 |
| Tuc | Tucana | [tucana.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/tucana.webp) | 256x256 | 256x256 |
| UMa | Ursa Major | [ursa-major.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/ursa-major.webp) | 512x512 | 512x512 |
| UMi | Ursa Minor | [ursa-minor.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/ursa-minor.webp) | 256x256 | 256x256 |
| Vir | Virgo | [virgo.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/virgo.webp) | 512x512 | 512x512 |
| Vol | Volans | [volans.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/volans.webp) | 256x256 | 256x256 |
| Vul | Vulpecula | [vulpecula.webp](https://github.com/Stellarium/stellarium-skycultures/blob/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations/vulpecula.webp) | 256x256 | 256x256 |
