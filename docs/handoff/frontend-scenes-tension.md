# Handoff frontend : scènes de tension et de révélation (F6)

**État : livré et vérifié** dans `/Users/soufianefilali/DEV/weekli` (branche `feat/weekli-v1`), après le déménagement hors iCloud. Rien n'est commité.

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
| `repetition` | Ligne 1 en 205 px à gauche (x 210, largeur 860), carte x 1,5 inclinée de 4° à droite ; lignes suivantes 112 px en haut au centre, la carte glisse au centre avec des ondes ; impact 300 px ; mur 7 x 7 (pas 155 x 102) | lignes sur t 0 à 0,5 ; impact à 0,6 ; mur à 0,7 du centre vers les bords |
| `boucle` | Phrase 104 px centrée en haut (centre 169) ; 6 cartes aux positions relevées, flou et pâleur selon la profondeur, repère au-dessus de chaque carte ; pastille à y 990 | mots tous les 0,3 s maxi (voix) ; repères sur t 0,1 à 0,86 ; à chaque repère une carte avance, se floute, sort puis revient au fond |
| `chorus` | Titre 161 px (Grand x 1,55, interligne 1,02) centre 565 ; 6 bulles aux places relevées, Geist 600 32 px, queue côté bord | bulles en ressort à partir de t 0,2 ; chute à t 0,45 ; bulles qui tombent (gravité, rotation, flou) |
| `rupture` | Frappe centrée 112 px, centre 540 | 0,65 s de silence (t 0,15), retour à la ligne avant la partie accentuée ; texte fini tenu 0,45 s, effacé, puis le curseur seul glisse au centre et grandit à 120 px (annonce les pixels) |
| `revelation` | Point central, 300 particules ; logo formé à 468 px au centre puis rangé à 176 px à gauche du nom (160 px), lockup centré à y 394 ; slogan 56 px centre 592, surlignage bloc blanc texte `sombre` ; signature 96 px (Geist 800) à +118 px sous le slogan, soulignée `accentSombre` | particules t 0,02 à 0,16 ; onde et éclat ; rangement 0,16 à 0,24 ; nom dévoilé depuis le logo à 0,17 ; slogan 0,3 (0,2 s par mot) ; signature 0,68 avec traînée ; rayons 0,12 à 0,37 ; caméra 1 vers 1,04 |

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

## Planche `docs/reviews/scenes-f6.png`

1920 x 1620, 1,0 Mo, 256 couleurs. Paires « référence | rendu Weekli » lues de gauche à droite et de haut en bas, aux instants 1, 3, 5, 7, 9, 11, 13, 15, 17, 19 et 21 s. Les images de référence viennent de `docs/reviews/reference/stepwize-planche.png` (une image toutes les 2 s à partir de 1 s, cases de 384 x 216 agrandies à 480 x 270 : elles sont donc plus floues que le rendu). Rendu à 960 x 540 par `window.imageTension`, aucune nouvelle extraction vidéo.

Corrections apportées après la première comparaison : seconde ligne de `repetition` avancée (t 0,5), mur plus tôt (t 0,7), fond de nouveau sombre sous le mur ; phrase de `boucle` à 0,3 s par mot et cartes plus grandes ; chute du `chorus` à t 0,45 sans fondu croisé ; `rupture` qui passe à la ligne avant la partie accentuée comme la référence (repli sur un seul bloc si l'une des deux lignes ne tient pas à pleine taille) ; révélation plus tôt (formation t 0,16, nom 0,17, slogan 0,3 à 0,2 s par mot), éclats en couronne autour du logo et cellules dessinées par-dessus.

## Textes coupés à 80 %

Bouton « Chercher les textes coupés » (espion de `fillText`, une image sur trois) sur quatre variantes : textes courts et longs, avec et sans logo importé. Les textes longs sont aux longueurs maximales du contrat. Premier passage : 5 coupes sur les textes longs (ligne de 30 caractères dans la colonne de gauche, `INSUPPORTABLE.` à 300 px, phrase de 70 caractères, titre de chorus de 50 caractères, nom de 24 caractères). Ajout de `blocQuiTient` (`commun.ts`) : la première mise en page qui tient sans troncature, chacune descendant déjà jusqu'à 80 %, avec des replis plus petits : la ligne passe en haut, l'impact à 0,85, la phrase en Titre sur 3 lignes, le chorus sur 3 lignes puis à 104 px, le nom à 0,75, puis à 0,56, puis sur 2 lignes. Résultat : **aucun texte coupé** dans les quatre variantes.

## Mesures (Chrome du panneau intégré, macOS, onglet en arrière-plan)

Dessin seul à 1920 x 1080, `getImageData` après chaque image, seconde passe (la première rastérise glyphes et tuiles), 660 images, en ms (moyenne / p95 / max) :

| Scène | Textes courts | Textes longs + logo importé |
|---|---|---|
| ouverture | 3,4 / 4,3 / 5,1 | 3,5 / 4,3 / 7,2 |
| repetition | 3,9 / 5,0 / 10,1 | 4,1 / 5,1 / 34,3 |
| boucle | 16,7 / 23,4 / 37,0 | 15,9 / 21,9 / 24,7 |
| chorus | 10,9 / 25,9 / 30,8 | 11,3 / 26,7 / 39,2 |
| rupture | 2,1 / 6,6 / 24,4 | 2,1 / 7,2 / 21,7 |
| revelation | 5,2 / 6,5 / 11,6 | 5,7 / 7,6 / 9,9 |
| Ensemble | 7,0 / 20,8 / 37,0 | 7,1 / 20,5 / 39,2 |

Budget de 60 ms par image tenu partout. Les plus chères sont `boucle` et `chorus` à cause du `ctx.filter: blur` sur les cartes et les bulles. Les pics de `rupture` et `repetition` correspondent aux transitions (deux couches plus `glitch` ou `pixels`).

## Vérifications

`tsc -p tsconfig.app.json` : vert (banc compris, via une configuration temporaire). `oxlint` sur `scenes/tension`, `visuel` et le banc : 0 alerte. `npx vitest run` (apps/web) : 6 fichiers, 75 tests verts. Aucun tiret long ni moyen, aucune séquence d'échappement unicode. Serveur Vite (127.0.0.1) arrêté, fichiers temporaires du scratchpad supprimés.

## Limites

- Le fond sombre de la palette (`#08004f` pour `#3d4bff`) est plus violet et plus clair que celui de la référence : cela relève de la palette du core et du fond F5, pas de F6.
- Entre 2,9 et 3,1 s, la carte de `repetition` est encore en glissement vers le centre, alors que dans la référence elle y est déjà.
- Testé dans Chrome seulement. Sans `ctx.filter` (Safari), les cartes et les bulles ne sont pas floues : c'est prévu.

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
