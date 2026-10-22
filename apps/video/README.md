# apps/video

Vidéos de projet générées à partir d'un dépôt Git : voix off, musique, effets sonores, décor 3D et motion design. Rendu avec [Remotion](https://www.remotion.dev) et Three.js.

Deux formats, décrits dans le skill Claude Code [`video-projet`](../../.claude/skills/video-projet/SKILL.md) :

| Format | Contenu | Durée | Image |
|---|---|---|---|
| `presentation` | Une pub : problème, révélation, démo, preuves, appel | 50 à 65 s | 1080 × 1350 (LinkedIn) |
| `histoire` | Comment le projet a été construit : commits, architecture, README, tests | 1 min 30 à 2 min 30 | 1920 × 1080 |

## Utilisation

```bash
npm run collecter -w @weekli/video -- <chemin-du-repo> <nom>   # faits : commits, docs, langages
node apps/video/scripts/capturer.mjs <nom> accueil <url>       # capture du site (facultatif)
# écrire apps/video/projets/<nom>/<format>.json (voir le skill)
npm run produire -w @weekli/video -- <nom> <presentation|histoire>
npm run studio -w @weekli/video                                # aperçu interactif
```

Sortie : `apps/video/sorties/<nom>-<format>.mp4`.

## Ce que fait `produire`

1. **Voix off** phrase par phrase avec la voix macOS `Thomas` (`say`), normalisée à -16 LUFS. La durée de chaque scène suit sa phrase. Cache par empreinte : seules les phrases modifiées sont régénérées.
2. **Musique** composée par le code (`scripts/audio.mjs`), libre de droits, à la durée exacte : `energique` à 112 bpm ou `calme` à 84 bpm. Elle s'efface sous la voix.
3. **Effets sonores** générés : souffle à chaque transition, montée de tension puis impact sur la révélation du nom.
4. **Rendu** Remotion, puis contrôle par `ffprobe` (codec, dimensions, piste audio).

## Organisation

```
src/
├── compositions/VideoProjet.tsx   Assemblage : décor, scènes, transitions, sons
├── composants/
│   ├── monde3d.tsx                Décor 3D continu (shaders GLSL, Three.js)
│   ├── transitions.tsx            Transitions 3D et éclats lumineux
│   ├── scenes.tsx                 Les 12 types de scènes
│   └── base.tsx                   Titrage cinétique, cartes, sous-titres, grain
├── temps.ts                       Calcul des durées et des chevauchements
└── theme.ts                       Palette, polices, cadence
scripts/                           collecter, capturer, produire, audio
projets/<nom>/                     Scripts JSON des vidéos (donnees.json n'est pas versionné)
```

Le décor 3D est un seul plan continu sous toute la vidéo : un dégradé liquide et une sculpture nacrée qui se déplace d'un coin à l'autre à chaque scène, passe en tons sombres sur les scènes sombres et plonge vers la caméra pendant les transitions.

## Prérequis

- macOS (voix `say`), `ffmpeg` et `ffprobe`, Chrome installé.
- Le rendu 3D utilise le GPU (`angle`, réglé dans `remotion.config.ts`). Compter environ deux minutes de rendu par minute de vidéo.
- Remotion est gratuit pour les particuliers et les petites équipes ; vérifier sa licence pour un usage en entreprise.

Les fichiers générés (`public/`, `sorties/`, `projets/*/donnees.json`) ne sont pas versionnés.
