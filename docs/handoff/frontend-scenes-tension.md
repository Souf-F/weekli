# Handoff frontend : scènes de tension et de révélation (F6)

**État : code écrit, NON exécuté.** Vite et `tsc` restent bloqués : iCloud a évacué une partie du dépôt (fichiers « dataless » : `tsconfig.base.json`, `packages/core/src/index.ts`, `types.ts`, `pub/index.ts`, `apps/web/package.json`, `tsconfig.json`, des `package.json` de `node_modules`, environ 600 fichiers hors `node_modules` et 3 600 dedans). `brctl download` ne les rapatrie pas (disque presque plein, 2,2 Go libres). Tant que le disque n'est pas libéré (ou « Optimiser le stockage » désactivé pour le Bureau), aucune page de banc, mesure ni planche n'est possible. `docs/reviews/scenes-f6.png` n'est donc **pas** produite. Rien n'est commité.

## Fichiers (rien de commité)

- `apps/web/public/fonts/geist-sans-latin-800-normal.woff2` : extrait de `@fontsource/geist-sans@5.3.0` par `npm pack` dans le scratchpad (OFL 1.1, même paquet que 400 à 600, fichier 600 vérifié identique octet pour octet). `@font-face` ajoutée dans `apps/web/src/styles/fonts.css`. Aucune dépendance ajoutée.
- `apps/web/src/lib/pub/scenes/tension/` : `commun.ts`, `logo.ts`, `ouverture.ts`, `repetition.ts`, `boucle.ts`, `chorus.ts`, `rupture.ts`, `revelation.ts`, `index.ts`.
- `apps/web/dev/scenes-tension.html`, `.css`, `.ts` : banc.
- Ajout à `lib/pub/visuel/cinetique.ts` (justifié plus bas).

## API

```ts
import { registreTension } from "./scenes/tension";
const scenes = { ...autres, ...registreTension(script) }; // Pick<RegistreScenes, 6 types>
```
Pourquoi une fabrique : `InstantScene` ne porte pas le script, or la révélation lit `projet.nom`, `marque.logo`, `marque.monogramme`, et toutes les scènes lisent `marque.typo` (ambiance). F7 aura le même besoin pour l'en-tête des étapes ; l'assemblage du registre global pourra appeler les deux fabriques.

Champs lus : `ouverture` (`moment`, `detail`), `repetition` (`lignes`, `impact`, `carte`), `boucle` (`phrase`, `reperes`, `carte`), `chorus` (`titre`, `chute`, `bulles`), `rupture` (`texte`), `revelation` (`slogan`, `signature`) ; plus `projet.nom`, `marque.typo`, `marque.logo`, `marque.monogramme` ; `contexte.images.get("logo")` (convention F8), `contexte.filtre`, `scene.duree`. Fonctions pures du temps, hasard par `alea(graine)`. Tuiles (cartes, bulles) et grilles de logo mises en mémoire : polices à charger avant le premier dessin (contrat existant).

## Calage sur la référence (images à 0,5 s de 0 à 21,5 s, mesurées à 1080p)

| Scène | Tailles et positions reprises | Rythme repris |
|---|---|---|
| `ouverture` | Moment 264 px (Affiche x 1,65), capitales, centre des capitales à y 490 ; détail 79 px Geist 600 `accentSombre` à +112 px ; cadran centré (960, 524), cercle 416 px, arcs extérieurs 464 px, 12 graduations | cadran tracé en 40 % ; lettres une à une (60 ms) avec traînée depuis la gauche ; détail à t 0,44 |
| `repetition` | Ligne 1 en 205 px à gauche (x 210, largeur 860), carte x 1,5 inclinée de 4° à droite ; lignes suivantes 112 px en haut au centre, la carte glisse au centre avec des ondes ; impact 300 px ; mur 7 x 7 (pas 155 x 102) | lignes sur t 0 à 0,6 ; impact à 0,6 ; mur à 0,74 du centre vers les bords |
| `boucle` | Phrase 104 px centrée en haut (centre 169) ; 6 cartes aux positions relevées, flou et pâleur selon la profondeur, repère au-dessus de chaque carte ; pastille à y 990 | mots tous les 0,27 s maxi (voix) ; repères sur t 0,1 à 0,86 ; à chaque repère une carte avance, se floute, sort puis revient au fond |
| `chorus` | Titre 161 px (Grand x 1,55, interligne 1,02) centre 565 ; 6 bulles aux places relevées, Geist 600 32 px, queue côté bord | bulles en ressort à partir de t 0,2 ; chute à t 0,52 ; bulles qui tombent (gravité, rotation, flou) |
| `rupture` | Frappe centrée 112 px, centre 540 | 0,55 s de silence (t 0,13) ; texte fini tenu 0,45 s, effacé, puis le curseur seul glisse au centre et grandit à 120 px (annonce les pixels) |
| `revelation` | Point central, 300 particules ; logo formé à 468 px au centre puis rangé à 176 px à gauche du nom (160 px), lockup centré à y 394 ; slogan 56 px centre 592, surlignage bloc blanc texte `sombre` ; signature 96 px (Geist 800) à +118 px sous le slogan, soulignée `accentSombre` | particules t 0,02 à 0,2 ; onde et éclat ; rangement 0,2 à 0,28 ; nom dévoilé depuis le logo à 0,21 ; slogan 0,32 ; signature 0,68 avec traînée ; rayons 0,12 à 0,37 ; caméra 1 vers 1,04 |

