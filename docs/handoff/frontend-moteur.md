# Handoff frontend : moteur de pub (F4)

## Fichiers (rien de commité)

`apps/web/src/lib/pub/`
- `scene.ts` : constantes (1920x1080, 30 i/s), types `Scene`, `InstantScene`, `ContexteRendu`, `Transitionneur`.
- `moteur.ts` : `creerMoteur({ script, scenes, voixMesurees?, contexte?, transitions? })` : timeline de core, couches (scène, précédente, transition), `dessiner(ctx, temps, echelle)`.
- `contexte.ts` : palette, `chargerPolices`, détection de `ctx.filter`, images (Map d'`ImageBitmap`, remplie par F8).
- `aleatoire.ts` : `alea(graine)` (mulberry32) et `graineDepuisTexte`; chaque `InstantScene` porte `graine`.
- `transitions.ts` : fondu de remplacement pour glitch, flou, pixels (F5 fournit les vraies via l'option `transitions`).
- `audio.ts` : `assemblerAudio` (voix placées à `debut + DECALAGE_VOIX`, fond optionnel, durée exacte en échantillons, 1600 par image), `genererSonTest` (bip chaque seconde).
- `synchro.ts` : `DECALAGE_VOIX = 0,15 s`, partagé par le mixage et les SRT.
- `sous-titres.ts` : `genererSrt(moteur, voixMesurees)`, deux lignes de 42 caractères, repère identique au mixage.
- `apercu.ts` : `creerApercu(canvas, moteur, audio, surTemps)` à 960x540, horloge `AudioContext.currentTime`, lecture, pause, `aller`.
- `export.ts` : `exporter(moteur, audio, surProgression, signal)` et `choisirFormat`. MP4 (H.264 + AAC) sinon WebM (VP9 ou VP8 + Opus) sinon erreur explicite. 8 Mb/s vidéo, 192 kb/s audio, 48 kHz stéréo.
- `scenes/test.ts` : scène de test (fond uni, texte, minuteur, barre) et `registreDeTest()`. Une `etape` n'affiche que son titre, `visuel: liste` vide compris.
- `banc/` : `banc.ts`, `banc.css`, `script-test.ts` (script de 12 scènes ajusté à 60 s).
- `index.ts` : exports publics.

Hors `lib/pub/` (nécessaire pour la page de test) : `apps/web/dev/pub.html`. Servie par Vite en développement à `/dev/pub.html`, absente du build (seul `index.html` est une entrée). Aucune modification de `App.tsx`, `package.json`, `vite.config.ts`, `_headers`. La page de la voix n'existait pas : à placer à côté dans `apps/web/dev/`. Aucune dépendance ajoutée.

## Interface de scène

```ts
type Scene = { dessiner(ctx: Ctx2D, instant: InstantScene, palette: Palette): void };
// instant : { donnees (ScenePub), scene (SceneTimeline), t (0..1), secondes, temps (global), graine, contexte }
```
Repère logique 1920x1080 (l'échelle de l'aperçu est déjà appliquée). Fonction pure : pas d'état, hasard par `alea(instant.graine)`. La scène dessine son propre fond. Le registre est un `Record<TypeScene, Scene>`. Transition : `(ctx, avant, apres, progres, palette)` avec deux toiles ; dessiner par `drawImage(couche, 0, 0, LARGEUR, HAUTEUR)`.

## Mesures (Chrome 152 du panneau intégré, macOS, pub de test 60 s)

- Export : 1800 images, MP4 H.264 High + AAC LC, 5,9 Mo (scène triviale).
- `ffprobe` : vidéo `duration=60.000000`, `nb_frames=1800`, 1920x1080, 30 i/s; audio 48 kHz stéréo `duration=60.0307` (2816 paquets); conteneur `60.0307`, soit moins d'une image (33,3 ms) d'écart. Décodage complet par `ffmpeg` sans erreur.
- Synchro : bips mesurés après décodage à +1 ms de la seconde pleine. Sans correction l'AAC arrivait 44 ms trop tard (amorce de 2112 échantillons) : `export.ts` date le premier paquet à -2112/48000 s, mediabunny écrit une liste d'édition.
- Temps de rendu : 16 s (premier essai, onglet au premier plan) et 31,6 s (onglet en arrière-plan) pour 60 s de vidéo, soit 2 à 4 fois plus vite que le temps réel. Dessin : moyenne 0,3 ms, p95 0,5 ms par image. Ces chiffres valent pour une scène triviale : le budget de 60 ms par image (ADR-06) reste à mesurer avec les vraies scènes (F5 à F7). Le temps est dominé par l'encodage.
- Un `setTimeout` pour céder la main plafonnait l'export à 10 images par seconde en onglet masqué : remplacé par un `MessageChannel`.
- SRT vérifié sur un script avec voix (découpage, horodatage, aucun chevauchement).

## Non vérifié et limites

- Lecture dans QuickTime et VLC non testée (pas d'ouverture graphique) : seuls `ffprobe` et `ffmpeg` valident le flux.
- Repli WebM non exercé (Chrome encode H.264 et AAC ici) ; Firefox et Safari non testés.
- Amorce AAC de 2112 échantillons mesurée sous macOS ; un autre encodeur (Windows) peut en avoir une autre : à recontrôler sur Windows.
- L'aperçu et l'audio sont vérifiés au chargement et par code, pas à l'oreille ; la dérive de l'horloge audio n'a pas été mesurée longuement.
- Le mixage avec baisse sous la voix et la musique sont à faire en F9; `assemblerAudio` ne fait qu'additionner.
- Export en mémoire (`fastStart: "in-memory"`) : environ 60 Mo à 8 Mb/s.
- `tsc` (`tsconfig.app.json`) et `oxlint` sur `src/lib/pub` : aucune erreur. Pas de tests unitaires automatisés (dépendent de WebCodecs).
- Exports de test supprimés, serveur Vite et récepteur arrêtés.

## Lancer

`cd apps/web && npx vite --host 127.0.0.1 --port 5199`, puis `http://127.0.0.1:5199/dev/pub.html`.

## Message de commit proposé

```
feat(web): add pub rendering engine with preview and export

Canvas 2D engine driven by the core timeline: scene interface,
overlapping transitions, audio-clock preview at half resolution,
frame-exact WebCodecs export (MP4 H.264 and AAC, WebM fallback),
AAC priming compensation and SRT subtitles from the voices.
Includes a dev-only test bench page and a plain test scene.
```
Fichiers : `apps/web/src/lib/pub/`, `apps/web/dev/pub.html`, `docs/handoff/frontend-moteur.md`.