Durées du banc = découpage de la référence (1,85 ; 4,05 ; 4,2 ; 3,3 ; 4,3 ; 6 s) : avec les chevauchements par défaut, le temps de la pub égale celui de la référence, scène par scène.

## Écarts assumés vis-à-vis de design.md (pris sur la référence)

- Tailles nettement au-dessus de l'échelle 8.5 (264, 205, 161, 300 px...), via l'option `echelle` de `mettreEnPage` ; la réduction par pas de 4 % jusqu'à 80 % reste celle de F5.
- `repetition` : accent des premières lignes en `accentSombre`, alerte seulement sur la dernière (la référence passe du lilas au rouge). Mur 7 x 7 opaque à 90 % au lieu de 24 cartes à 30 %. Sans `carte` : lignes centrées et pas de mur.
- `chorus` : accent du titre en `accentSombre`, chute en `alerteSombre`.
- `revelation` : cellules du logo en blanc (la référence), pas en `accentSombre` (8.11) ; éclats moitié blancs moitié `accentSombre`. Logo de 176 px au lieu de 120. Lueur d'accent ajoutée au centre.
- Monogramme par défaut : première lettre du nom (2 caractères seulement si `marque.monogramme` les donne).
- Logo importé : grille 24 x 24 sur l'alpha ; une image sans pixel opaque retombe sur le monogramme.

## Ajout dans `lib/pub/visuel`

`cinetique.ts` : option `ecart?` de `dessinerMotParMot` et paramètre `ecart` (défaut `MOT.ecart`) de `finMotParMot` et `debutAccent`. Rétrocompatible. Raison : la référence pose les mots au rythme de la voix (0,25 à 0,4 s), pas tous les 70 ms.

## Banc (`/dev/scenes-tension.html`)

Vidéo de référence chargée depuis le disque (rien dans le dépôt) et calée sur le même temps que le canevas : lecture, curseur, 16 instants comparés (1 ; 1,5 ; 2,5 ; 4 ; 4,5 ; 5 ; 6,5 ; 8,5 ; 10,5 ; 11,5 ; 14 ; 15,5 ; 17 ; 17,5 ; 19,5 ; 21 s). Cases « Textes longs » (longueurs maximales du contrat, lettres larges, nom de 24 caractères, monogramme 2 lettres) et « Logo importé » (logo dessiné localement). « Mesurer le dessin » : 1920 x 1080, deux passes (la première hors régime), `getImageData` pour synchroniser, par scène. « Chercher les textes coupés » : espionne `fillText` et liste tout texte avec points de suspension. `window.imageTension(temps, echelle)` renvoie un PNG pour la planche.

## À faire dès que le disque est libéré

1. `npm run typecheck` et `npx oxlint src/lib/pub/scenes/tension dev/scenes-tension.ts`, puis `npm test` (apps/web).
2. Banc : vérifier chaque instant contre la vidéo, « Textes longs » + « Chercher les textes coupés » (attendu : aucun), « Mesurer » (budget 60 ms ; points à surveiller : mur de 49 cartes, flou des cartes de `boucle` et des bulles, 300 particules).
3. Planche `docs/reviews/scenes-f6.png` (moins de 2 Mo) : 16 paires référence | rendu, à partir de `docs/reviews/reference/stepwize-planche.png` (une image toutes les 2 s) ou de la vidéo.

## Mesures

Aucune (environnement bloqué). Recherche de tirets longs et moyens et de séquences d'échappement unicode sur les fichiers livrés : rien.

## Lancer

`cd apps/web && npx vite --host 127.0.0.1 --port 5199`, puis `http://127.0.0.1:5199/dev/scenes-tension.html`.

## Message de commit proposé

```
feat(web): add pub tension and reveal scenes calibrated on reference

Opening dial, repetition with impact word and card wall, floating
card loop with markers, chorus bubbles, typed rupture ending on the
cursor, and the reveal where particles build the pixel monogram or
imported logo next to the project name. Sizes and timing follow the
Stepwize reference frames. Adds Geist 800 and a per-call word gap.
```
Fichiers : `apps/web/src/lib/pub/scenes/tension/`, `apps/web/src/lib/pub/visuel/cinetique.ts`, `apps/web/dev/scenes-tension.*`, `apps/web/src/styles/fonts.css`, `apps/web/public/fonts/geist-sans-latin-800-normal.woff2`, `docs/handoff/frontend-scenes-tension.md`.
